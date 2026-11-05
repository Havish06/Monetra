"""Small deterministic intent router; it classifies, it does not answer financial questions."""
import re
import unicodedata

INTENT_PATTERNS = {
    "account_summary": [
        r"\b(total|overall|all) (balance|accounts?|money)\b",
        r"\b(balance|money) (across|in) (all )?(my )?accounts?\b",
        r"\bavailable balance\b",
    ],
    "spending_total": [
        r"\bhow much did i spend\b",
        r"\b(total|my) spending\b",
        r"\bspend(ing)? (today|this week|this month|last month)\b",
    ],
    "category_breakdown": [
        r"\b(where|what category).*(money|spend|spending)\b",
        r"\bspent the most\b",
        r"\btop spending categor(y|ies)\b",
    ],
    "budget_status": [
        r"\b(over|within|exceed|exceeded).*(budget)\b",
        r"\bbudget (remaining|left|status)\b",
        r"\bhow much can i spend.*(month|budget)\b",
    ],
    "goal_progress": [
        r"\b(savings? goal|saving target).*(progress|track|reach)\b",
        r"\bon track.*(goal|save)\b",
        r"\bwhen will i reach my target\b",
    ],
    "upcoming_commitments": [
        r"\b(what|which).*(bills|subscriptions|payments|emi).*(due|renew|upcoming)\b",
        r"\bupcoming commitments\b",
        r"\brenew(s|ing|al)? this week\b",
    ],
    "safe_to_spend": [
        r"\b(safe to spend|spendable|left to spend)\b",
        r"\bcan i afford\b",
        r"\bhow much can i safely spend\b",
    ],
    "emergency_guidance": [
        r"\b(unauthori[sz]ed|fraud|stolen card|lost card|wrong transfer)\b",
        r"\baccount (hacked|frozen|compromised)\b",
    ],
    "investment_education": [
        r"\b(investment|portfolio|mutual fund|stock market).*(risk|perform|value|fall)\b",
        r"\bwhat is diversification\b",
    ],
}

CLARIFICATION_PATTERNS = [
    r"^can i afford it\??$",
    r"^should i buy it\??$",
    r"^what about my money\??$",
]


def normalize_question(question: str) -> str:
    if not isinstance(question, str):
        return ""
    text = unicodedata.normalize("NFKC", question).lower()
    text = text.replace("₹", " inr ")
    text = re.sub(r"\b(\d+(?:\.\d+)?)\s*k\b", lambda m: str(float(m.group(1)) * 1000), text)
    text = re.sub(r"[^a-z0-9.\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def classify_intent(question: str) -> dict:
    normalized = normalize_question(question)
    if not normalized:
        return {"intent": None, "status": "needs_clarification", "confidence": 0.0}
    for pattern in CLARIFICATION_PATTERNS:
        if re.search(pattern, normalized):
            return {"intent": None, "status": "needs_clarification", "confidence": 0.0}
    for intent, patterns in INTENT_PATTERNS.items():
        if any(re.search(pattern, normalized) for pattern in patterns):
            return {"intent": intent, "status": "matched", "confidence": 1.0}
    return {"intent": None, "status": "unsupported", "confidence": 0.0}
