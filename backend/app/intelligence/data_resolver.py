
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.models.financial_account import FinancialAccount
from app.models.budget import Budget
from app.models.commitment import Commitment
from app.models.savings_goal import SavingsGoal


def _money(value) -> str:
    """Preserve financial precision when converting amounts."""
    return str(Decimal(value or 0).quantize(Decimal("0.01")))


def _date(value):
    return value.isoformat() if value else None


def _datetime(value):
    return value.isoformat() if value else None


def resolve_financial_context(
    db: Session,
    user_id: UUID,
    start_date: date | None = None,
    end_date: date | None = None,
    transaction_limit: int = 200,
    upcoming_days: int = 30,
) -> dict:
    """
    Retrieve read-only financial context for one authenticated user.

    Defaults:
    - Transaction analysis: previous 90 days through today.
    - Upcoming commitments: next 30 days.
    - Transaction details: latest 200 records in the selected period.

    Aggregate totals cover the complete selected transaction period,
    even when the returned transaction list is limited.
    """

    today = date.today()
    start_date = start_date or (today - timedelta(days=90))
    end_date = end_date or today

    if start_date > end_date:
        raise ValueError("start_date cannot be after end_date")

    if transaction_limit < 1:
        raise ValueError("transaction_limit must be positive")

    if upcoming_days < 0:
        raise ValueError("upcoming_days cannot be negative")

    # Every query is restricted to the authenticated user.

    # 1. Financial accounts
    accounts = (
        db.query(FinancialAccount)
        .filter(FinancialAccount.user_id == user_id)
        .order_by(FinancialAccount.name.asc())
        .all()
    )

    account_data = [
        {
            "id": str(account.id),
            "name": account.name,
            "account_type": account.account_type,
            "institution": account.institution,
            "balance": _money(account.balance),
            "currency": account.currency,
        }
        for account in accounts
    ]

    total_balances = {}

    for account in accounts:
        currency = account.currency
        total_balances[currency] = (
            Decimal(total_balances.get(currency, "0"))
            + Decimal(account.balance)
        )

    total_balances = {
        currency: _money(amount)
        for currency, amount in total_balances.items()
    }

    # 2. Transaction aggregates for the complete date range
    transaction_base = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        func.date(Transaction.transaction_date) >= start_date,
        func.date(Transaction.transaction_date) <= end_date,
    )

    totals = (
        transaction_base.with_entities(
            Transaction.transaction_type,
            func.sum(Transaction.amount),
            func.count(Transaction.id),
        )
        .group_by(Transaction.transaction_type)
        .all()
    )

    income_total = Decimal("0")
    expense_total = Decimal("0")
    income_count = 0
    expense_count = 0

    for transaction_type, amount, count in totals:
        if transaction_type == "income":
            income_total = Decimal(amount or 0)
            income_count = count
        elif transaction_type == "expense":
            expense_total = Decimal(amount or 0)
            expense_count = count

    # 3. Category-wise expense totals
    category_totals = (
        transaction_base.filter(
            Transaction.transaction_type == "expense",
            Transaction.category.isnot(None),
        )
        .with_entities(
            Transaction.category,
            func.sum(Transaction.amount),
            func.count(Transaction.id),
        )
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )

    spending_by_category = [
        {
            "category": category,
            "amount": _money(amount),
            "transaction_count": count,
        }
        for category, amount, count in category_totals
    ]

    # 4. Recent transaction details
    transactions = (
        transaction_base
        .order_by(Transaction.transaction_date.desc())
        .limit(transaction_limit)
        .all()
    )

    transaction_data = [
        {
            "id": str(transaction.id),
            "account_id": (
                str(transaction.account_id)
                if transaction.account_id else None
            ),
            "title": transaction.title,
            "amount": _money(transaction.amount),
            "transaction_type": transaction.transaction_type,
            "category": transaction.category,
            "description": transaction.description,
            "transaction_date": _datetime(
                transaction.transaction_date
            ),
        }
        for transaction in transactions
    ]

    total_transaction_count = income_count + expense_count

    # 5. Currently active budgets
    budgets = (
        db.query(Budget)
        .filter(
            Budget.user_id == user_id,
            Budget.start_date <= today,
            (Budget.end_date.is_(None)) | (Budget.end_date >= today),
        )
        .order_by(Budget.category.asc())
        .all()
    )

    budget_data = [
        {
            "id": str(budget.id),
            "name": budget.name,
            "category": budget.category,
            "limit_amount": _money(budget.limit_amount),
            "period": budget.period,
            "start_date": _date(budget.start_date),
            "end_date": _date(budget.end_date),
        }
        for budget in budgets
    ]

    # 6. Active commitments
    commitments = (
        db.query(Commitment)
        .filter(
            Commitment.user_id == user_id,
            Commitment.status == "active",
        )
        .order_by(Commitment.next_due_date.asc())
        .all()
    )

    commitment_data = [
        {
            "id": str(item.id),
            "title": item.title,
            "commitment_type": item.commitment_type,
            "amount": (
                _money(item.amount)
                if item.amount is not None else None
            ),
            "frequency": item.frequency,
            "next_due_date": _date(item.next_due_date),
            "end_date": _date(item.end_date),
            "auto_renewal": item.auto_renewal,
            "status": item.status,
        }
        for item in commitments
    ]

    upcoming_end = today + timedelta(days=upcoming_days)

    upcoming_commitments = [
        item
        for item in commitment_data
        if item["next_due_date"] is not None
        and today <= date.fromisoformat(item["next_due_date"]) <= upcoming_end
    ]

    # 7. Active savings goals
    savings_goals = (
        db.query(SavingsGoal)
        .filter(
            SavingsGoal.user_id == user_id,
            SavingsGoal.status == "active",
        )
        .order_by(SavingsGoal.target_date.asc())
        .all()
    )

    savings_goal_data = [
        {
            "id": str(goal.id),
            "name": goal.name,
            "target_amount": _money(goal.target_amount),
            "target_date": _date(goal.target_date),
            "status": goal.status,
            # Contributions are not stored in the current schema.
            "contributions_available": False,
        }
        for goal in savings_goals
    ]

    return {
        "user_id": str(user_id),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "date_range": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
        },
        "accounts": {
            "items": account_data,
            "count": len(account_data),
            "total_balances_by_currency": total_balances,
        },
        "transactions": {
            "items": transaction_data,
            "returned_count": len(transaction_data),
            "total_count": total_transaction_count,
            "truncated": total_transaction_count > len(transaction_data),
            "income_total": _money(income_total),
            "expense_total": _money(expense_total),
            "net_cash_flow": _money(income_total - expense_total),
            "income_count": income_count,
            "expense_count": expense_count,
            "spending_by_category": spending_by_category,
        },
        "budgets": {
            "items": budget_data,
            "count": len(budget_data),
        },
        "commitments": {
            "items": commitment_data,
            "count": len(commitment_data),
            "upcoming": upcoming_commitments,
            "upcoming_days": upcoming_days,
        },
        "savings_goals": {
            "items": savings_goal_data,
            "count": len(savings_goal_data),
            "contribution_tracking_available": False,
        },
    }
