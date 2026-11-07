
import unittest

from datetime import date

from app.intelligence.entities import (
    extract_amounts,
    extract_entities,
    resolve_date_expression,
)


class TestEntityExtractor(unittest.TestCase):

    def test_rupee_amount(self):
        result = extract_amounts("I want to spend ₹5,000")
        self.assertEqual(result[0]["value"], 5000)

    def test_thousand_shorthand(self):
        result = extract_amounts("Spend 5k")
        self.assertEqual(result[0]["value"], 5000)

    def test_lakh_amount(self):
        result = extract_amounts("Save 1.5 lakh")
        self.assertEqual(result[0]["value"], 150000)

    def test_merchant(self):
        result = extract_entities("Buy something from Amazon")
        self.assertIn("Amazon", result["merchants"])

    def test_account(self):
        result = extract_entities("Check my HDFC balance")
        self.assertIn("HDFC", result["accounts"])

    def test_category(self):
        result = extract_entities("How much did I spend on groceries?")
        self.assertEqual(result["category"], "groceries")

    def test_timeframe(self):
        result = extract_entities("Show my expenses this month")
        self.assertEqual(result["timeframe"], "this_month")

    def test_today(self):
        result = resolve_date_expression(
            "today",
            date(2026, 11, 5),
        )
        self.assertEqual(result, "2026-11-05")

    def test_next_friday(self):
        result = resolve_date_expression(
            "next friday",
            date(2026, 11, 5),
        )
        self.assertEqual(result, "2026-11-06")

    def test_combined_entities(self):
        result = extract_entities(
            "Can I spend ₹5k on Amazon next Friday?"
        )

        self.assertEqual(result["amounts"][0]["value"], 5000)
        self.assertIn("Amazon", result["merchants"])
        self.assertEqual(result["date_expression"], "next friday")

    def test_empty_input(self):
        result = extract_entities("")
        self.assertEqual(result["amounts"], [])
        self.assertIsNone(result["category"])


if __name__ == "__main__":
    unittest.main()
