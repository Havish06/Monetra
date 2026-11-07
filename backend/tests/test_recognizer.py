
import unittest

from app.intelligence.recognizer import (
    normalize_question,
    recognize_intent,
)


class TestMonetraRecognizer(unittest.TestCase):

    def test_total_balance(self):
        result = recognize_intent(
            "How much money do I have across all my accounts?"
        )
        self.assertEqual(result["intent"], "total_account_balance")

    def test_salary_date(self):
        result = recognize_intent("When will my salary arrive?")
        self.assertEqual(result["intent"], "salary_arrival_date")

    def test_spending_summary(self):
        result = recognize_intent("How much did I spend this month?")
        self.assertEqual(result["intent"], "spending_summary")

    def test_budget_status(self):
        result = recognize_intent("How much budget is left?")
        self.assertEqual(result["intent"], "budget_status")

    def test_purchase_decision(self):
        result = recognize_intent("Should I buy this right now?")
        self.assertEqual(result["intent"], "evaluate_purchase")

    def test_savings_progress(self):
        result = recognize_intent(
            "How close am I to my savings goal?"
        )
        self.assertEqual(result["intent"], "savings_goal_progress")

    def test_hinglish(self):
        result = recognize_intent(
            "Mere sabhi accounts mein kitne paise hain?"
        )
        self.assertEqual(result["intent"], "total_account_balance")

    def test_amount_shorthand(self):
        normalized = normalize_question("Spend 5k on shopping")
        self.assertIn("5 thousand", normalized)

    def test_followup_without_context(self):
        result = recognize_intent("What about last month?")
        self.assertEqual(
            result["status"],
            "missing_conversation_context",
        )

    def test_followup_with_context(self):
        result = recognize_intent(
            "What about last month?",
            previous_intent="spending_summary",
        )
        self.assertEqual(result["intent"], "change_timeframe")
        self.assertTrue(result["needs_context"])

    def test_empty_question(self):
        result = recognize_intent("")
        self.assertEqual(result["status"], "empty_question")

    def test_unknown_question(self):
        result = recognize_intent(
            "Can you explain quantum mechanics?"
        )
        self.assertEqual(result["status"], "unrecognized")


if __name__ == "__main__":
    unittest.main()
