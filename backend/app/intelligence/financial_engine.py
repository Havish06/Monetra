from decimal import Decimal, InvalidOperation


ZERO = Decimal("0.00")


def money(value) -> Decimal:
    try:
        return Decimal(str(value or 0)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError, TypeError):
        return ZERO


def analyze_finances(context: dict) -> dict:
    accounts = context.get("accounts", {})
    transactions = context.get("transactions", {})
    budgets = context.get("budgets", {})
    commitments = context.get("commitments", {})
    goals = context.get("savings_goals", {})

    balances = {
        currency: money(amount)
        for currency, amount in
        accounts.get("total_balances_by_currency", {}).items()
    }

    income = money(transactions.get("income_total"))
    expenses = money(transactions.get("expense_total"))
    net = income - expenses

    start = context.get("date_range", {}).get("start_date")
    end = context.get("date_range", {}).get("end_date")

    days = 1
    if start and end:
        from datetime import date

        days = max(
            1,
            (date.fromisoformat(end) - date.fromisoformat(start)).days + 1,
        )

    daily_spending = expenses / Decimal(days)

    upcoming = commitments.get("upcoming", [])
    upcoming_total = sum(
        (money(item.get("amount")) for item in upcoming),
        ZERO,
    )

    categories = transactions.get("spending_by_category", [])
    ranked_categories = sorted(
        categories,
        key=lambda item: money(item.get("amount")),
        reverse=True,
    )

    budget_items = budgets.get("items", [])
    budget_overview = [
        {
            "name": item["name"],
            "category": item["category"],
            "limit": item["limit_amount"],
            "period": item["period"],
        }
        for item in budget_items
    ]

    # Contributions are unavailable in the current database schema.
    goal_overview = [
        {
            "name": item["name"],
            "target_amount": item["target_amount"],
            "target_date": item["target_date"],
            "saved_amount": None,
            "progress_percentage": None,
        }
        for item in goals.get("items", [])
    ]

    # Commitment currency is not stored. Only calculate a cash remainder
    # when there is exactly one account currency.
    available_after_commitments = None

    if len(balances) == 1:
        currency, balance = next(iter(balances.items()))
        available_after_commitments = max(
            ZERO,
            balance - upcoming_total,
        )

    return {
        "date_range": {
            "start_date": start,
            "end_date": end,
            "days": days,
        },
        "balances_by_currency": {
            key: str(value) for key, value in balances.items()
        },
        "transaction_summary": {
            "income": str(income),
            "expenses": str(expenses),
            "net_cash_flow": str(net),
            "income_count": transactions.get("income_count", 0),
            "expense_count": transactions.get("expense_count", 0),
            "average_daily_spending": str(daily_spending),
            "returned_transaction_count": transactions.get(
                "returned_count", 0
            ),
            "total_transaction_count": transactions.get(
                "total_count", 0
            ),
            "truncated": transactions.get("truncated", False),
        },
        "top_spending_categories": ranked_categories[:5],
        "budgets": budget_overview,
        "commitments": {
            "upcoming_count": len(upcoming),
            "upcoming_total": str(upcoming_total),
            "upcoming_items": upcoming,
        },
        "savings_goals": {
            "count": len(goal_overview),
            "items": goal_overview,
            "contribution_tracking_available": False,
        },
        "cash_position": {
            "available_after_upcoming_commitments": (
                str(available_after_commitments)
                if available_after_commitments is not None
                else None
            ),
            "currency": (
                next(iter(balances))
                if len(balances) == 1
                else None
            ),
            "calculation_note": (
                "This subtracts known upcoming commitments from the "
                "account balance. It is not a complete discretionary "
                "spending limit."
            ),
        },
    }