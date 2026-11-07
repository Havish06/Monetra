from decimal import Decimal


def _fmt(value):
    try:
        return f"{Decimal(str(value)):,.2f}"
    except Exception:
        return str(value)


def generate_response(
    pipeline_result: dict,
    analysis: dict,
    decision: dict,
) -> str:
    intent = pipeline_result.get("intent")
    transactions = analysis.get("transaction_summary", {})
    balances = analysis.get("balances_by_currency", {})
    commitments = analysis.get("commitments", {})
    categories = analysis.get("top_spending_categories", [])

    if pipeline_result.get("requires_clarification"):
        return (
            "I need a little more information to answer that accurately. "
            "Could you clarify what you want me to check?"
        )

    if intent == "list_accounts":
        if not balances:
            return "You don't have any linked financial accounts yet."

        lines = ["Here are your account balances:"]

        for currency, amount in balances.items():
            lines.append(f"• {currency} { _fmt(amount) }")

        return "\n".join(lines)

    if intent == "total_account_balance":
        if not balances:
            return "I couldn't find any linked account balances."

        if len(balances) > 1:
            return (
                "Your balances are held in multiple currencies:\n"
                + "\n".join(
                    f"• {currency} {_fmt(amount)}"
                    for currency, amount in balances.items()
                )
                + "\nI haven't combined currencies into one total."
            )

        currency, amount = next(iter(balances.items()))
        return f"Your total account balance is {currency} {_fmt(amount)}."

    if intent == "spending_summary":
        lines = [
            "Here's your spending summary for "
            f"{analysis['date_range']['start_date']} to "
            f"{analysis['date_range']['end_date']}:",
            f"• Income: {_fmt(transactions.get('income', 0))}",
            f"• Expenses: {_fmt(transactions.get('expenses', 0))}",
            f"• Net cash flow: {_fmt(transactions.get('net_cash_flow', 0))}",
        ]

        if categories:
            lines.append("\nTop spending categories:")

            for item in categories[:5]:
                lines.append(
                    f"• {item['category']}: {_fmt(item['amount'])}"
                )

        if transactions.get("truncated"):
            lines.append(
                "\nNote: Transaction details are limited, but "
                "the aggregate totals cover the full selected period."
            )

        return "\n".join(lines)

    if intent == "upcoming_commitments":
        items = commitments.get("upcoming_items", [])

        if not items:
            return "You have no recorded commitments due in the selected window."

        lines = ["Your upcoming commitments:"]

        for item in items:
            amount = item.get("amount")
            due = item.get("next_due_date") or "Date unavailable"
            amount_text = _fmt(amount) if amount is not None else "Amount unknown"
            lines.append(f"• {item['title']} — {amount_text}, due {due}")

        return "\n".join(lines)

    if intent == "budget_status":
        budgets = analysis.get("budgets", [])

        if not budgets:
            return "You don't have any currently active budgets."

        lines = ["Your active budgets:"]

        for budget in budgets:
            lines.append(
                f"• {budget['name']} ({budget['category']}): "
                f"{budget['limit']} per {budget['period']}"
            )

        lines.append(
            "\nYour current resolver does not calculate budget-period "
            "spending, so I won't claim a remaining amount."
        )

        return "\n".join(lines)

    if intent == "evaluate_purchase":
        amount = decision.get("purchase_amount")

        if decision.get("decision") == "needs_information":
            return decision["reason"]

        currency = decision.get("currency") or ""
        remaining = decision.get("remaining_after_purchase")

        return (
            f"Purchase evaluation: {decision['decision'].replace('_', ' ').title()}.\n"
            f"Purchase amount: {currency} {_fmt(amount)}\n"
            f"{decision['reason']}\n"
            + (
                f"Estimated balance afterward: {currency} {_fmt(remaining)}"
                if remaining is not None
                else ""
            )
        )

    if intent == "safe_to_spend":
        if decision.get("decision") == "needs_information":
            return decision["reason"]

        return (
            f"Your account balance after known upcoming commitments is "
            f"{decision['currency']} "
            f"{_fmt(decision['available_after_commitments'])}.\n"
            f"{decision['reason']}"
        )

    if intent == "savings_goal_progress":
        return decision["reason"]

    if intent == "cash_shortfall_forecast":
        return decision["reason"]

    if intent == "capabilities_help":
        return (
            "I can help review account balances, spending, budgets, "
            "commitments, cash flow and purchase decisions using your "
            "linked Monetra data. Some features need more transaction "
            "history or savings contribution data."
        )

    if intent == "unknown_transaction_help":
        return (
            "I can help investigate an unfamiliar transaction. "
            "Tell me its merchant, amount, or transaction date."
        )

    if intent == "investment_education":
        return (
            "I can explain investment concepts and compare general "
            "options, but I don't have live market data or enough "
            "information to provide a personalized investment recommendation."
        )

    if decision.get("reason"):
        return decision["reason"]

    return (
        "I've reviewed the financial information currently available. "
        "Could you be more specific about what you'd like to know?"
    )