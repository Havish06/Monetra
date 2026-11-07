
import unittest

from datetime import date

from app.intelligence.pipeline import process_message


class TestMonetraPipeline(unittest.TestCase):

    def test_balance_question(self):
        result = process_message(
            "How much money do I have across all my accounts?"
        )

        self.assertEqual(
            result["intent"],
            "total_account_balance",
        )
        self.assertEqual(result["category"], "bank_accounts")
        self.assertGreater(result["confidence"], 0)

    def test_purchase_question(self):
        result = process_message(
            "Can I spend ₹5k on Amazon next Friday?"
        )

        self.assertEqual(result["intent"], "evaluate_purchase")
        self.assertEqual(result["entities"]["amounts"][0]["value"], 5000)
        self.assertIn("Amazon", result["entities"]["merchants"])
        self.assertEqual(
            result["entities"]["resolved_date"],
            "2026-11-06",
        )

    def test_spending_question(self):
        result = process_message(
            "How much did I spend on groceries this month?"
        )

        self.assertEqual(result["intent"], "spending_summary")
        self.assertEqual(result["entities"]["category"], "groceries")
        self.assertEqual(result["entities"]["timeframe"], "this_month")

    def test_hinglish_question(self):
        result = process_message(
            "Mere HDFC mein kitna balance hai?"
        )

        self.assertEqual(result["intent"], "single_account_balance")
        self.assertIn("HDFC", result["entities"]["accounts"])

    def test_followup_without_context(self):
        result = process_message("What about last month?")

        self.assertEqual(
            result["status"],
            "missing_conversation_context",
        )
        self.assertTrue(result["requires_clarification"])

    def test_followup_with_context(self):
        result = process_message(
            "What about last month?",
            previous_intent="spending_summary",
        )

        self.assertEqual(result["intent"], "change_timeframe")
        self.assertTrue(result["needs_context"])

    def test_unknown_question(self):
        result = process_message(
            "Explain quantum mechanics"
        )

        self.assertIsNone(result["intent"])
        self.assertEqual(result["status"], "unrecognized")

    def test_empty_message(self):
        result = process_message("")

        self.assertEqual(result["status"], "empty_message")
        self.assertTrue(result["requires_clarification"])

    def test_reference_date(self):
        result = process_message(
            "Show my transactions tomorrow",
            reference_date=date(2026, 11, 5),
        )

        self.assertEqual(
            result["entities"]["resolved_date"],
            "2026-11-06",
        )


if __name__ == "__main__":
    unittest.main()
