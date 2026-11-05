"""Deterministic financial calculations for Monetra Intelligence.

This module deliberately contains no database, network, or LLM dependencies.
All monetary inputs are converted to Decimal before arithmetic.
"""
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Iterable

CENT = Decimal("0.01")


def money(value: Decimal | int | float | str) -> Decimal:
    """Convert a numeric value to Decimal without binary-float arithmetic."""
    try:
        result = value if isinstance(value, Decimal) else Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise ValueError("Amount must be a valid number")
    if not result.is_finite():
        raise ValueError("Amount must be finite")
    return result.quantize(CENT, rounding=ROUND_HALF_UP)


def sum_money(values: Iterable[Decimal | int | float | str]) -> Decimal:
    return sum((money(value) for value in values), Decimal("0.00")).quantize(CENT)


def budget_status(limit: Decimal | int | float | str,
                  spent: Decimal | int | float | str) -> dict:
    limit_value, spent_value = money(limit), money(spent)
    if limit_value <= 0:
        raise ValueError("Budget limit must be greater than zero")
    remaining = (limit_value - spent_value).quantize(CENT)
    percentage = (spent_value / limit_value * Decimal("100")).quantize(
        Decimal("0.1"), rounding=ROUND_HALF_UP
    )
    return {
        "limit": limit_value,
        "spent": spent_value,
        "remaining": remaining,
        "percentage_used": percentage,
        "over_budget": spent_value > limit_value,
    }


def goal_progress(target: Decimal | int | float | str,
                  saved: Decimal | int | float | str) -> dict:
    target_value, saved_value = money(target), money(saved)
    if target_value <= 0:
        raise ValueError("Goal target must be greater than zero")
    remaining = max(Decimal("0.00"), target_value - saved_value)
    percentage = min(
        Decimal("100.0"),
        max(Decimal("0.0"), (saved_value / target_value * 100).quantize(
            Decimal("0.1"), rounding=ROUND_HALF_UP
        )),
    )
    return {
        "target": target_value,
        "saved": saved_value,
        "remaining": remaining.quantize(CENT),
        "percentage": percentage,
        "achieved": saved_value >= target_value,
    }


def safe_to_spend(
    available_balance: Decimal | int | float | str,
    upcoming_commitments: Decimal | int | float | str = 0,
    savings_reserved: Decimal | int | float | str = 0,
    emergency_reserve: Decimal | int | float | str = 0,
) -> dict:
    """Calculate spendable funds; negative results are preserved and flagged."""
    available = money(available_balance)
    commitments = money(upcoming_commitments)
    savings = money(savings_reserved)
    reserve = money(emergency_reserve)
    if min(commitments, savings, reserve) < 0:
        raise ValueError("Reserved amounts cannot be negative")
    safe = (available - commitments - savings - reserve).quantize(CENT)
    return {
        "available_balance": available,
        "commitments_reserved": commitments,
        "savings_reserved": savings,
        "emergency_reserve": reserve,
        "safe_to_spend": safe,
        "shortfall": max(Decimal("0.00"), -safe).quantize(CENT),
        "sufficient": safe >= 0,
    }


def monthly_recurring_exposure(items: Iterable[dict]) -> Decimal:
    """Normalise active recurring commitments to monthly exposure.

    Supported frequencies: weekly, monthly, quarterly, yearly, annual.
    Unknown frequencies are rejected instead of silently guessed.
    """
    multipliers = {
        "weekly": Decimal("52") / Decimal("12"),
        "monthly": Decimal("1"),
        "quarterly": Decimal("1") / Decimal("3"),
        "yearly": Decimal("1") / Decimal("12"),
        "annual": Decimal("1") / Decimal("12"),
    }
    total = Decimal("0.00")
    for item in items:
        if item.get("status", "active") not in {"active"}:
            continue
        amount = money(item.get("amount", 0))
        if amount < 0:
            raise ValueError("Commitment amount cannot be negative")
        frequency = str(item.get("frequency", "monthly")).lower()
        if frequency not in multipliers:
            raise ValueError(f"Unsupported frequency: {frequency}")
        total += amount * multipliers[frequency]
    return total.quantize(CENT, rounding=ROUND_HALF_UP)


def classify_transaction_status(status: str) -> str:
    """Return the ledger bucket for a transaction status."""
    normalized = status.strip().lower()
    buckets = {
        "posted": "include",
        "completed": "include",
        "settled": "include",
        "pending": "pending",
        "processing": "pending",
        "reversed": "exclude",
        "cancelled": "exclude",
        "canceled": "exclude",
        "failed": "exclude",
        "declined": "exclude",
    }
    if normalized not in buckets:
        return "unknown"
    return buckets[normalized]
