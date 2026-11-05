import uuid
from datetime import datetime, date, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import require_path_user

from app.db.database import get_db
from app.models.user import User
from app.models.financial_account import FinancialAccount
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.savings_goal import SavingsGoal
from app.models.savings_contribution import SavingsContribution
from app.models.commitment import Commitment
from app.schemas.dashboard import DashboardResponse

router = APIRouter(
    prefix="/api/v1/users/{user_id}/dashboard",
    tags=["Dashboard"],
    dependencies=[Depends(require_path_user)],
)


def money(value):
    return Decimal(str(value or 0))


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Use the user's configured timezone for dashboard date boundaries.
    try:
        user_timezone = ZoneInfo(user.timezone)
    except Exception:
        user_timezone = ZoneInfo("UTC")

    today = datetime.now(user_timezone).date()
    tomorrow = today + timedelta(days=1)
    next_30_days = today + timedelta(days=30)

    month_start = date(today.year, today.month, 1)

    if today.month == 12:
        next_month_start = date(today.year + 1, 1, 1)
    else:
        next_month_start = date(today.year, today.month + 1, 1)

    month_start_dt = datetime.combine(
        month_start, time.min, tzinfo=user_timezone
    )
    next_month_dt = datetime.combine(
        next_month_start, time.min, tzinfo=user_timezone
    )
    tomorrow_dt = datetime.combine(
        tomorrow, time.min, tzinfo=user_timezone
    )

    # 1. Financial accounts
    accounts = (
        db.query(FinancialAccount)
        .filter(FinancialAccount.user_id == user_id)
        .order_by(FinancialAccount.created_at.desc())
        .all()
    )

    total_account_balance = sum(
        (money(account.balance) for account in accounts),
        Decimal("0"),
    )

    # 2. Current month's income and expenses
    monthly_income = money(
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "income",
            Transaction.transaction_date >= month_start_dt,
            Transaction.transaction_date < next_month_dt,
        )
        .scalar()
    )

    monthly_expenses = money(
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "expense",
            Transaction.transaction_date >= month_start_dt,
            Transaction.transaction_date < next_month_dt,
        )
        .scalar()
    )

    # 3. Recent transactions
    recent_transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.transaction_date.desc())
        .limit(5)
        .all()
    )

    # 4. Active budgets and their current spending
    active_budgets = (
        db.query(Budget)
        .filter(
            Budget.user_id == user_id,
            Budget.start_date <= today,
            (Budget.end_date.is_(None) | (Budget.end_date >= today)),
        )
        .all()
    )

    budget_overviews = []

    for budget in active_budgets:
        spent = money(
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == user_id,
                Transaction.transaction_type == "expense",
                Transaction.category == budget.category,
                Transaction.transaction_date >= datetime.combine(
                    budget.start_date, time.min, tzinfo=user_timezone
                ),
                Transaction.transaction_date < tomorrow_dt,
            )
            .scalar()
        )

        limit_amount = money(budget.limit_amount)
        remaining = max(limit_amount - spent, Decimal("0"))

        percentage = (
            (spent / limit_amount) * 100
            if limit_amount > 0
            else Decimal("0")
        )

        budget_overviews.append({
            "id": budget.id,
            "name": budget.name,
            "category": budget.category,
            "limit_amount": limit_amount,
            "spent": spent,
            "remaining": remaining,
            "utilization_percentage": percentage.quantize(
                Decimal("0.01")
            ),
        })

    # 5. Savings goals and contributions
    active_goals = (
        db.query(SavingsGoal)
        .filter(
            SavingsGoal.user_id == user_id,
            SavingsGoal.status == "active",
        )
        .all()
    )

    savings_goal_overviews = []
    total_savings_target = Decimal("0")
    total_saved = Decimal("0")

    for goal in active_goals:
        saved = money(
            db.query(func.coalesce(func.sum(SavingsContribution.amount), 0))
            .filter(
                SavingsContribution.goal_id == goal.id,
                SavingsContribution.user_id == user_id,
            )
            .scalar()
        )

        target = money(goal.target_amount)
        remaining = max(target - saved, Decimal("0"))

        percentage = (
            min((saved / target) * 100, Decimal("100"))
            if target > 0
            else Decimal("0")
        )

        total_savings_target += target
        total_saved += saved

        savings_goal_overviews.append({
            "id": goal.id,
            "name": goal.name,
            "target_amount": target,
            "total_saved": saved,
            "remaining": remaining,
            "progress_percentage": percentage.quantize(
                Decimal("0.01")
            ),
            "target_date": goal.target_date,
            "status": goal.status,
        })

    # 6. Upcoming commitments in the next 30 days
    upcoming_commitments = (
        db.query(Commitment)
        .filter(
            Commitment.user_id == user_id,
            Commitment.status == "active",
            Commitment.next_due_date.isnot(None),
            Commitment.next_due_date >= today,
            Commitment.next_due_date <= next_30_days,
        )
        .order_by(Commitment.next_due_date.asc())
        .all()
    )

    return {
        "total_account_balance": total_account_balance,
        "monthly_income": monthly_income,
        "monthly_expenses": monthly_expenses,
        "monthly_net": monthly_income - monthly_expenses,
        "total_savings_target": total_savings_target,
        "total_saved": total_saved,
        "upcoming_commitments_count": len(upcoming_commitments),
        "accounts": accounts,
        "recent_transactions": recent_transactions,
        "budgets": budget_overviews,
        "savings_goals": savings_goal_overviews,
        "upcoming_commitments": upcoming_commitments,
    }