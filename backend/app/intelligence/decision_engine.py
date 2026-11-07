from decimal import Decimal, InvalidOperation


def _decimal(value):
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None


def _extract_purchase_amount(entities: dict):
    candidates = []

    for key in ("amounts", "amount", "purchase_price"):
        value = entities.get(key)

        if value is None:
            continue

        if isinstance(value, list):
            candidates.extend(value)
        else:
            candidates.append(value)

    for candidate in candidates:
        if isinstance(candidate, dict):
            candidate = (
                candidate.get("value")
                or candidate.get("amount")
                or candidate.get("normalized")
            )

        amount = _decimal(candidate)

        if amount is not None and amount > 0:
            return amount

    return None


def evaluate_purchase(amount, analysis: dict) -> dict:
    if amount is None or amount <= 0:
        return {
            "decision": "needs_information",
            "reason": "I need the purchase amount to evaluate this.",
            "purchase_amount": None,
        }

    cash = analysis.get("cash_position", {})
    available = _decimal(
        cash.get("available_after_upcoming_commitments")
    )

    if available is None:
        return {
            "decision": "needs_information",
            "reason": (
                "I cannot reliably compare this purchase with your "
                "available balance because your accounts use multiple "
                "currencies or the required data is unavailable."
            ),
            "purchase_amount": str(amount),
        }

    remaining = available - amount

    if remaining < 0:
        decision = "not_recommended"
        reason = (
            "This purchase exceeds the account balance remaining "
            "after known upcoming commitments."
        )
    elif remaining < available * Decimal("0.20"):
        decision = "caution"
        reason = (
            "You could cover this purchase, but it would leave less "
            "than 20% of your post-commitment cash position."
        )
    else:
        decision = "potentially_affordable"
        reason = (
            "Your current post-commitment cash position can cover "
            "this purchase. Check your other upcoming needs before "
            "committing."
        )

    return {
        "decision": decision,
        "reason": reason,
        "purchase_amount": str(amount),
        "available_before_purchase": str(available),
        "remaining_after_purchase": str(remaining),
        "currency": cash.get("currency"),
        "requires_user_confirmation": True,
    }


def evaluate_decision(
    pipeline_result: dict,
    context: dict,
    analysis: dict,
) -> dict:
    intent = pipeline_result.get("intent")
    entities = pipeline_result.get("entities") or {}

    if intent == "evaluate_purchase":
        amount = _extract_purchase_amount(entities)
        return evaluate_purchase(amount, analysis)

    if intent == "safe_to_spend":
        cash = analysis.get("cash_position", {})

        if cash.get("available_after_upcoming_commitments") is None:
            return {
                "decision": "needs_information",
                "reason": (
                    "I cannot calculate this reliably with the "
                    "available currency information."
                ),
            }

        return {
            "decision": "estimate",
            "available_after_commitments": cash[
                "available_after_upcoming_commitments"
            ],
            "currency": cash.get("currency"),
            "reason": (
                "This is your account balance after known upcoming "
                "commitments, not a guaranteed safe-to-spend amount."
            ),
        }

    if intent == "cash_shortfall_forecast":
        return {
            "decision": "limited_forecast",
            "reason": (
                "I can report your current cash position and known "
                "upcoming commitments. A reliable future shortfall "
                "forecast requires recurring income and expense "
                "history."
            ),
            "cash_position": analysis.get("cash_position"),
        }

    if intent == "savings_goal_progress":
        return {
            "decision": "progress_unavailable",
            "reason": (
                "Your savings goals are available, but the current "
                "database resolver does not include contribution "
                "records. Actual saved amounts cannot be calculated."
            ),
            "goals": analysis.get("savings_goals"),
        }

    return {
        "decision": "analysis",
        "reason": "Financial context retrieved successfully.",
    }