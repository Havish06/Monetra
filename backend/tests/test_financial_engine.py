import unittest

from app.intelligence.financial_engine import analyze_finances
from app.intelligence.decision_engine import (
    evaluate_purchase,
    evaluate_decision,
)


class TestFinancialEngine(unittest.TestCase):

    def setUp(self):
        self.context = {
            "date_range": {
                "start_date": "2026-10-01",
                "end_date": "2026-10-30",
            },
            "accounts": {
                "total_balances_by_currency": {
                    "INR": "50000.00",
                },
            },
            "transactions": {
                "income_total": "40000.00",
                "expense_total": "15000.00",
                "income_count": 2,
                "expense_count": 10,
                "returned_count": 12,
                "total_count": 12,
                "truncated": False,
                "spending_by_category": [
                    {
                        "category": "Food",
                        "amount": "8000.00",
                        "transaction_count": 5,
                    }
                ],
            },
            "budgets": {"items": []},
            "commitments": {
                "upcoming": [
                    {"title": "Rent", "amount": "10000.00"}
                ]
            },
            "savings_goals": {"items": []},
        }

    def test_financial_summary(self):
        result = analyze_finances(self.context)

        self.assertEqual(
            result["transaction_summary"]["net_cash_flow"],
            "25000.00",
        )

    def test_available_after_commitments(self):
        result = analyze_finances(self.context)

        self.assertEqual(
            result["cash_position"][
                "available_after_upcoming_commitments"
            ],
            "40000.00",
        )

    def test_purchase_affordability(self):
        result = analyze_finances(self.context)

        decision = evaluate_purchase(5000, result)

        self.assertEqual(
            decision["decision"],
            "potentially_affordable",
        )

    def test_purchase_exceeds_available_cash(self):
        result = analyze_finances(self.context)

        decision = evaluate_purchase(45000, result)

        self.assertEqual(
            decision["decision"],
            "not_recommended",
        )

    def test_multiple_currencies_require_clarification(self):
        self.context["accounts"]["total_balances_by_currency"] = {
            "INR": "50000",
            "USD": "100",
        }

        result = analyze_finances(self.context)
        decision = evaluate_purchase(5000, result)

        self.assertEqual(
            decision["decision"],
            "needs_information",
        )


if __name__ == "__main__":
    unittest.main()