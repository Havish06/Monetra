
import re
import calendar

from datetime import date, datetime, timedelta


MERCHANTS = {
    "amazon": "Amazon",
    "flipkart": "Flipkart",
    "swiggy": "Swiggy",
    "zomato": "Zomato",
    "netflix": "Netflix",
    "spotify": "Spotify",
    "youtube": "YouTube",
    "uber": "Uber",
    "ola": "Ola",
    "blinkit": "Blinkit",
    "zepto": "Zepto",
    "myntra": "Myntra",
    "ajio": "AJIO",
    "steam": "Steam",
    "apple": "Apple",
    "google": "Google",
    "prime video": "Prime Video",
}

ACCOUNTS = {
    "hdfc": "HDFC",
    "sbi": "SBI",
    "icici": "ICICI",
    "axis": "Axis",
    "kotak": "Kotak",
    "yes bank": "Yes Bank",
    "idfc": "IDFC FIRST",
    "pnb": "Punjab National Bank",
    "canara": "Canara Bank",
    "bob": "Bank of Baroda",
}

CATEGORIES = {
    "food": ["food", "restaurant", "eating", "dining"],
    "groceries": ["grocery", "groceries", "supermarket"],
    "shopping": ["shopping", "clothes", "clothing", "fashion"],
    "transport": ["transport", "travel", "fuel", "petrol", "diesel"],
    "entertainment": ["entertainment", "movies", "gaming"],
    "health": ["health", "medical", "medicine", "hospital"],
    "education": ["education", "college", "tuition", "course"],
    "rent": ["rent", "house rent"],
    "utilities": ["electricity", "water bill", "internet", "recharge"],
    "subscriptions": ["subscription", "subscriptions"],
}


def normalize_amount(value: str, multiplier: float = 1) -> float:
    """Convert an amount expression into a numeric INR amount."""
    cleaned = value.replace(",", "").strip()
    return round(float(cleaned) * multiplier, 2)


def extract_amounts(text: str) -> list[dict]:
    """Extract currency amounts and common Indian shorthand."""

    pattern = re.compile(
        r"(?:(?:₹|rs\.?|inr)\s*)?"
        r"(\d+(?:,\d{3})*(?:\.\d+)?)"
        r"\s*(k|thousand|lakh|lakhs|lac|lacs|million)?"
        r"(?:\s*(?:rupees|rs\.?|inr))?",
        re.IGNORECASE,
    )

    results = []

    multipliers = {
        "k": 1000,
        "thousand": 1000,
        "lakh": 100000,
        "lakhs": 100000,
        "lac": 100000,
        "lacs": 100000,
        "million": 1000000,
    }

    for match in pattern.finditer(text):
        raw_number = match.group(1)
        unit = (match.group(2) or "").lower()

        # Ignore likely years.
        if not unit and len(raw_number) == 4:
            number = int(raw_number.replace(",", ""))
            if 1900 <= number <= 2100:
                continue

        # Avoid treating date components as money.
        before = text[max(0, match.start() - 2):match.start()]
        after = text[match.end():match.end() + 2]

        if re.search(r"\d\s*$", before) or re.match(r"\s*/", after):
            continue

        try:
            amount = normalize_amount(
                raw_number,
                multipliers.get(unit, 1),
            )
        except ValueError:
            continue

        results.append({
            "value": amount,
            "currency": "INR",
            "raw": match.group(0).strip(),
        })

    return results


def extract_merchants(text: str) -> list[str]:
    lowered = text.lower()

    return [
        merchant
        for key, merchant in MERCHANTS.items()
        if re.search(r"\b" + re.escape(key) + r"\b", lowered)
    ]


def extract_accounts(text: str) -> list[str]:
    lowered = text.lower()

    return [
        account
        for key, account in ACCOUNTS.items()
        if re.search(r"\b" + re.escape(key) + r"\b", lowered)
    ]


def extract_category(text: str) -> str | None:
    lowered = text.lower()

    for category, keywords in CATEGORIES.items():
        if any(
            re.search(r"\b" + re.escape(word) + r"\b", lowered)
            for word in keywords
        ):
            return category

    return None


def extract_timeframe(text: str) -> str | None:
    lowered = text.lower()

    patterns = {
        "today": r"\btoday\b",
        "yesterday": r"\byesterday\b",
        "tomorrow": r"\btomorrow\b",
        "this_week": r"\bthis week\b",
        "last_week": r"\blast week\b",
        "next_week": r"\bnext week\b",
        "this_month": r"\bthis month\b",
        "last_month": r"\blast month\b",
        "next_month": r"\bnext month\b",
        "this_year": r"\bthis year\b",
        "last_year": r"\blast year\b",
    }

    for timeframe, pattern in patterns.items():
        if re.search(pattern, lowered):
            return timeframe

    return None


def extract_date_expression(text: str) -> str | None:
    """Extract a date expression without guessing its meaning."""

    lowered = text.lower()

    relative_patterns = [
        r"\bday after tomorrow\b",
        r"\btomorrow\b",
        r"\btoday\b",
        r"\byesterday\b",
        r"\bnext\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
        r"\bthis\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
        r"\blast\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
    ]

    for pattern in relative_patterns:
        match = re.search(pattern, lowered)
        if match:
            return match.group(0)

    explicit_patterns = [
        r"\b\d{4}-\d{2}-\d{2}\b",
        r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",
        (
            r"\b\d{1,2}\s+"
            r"(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|"
            r"may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|"
            r"oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
            r"(?:\s+\d{4})?\b"
        ),
    ]

    for pattern in explicit_patterns:
        match = re.search(pattern, lowered)
        if match:
            return match.group(0)

    return None


def resolve_date_expression(
    expression: str | None,
    reference_date: date | None = None,
) -> str | None:
    """Resolve supported date expressions to YYYY-MM-DD."""

    if not expression:
        return None

    reference_date = reference_date or date.today()
    value = expression.lower().strip()

    if value == "today":
        return reference_date.isoformat()

    if value == "yesterday":
        return (reference_date - timedelta(days=1)).isoformat()

    if value == "tomorrow":
        return (reference_date + timedelta(days=1)).isoformat()

    if value == "day after tomorrow":
        return (reference_date + timedelta(days=2)).isoformat()

    weekdays = {
        name.lower(): index
        for index, name in enumerate(calendar.day_name)
    }

    match = re.fullmatch(
        r"(next|this|last)\s+"
        r"(monday|tuesday|wednesday|thursday|friday|saturday|sunday)",
        value,
    )

    if match:
        direction, weekday = match.groups()
        target = weekdays[weekday]
        difference = (target - reference_date.weekday()) % 7

        if direction == "next":
            pass
        elif direction == "last":
            difference = difference - 7 if difference == 0 else difference
            if difference > 0:
                difference -= 7

        return (reference_date + timedelta(days=difference)).isoformat()

    # Explicit ISO date.
    try:
        return datetime.strptime(value, "%Y-%m-%d").date().isoformat()
    except ValueError:
        pass

    # Explicit numeric date: DD/MM/YYYY or DD-MM-YYYY.
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d-%m-%y"):
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            pass

    # Named month date, with optional year.
    for fmt in ("%d %b %Y", "%d %B %Y", "%d %b", "%d %B"):
        try:
            parsed = datetime.strptime(value, fmt).date()

            if "%Y" not in fmt:
                parsed = parsed.replace(year=reference_date.year)

            return parsed.isoformat()
        except ValueError:
            pass

    return None


def extract_entities(
    text: str,
    reference_date: date | None = None,
) -> dict:
    """Extract structured entities from a customer message."""

    if not isinstance(text, str):
        text = ""

    date_expression = extract_date_expression(text)

    return {
        "amounts": extract_amounts(text),
        "merchants": extract_merchants(text),
        "accounts": extract_accounts(text),
        "category": extract_category(text),
        "timeframe": extract_timeframe(text),
        "date_expression": date_expression,
        "resolved_date": resolve_date_expression(
            date_expression,
            reference_date,
        ),
        "raw_text": text,
    }
