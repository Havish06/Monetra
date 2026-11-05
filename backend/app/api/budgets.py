import uuid
from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db

from app.core.security import require_path_user

from app.models.user import User
from app.models.budget import Budget
from app.models.transaction import Transaction

from app.schemas.budget import (
    BudgetCreate,
    BudgetUpdate,
    BudgetResponse,
    BudgetSummary,
)


router = APIRouter(
    prefix="/api/v1/users/{user_id}/budgets",
    tags=["Budgets"],
    dependencies=[Depends(require_path_user)],
)


def verify_user(user_id: uuid.UUID, db: Session):
    if not db.get(User, user_id):
        raise HTTPException(status_code=404, detail="User not found")


def calculate_spent(
    user_id: uuid.UUID,
    budget: Budget,
    db: Session,
) -> Decimal:
    query = db.query(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).filter(
        Transaction.user_id == user_id,
        Transaction.transaction_type == "expense",
        Transaction.category == budget.category,
        Transaction.transaction_date >= budget.start_date,
    )

    if budget.end_date:
        query = query.filter(
            Transaction.transaction_date < (
                budget.end_date + timedelta(days=1)
            )
        )

    return Decimal(str(query.scalar()))


def make_summary(
    user_id: uuid.UUID,
    budget: Budget,
    db: Session,
) -> BudgetSummary:
    spent = calculate_spent(user_id, budget, db)
    remaining = budget.limit_amount - spent

    utilization = (
        spent / budget.limit_amount * Decimal("100")
    ).quantize(Decimal("0.01"))

    return BudgetSummary(
        budget=budget,
        spent=spent,
        remaining=remaining,
        utilization_percentage=utilization,
        is_exceeded=spent > budget.limit_amount,
    )


@router.post(
    "",
    response_model=BudgetResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_budget(
    user_id: uuid.UUID,
    budget: BudgetCreate,
    db: Session = Depends(get_db),
):
    verify_user(user_id, db)

    if budget.end_date and budget.end_date < budget.start_date:
        raise HTTPException(
            status_code=422,
            detail="End date cannot be before start date",
        )

    if budget.period == "custom" and not budget.end_date:
        raise HTTPException(
            status_code=422,
            detail="Custom budgets require an end date",
        )

    new_budget = Budget(
        user_id=user_id,
        **budget.model_dump(),
    )

    db.add(new_budget)
    db.commit()
    db.refresh(new_budget)

    return new_budget


@router.get("", response_model=list[BudgetResponse])
def list_budgets(
    user_id: uuid.UUID,
    period: str | None = Query(
        default=None,
        pattern=r"^(weekly|monthly|yearly|custom)$",
    ),
    category: str | None = None,
    db: Session = Depends(get_db),
):
    verify_user(user_id, db)

    query = db.query(Budget).filter(
        Budget.user_id == user_id
    )

    if period:
        query = query.filter(Budget.period == period)

    if category:
        query = query.filter(Budget.category == category)

    return query.order_by(Budget.created_at.desc()).all()


@router.get("/summary", response_model=list[BudgetSummary])
def list_budget_summaries(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    verify_user(user_id, db)

    budgets = db.query(Budget).filter(
        Budget.user_id == user_id
    ).all()

    return [
        make_summary(user_id, budget, db)
        for budget in budgets
    ]


@router.get("/{budget_id}/summary", response_model=BudgetSummary)
def get_budget_summary(
    user_id: uuid.UUID,
    budget_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    verify_user(user_id, db)

    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == user_id,
    ).first()

    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    return make_summary(user_id, budget, db)


@router.get("/{budget_id}", response_model=BudgetResponse)
def get_budget(
    user_id: uuid.UUID,
    budget_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    verify_user(user_id, db)

    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == user_id,
    ).first()

    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    return budget


@router.patch("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    user_id: uuid.UUID,
    budget_id: uuid.UUID,
    updates: BudgetUpdate,
    db: Session = Depends(get_db),
):
    verify_user(user_id, db)

    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == user_id,
    ).first()

    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    update_data = updates.model_dump(exclude_unset=True)

    if (
        "end_date" in update_data
        and update_data["end_date"] is None
        and update_data.get("period", budget.period) == "custom"
    ):
        raise HTTPException(
            status_code=422,
            detail="Custom budgets require an end date",
        )

    new_start = update_data.get("start_date", budget.start_date)
    new_end = update_data.get("end_date", budget.end_date)
    new_period = update_data.get("period", budget.period)

    if new_end and new_end < new_start:
        raise HTTPException(
            status_code=422,
            detail="End date cannot be before start date",
        )

    if new_period == "custom" and not new_end:
        raise HTTPException(
            status_code=422,
            detail="Custom budgets require an end date",
        )

    for field, value in update_data.items():
        setattr(budget, field, value)

    db.commit()
    db.refresh(budget)

    return budget


@router.delete(
    "/{budget_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_budget(
    user_id: uuid.UUID,
    budget_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    verify_user(user_id, db)

    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == user_id,
    ).first()

    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    db.delete(budget)
    db.commit()