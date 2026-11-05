
import uuid
from decimal import Decimal

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.models.financial_account import FinancialAccount
from app.models.transaction import Transaction
from app.core.security import require_path_user
from app.schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
)

router = APIRouter(
    prefix="/api/v1/users/{user_id}/transactions",
    tags=["Transactions"],
    dependencies=[Depends(require_path_user)],
)


def verify_user(user_id: uuid.UUID, db: Session):
    if not db.get(User, user_id):
        raise HTTPException(status_code=404, detail="User not found")


def get_account(
    user_id: uuid.UUID,
    account_id: uuid.UUID | None,
    db: Session,
):
    if account_id is None:
        return None

    account = (
        db.query(FinancialAccount)
        .filter(
            FinancialAccount.id == account_id,
            FinancialAccount.user_id == user_id,
        )
        .with_for_update()
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=404,
            detail="Financial account not found",
        )

    return account


def transaction_effect(
    amount: Decimal,
    transaction_type: str,
) -> Decimal:
    return amount if transaction_type == "income" else -amount


@router.post(
    "",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_transaction(
    user_id: uuid.UUID,
    transaction: TransactionCreate,
    db: Session = Depends(get_db),
):
    verify_user(user_id, db)

    try:
        account = get_account(user_id, transaction.account_id, db)

        new_transaction = Transaction(
            user_id=user_id,
            **transaction.model_dump(),
        )

        if account:
            account.balance += transaction_effect(
                transaction.amount,
                transaction.transaction_type,
            )

        db.add(new_transaction)
        db.commit()
        db.refresh(new_transaction)

        return new_transaction

    except Exception:
        db.rollback()
        raise


@router.get("", response_model=list[TransactionResponse])
def list_transactions(
    user_id: uuid.UUID,
    transaction_type: str | None = Query(
        default=None,
        pattern=r"^(income|expense)$",
    ),
    category: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    account_id: uuid.UUID | None = None,
    search: str | None = Query(default=None, max_length=150),
    db: Session = Depends(get_db),
):
    verify_user(user_id, db)

    query = db.query(Transaction).filter(
        Transaction.user_id == user_id
    )

    if transaction_type:
        query = query.filter(
            Transaction.transaction_type == transaction_type
        )

    if category:
        query = query.filter(Transaction.category == category)

    if start_date:
        query = query.filter(
            Transaction.transaction_date >= start_date
        )

    if end_date:
        query = query.filter(
            Transaction.transaction_date <= end_date
        )

    if account_id:
        query = query.filter(Transaction.account_id == account_id)

    if search:
        query = query.filter(Transaction.title.ilike(f"%{search}%"))

    return query.order_by(
        Transaction.transaction_date.desc()
    ).all()


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    user_id: uuid.UUID,
    transaction_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    verify_user(user_id, db)

    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == user_id,
    ).first()

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found",
        )

    return transaction


@router.patch(
    "/{transaction_id}",
    response_model=TransactionResponse,
)
def update_transaction(
    user_id: uuid.UUID,
    transaction_id: uuid.UUID,
    updates: TransactionUpdate,
    db: Session = Depends(get_db),
):
    verify_user(user_id, db)

    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == user_id,
    ).with_for_update().first()

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found",
        )

    update_data = updates.model_dump(exclude_unset=True)

    try:
        old_account = get_account(
            user_id, transaction.account_id, db
        )

        new_account_id = update_data.get(
            "account_id", transaction.account_id
        )

        new_account = get_account(
            user_id, new_account_id, db
        )

        # Reverse the previous transaction's effect.
        if old_account:
            old_account.balance -= transaction_effect(
                transaction.amount,
                transaction.transaction_type,
            )

        # Apply the updated transaction's effect.
        new_amount = update_data.get("amount", transaction.amount)
        new_type = update_data.get(
            "transaction_type",
            transaction.transaction_type,
        )

        if new_account:
            new_account.balance += transaction_effect(
                new_amount,
                new_type,
            )

        for field, value in update_data.items():
            setattr(transaction, field, value)

        db.commit()
        db.refresh(transaction)

        return transaction

    except Exception:
        db.rollback()
        raise


@router.delete(
    "/{transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_transaction(
    user_id: uuid.UUID,
    transaction_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    verify_user(user_id, db)

    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == user_id,
    ).with_for_update().first()

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found",
        )

    try:
        account = get_account(
            user_id,
            transaction.account_id,
            db,
        )

        # Reverse the transaction before deleting it.
        if account:
            account.balance -= transaction_effect(
                transaction.amount,
                transaction.transaction_type,
            )

        db.delete(transaction)
        db.commit()

    except Exception:
        db.rollback()
        raise
