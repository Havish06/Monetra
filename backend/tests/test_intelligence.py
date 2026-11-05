import unittest
from decimal import Decimal

from app.intelligence.domain import (
    budget_status,
    classify_transaction_status,
    goal_progress,
    money,
    monthly_recurring_exposure,
    safe_to_spend,
    sum_money,
)
from app.intelligence.intents import classify_intent, normalize_question


class MoneyTests(unittest.TestCase):
    def test_decimal_sum_avoids_float_drift(self):
        self.assertEqual(sum_money(["0.10", "0.20"]), Decimal("0.30"))

    def test_rejects_nan_and_invalid_amount(self):
        for value in ("NaN", "Infinity", "not-money"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                money(value)

    def test_negative_balance_is_preserved(self):
        result = safe_to_spend("-500", "100")
        self.assertEqual(result["safe_to_spend"], Decimal("-600.00"))
        self.assertFalse(result["sufficient"])
        self.assertEqual(result["shortfall"], Decimal("600.00"))

    def test_safe_to_spend_reserves_commitments_and_savings(self):
        result = safe_to_spend("25000", "8000", "5000", "3000")
        self.assertEqual(result["safe_to_spend"], Decimal("9000.00"))

    def test_rejects_negative_reserve(self):
        with self.assertRaises(ValueError):
            safe_to_spend("1000", "-1")

    def test_budget_exactly_at_limit_is_not_over(self):
        result = budget_status("1000", "1000")
        self.assertEqual(result["remaining"], Decimal("0.00"))
        self.assertFalse(result["over_budget"])
        self.assertEqual(result["percentage_used"], Decimal("100.0"))

    def test_budget_over_limit(self):
        result = budget_status("1000", "1000.01")
        self.assertTrue(result["over_budget"])
        self.assertEqual(result["remaining"], Decimal("-0.01"))

    def test_budget_rejects_zero_limit(self):
        with self.assertRaises(ValueError):
            budget_status("0", "10")

    def test_goal_progress_caps_at_100_percent(self):
        result = goal_progress("10000", "12000")
        self.assertTrue(result["achieved"])
        self.assertEqual(result["percentage"], Decimal("100.0"))
        self.assertEqual(result["remaining"], Decimal("0.00"))

    def test_goal_rejects_nonpositive_target(self):
        with self.assertRaises(ValueError):
            goal_progress("0", "10")

    def test_recurring_exposure_normalises_frequencies(self):
        result = monthly_recurring_exposure([
            {"amount": "1200", "frequency": "monthly"},
            {"amount": "1200", "frequency": "quarterly"},
            {"amount": "1200", "frequency": "yearly"},
            {"amount": "1200", "frequency": "weekly"},
            {"amount": "900", "frequency": "monthly", "status": "cancelled"},
        ])
        self.assertEqual(result, Decimal("1633.33"))

    def test_unknown_frequency_is_not_guessed(self):
        with self.assertRaises(ValueError):
            monthly_recurring_exposure([{"amount": 100, "frequency": "fortnightly"}])

    def test_pending_transaction_is_not_posted(self):
        self.assertEqual(classify_transaction_status("pending"), "pending")

    def test_reversed_transaction_is_excluded(self):
        self.assertEqual(classify_transaction_status("reversed"), "exclude")

    def test_unknown_transaction_status_stays_unknown(self):
        self.assertEqual(classify_transaction_status("mystery"), "unknown")


class IntentTests(unittest.TestCase):
    def test_account_balance_paraphrases(self):
        for question in (
            "How much money do I have across all my accounts?",
            "Show my total balance",
            "What's my available balance?",
        ):
            with self.subTest(question=question):
                self.assertEqual(classify_intent(question)["intent"], "account_summary")

    def test_spending_question(self):
        result = classify_intent("How much did I spend this month?")
        self.assertEqual(result["intent"], "spending_total")

    def test_budget_question(self):
        self.assertEqual(classify_intent("Am I over my monthly budget?")["intent"], "budget_status")

    def test_safe_to_spend_question(self):
        self.assertEqual(classify_intent("How much can I safely spend?")["intent"], "safe_to_spend")

    def test_ambiguous_affordability_requires_clarification(self):
        self.assertEqual(classify_intent("Can I afford it?")["status"], "needs_clarification")

    def test_empty_question_requires_clarification(self):
        self.assertEqual(classify_intent("   ")["status"], "needs_clarification")

    def test_unrecognised_question_is_not_guessed(self):
        self.assertEqual(classify_intent("Tell me a joke")["status"], "unsupported")

    def test_currency_and_short_number_normalization(self):
        self.assertIn("inr", normalize_question("Can I spend ₹5k?"))


if __name__ == "__main__":
    unittest.main()
