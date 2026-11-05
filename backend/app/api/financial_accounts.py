
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User

from app.core.security import require_path_user

from app.models.financial_account import FinancialAccount
from app.schemas.financial_account import (
    FinancialAccountCreate,
    FinancialAccountUpdate,
    FinancialAccountResponse,
)

router = APIRouter(
    prefix="/api/v1/users/{user_id}/accounts",
    tags=["Financial Accounts"],
    dependencies=[Depends(require_path_user)],
)


@router.post(
    "",
    response_model=FinancialAccountResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_account(
    user_id: uuid.UUID,
    account: FinancialAccountCreate,
    db: Session = Depends(get_db),
):
    if not db.get(User, user_id):
        raise HTTPException(status_code=404, detail="User not found")

    new_account = FinancialAccount(
        user_id=user_id,
        **account.model_dump(),
    )

    db.add(new_account)
    db.commit()
    db.refresh(new_account)

    return new_account


@router.get("", response_model=list[FinancialAccountResponse])
def list_accounts(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    if not db.get(User, user_id):
        raise HTTPException(status_code=404, detail="User not found")

    return (
        db.query(FinancialAccount)
        .filter(FinancialAccount.user_id == user_id)
        .order_by(FinancialAccount.created_at.desc())
        .all()
    )


@router.get("/{account_id}", response_model=FinancialAccountResponse)
def get_account(
    user_id: uuid.UUID,
    account_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    account = db.query(FinancialAccount).filter(
        FinancialAccount.id == account_id,
        FinancialAccount.user_id == user_id,
    ).first()

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    return account


@router.patch("/{account_id}", response_model=FinancialAccountResponse)
def update_account(
    user_id: uuid.UUID,
    account_id: uuid.UUID,
    updates: FinancialAccountUpdate,
    db: Session = Depends(get_db),
):
    account = db.query(FinancialAccount).filter(
        FinancialAccount.id == account_id,
        FinancialAccount.user_id == user_id,
    ).first()

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    update_data = updates.model_dump(exclude_unset=True)

    required_fields = {"name", "account_type", "balance", "currency"}

    if any(
        field in update_data and update_data[field] is None
        for field in required_fields
    ):
        raise HTTPException(
            status_code=422,
            detail="Required account fields cannot be null",
        )

    for field, value in update_data.items():
        setattr(account, field, value)

    db.commit()
    db.refresh(account)

    return account


@router.delete(
    "/{account_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_account(
    user_id: uuid.UUID,
    account_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    account = db.query(FinancialAccount).filter(
        FinancialAccount.id == account_id,
        FinancialAccount.user_id == user_id,
    ).first()

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    db.delete(account)
    db.commit()
