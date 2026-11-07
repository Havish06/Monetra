
import re
from difflib import SequenceMatcher
from dataclasses import asdict

from .question_bank import QUESTION_BANK


# Common words that add little meaning to an intent match.
STOP_WORDS = {
    "a", "an", "the", "is", "am", "are", "was", "were",
    "do", "does", "did", "can", "could", "would", "should",
    "i", "me", "my", "mine", "we", "our", "you", "your",
    "please", "kindly", "hey", "hi", "hello", "tell", "show",
    "give", "get", "want", "need", "like", "about", "for",
    "to", "of", "in", "on", "at", "with", "from", "and",
    "or", "it", "this", "that", "what", "which", "how",
}

# Common shorthand and spelling variations.
ALIASES = {
    "amt": "amount",
    "bal": "balance",
    "txn": "transaction",
    "txns": "transactions",
    "exp": "expense",
    "expenses": "spending",
    "kharcha": "spending",
    "paise": "money",
    "paisa": "money",
    "pagar": "salary",
    "tankhwa": "salary",
    "kharch": "spending",
    "bachat": "savings",
    "bacha": "remaining",
    "kitna": "how much",
    "kab": "when",
    "dikhao": "show",
    "batao": "tell",
}

# Follow-up intents need conversational context.
CONTEXTUAL_INTENTS = {
    "change_timeframe",
    "change_account_scope",
    "what_if_scenario",
    "explain_previous_result",
}


def normalize_question(question: str) -> str:
    """Normalize a user question for matching."""

    text = question.lower().strip()

    # Normalize currency and common amount shorthand.
    text = text.replace("₹", " inr ")
    text = re.sub(r"\b(\d+(?:\.\d+)?)\s*k\b", r"\1 thousand", text)

    # Remove punctuation while preserving numbers and letters.
    text = re.sub(r"[^\w\s.]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    words = []

    for word in text.split():
        replacement = ALIASES.get(word, word)
        words.extend(replacement.split())

    return " ".join(words)


def tokenize(text: str) -> set[str]:
    """Return meaningful words from normalized text."""

    return {
        word
        for word in normalize_question(text).split()
        if word not in STOP_WORDS and len(word) > 1
    }


def calculate_similarity(
    user_question: str,
    example_question: str,
) -> float:
    """Calculate similarity between a user question and an example."""

    user_normalized = normalize_question(user_question)
    example_normalized = normalize_question(example_question)

    if not user_normalized or not example_normalized:
        return 0.0

    if user_normalized == example_normalized:
        return 1.0

    user_words = tokenize(user_normalized)
    example_words = tokenize(example_normalized)

    if not user_words or not example_words:
        return SequenceMatcher(
            None,
            user_normalized,
            example_normalized,
        ).ratio()

    intersection = user_words & example_words

    # How much of the user's meaning is represented?
    user_coverage = len(intersection) / len(user_words)

    # How much of the example is represented?
    example_coverage = len(intersection) / len(example_words)

    # Balanced overlap score.
    if user_coverage + example_coverage:
        overlap_score = (
            2 * user_coverage * example_coverage
            / (user_coverage + example_coverage)
        )
    else:
        overlap_score = 0.0

    # Character-level similarity helps with minor spelling differences.
    sequence_score = SequenceMatcher(
        None,
        user_normalized,
        example_normalized,
    ).ratio()

    # Give greater importance to matching meaningful words.
    return (overlap_score * 0.75) + (sequence_score * 0.25)


def recognize_intent(
    question: str,
    previous_intent: str | None = None,
    previous_result: dict | None = None,
    threshold: float = 0.48,
) -> dict:
    """
    Recognize the most likely intent behind a customer question.

    Returns:
        {
            "intent": str | None,
            "category": str | None,
            "confidence": float,
            "matched_question": str | None,
            "requires_clarification": bool,
            "needs_context": bool,
            "alternatives": list,
            "status": str
        }
    """

    if not isinstance(question, str) or not question.strip():
        return {
            "intent": None,
            "category": None,
            "confidence": 0.0,
            "matched_question": None,
            "requires_clarification": True,
            "needs_context": False,
            "alternatives": [],
            "status": "empty_question",
        }

    question = question.strip()

    # Detect explicit purchase decisions before similarity matching.
    normalized = normalize_question(question)

    purchase_request = re.search(
        r"\b(?:can|could|should) i (?:buy|purchase|spend)\b"
        r"|\bcan i afford\b"
        r"|\bshould i buy\b"
        r"|\bworth buying\b",
        normalized,
    )

    if purchase_request:
        purchase_intent = next(
            (
                item for item in QUESTION_BANK
                if item.name == "evaluate_purchase"
            ),
            None,
        )

        if purchase_intent:
            return {
                "intent": "evaluate_purchase",
                "category": purchase_intent.category,
                "confidence": 0.95,
                "matched_question": "Should I buy this right now?",
                "requires_clarification": (
                    purchase_intent.clarification_required
                ),
                "needs_context": False,
                "alternatives": [],
                "status": "matched",
            }

    # Rank every example in the question bank.
    candidates = []

    for intent_group in QUESTION_BANK:
        for example in intent_group.examples:
            score = calculate_similarity(question, example)

            candidates.append({
                "intent": intent_group.name,
                "category": intent_group.category,
                "score": score,
                "matched_question": example,
                "requires_clarification": (
                    intent_group.clarification_required
                ),
                "required_context": intent_group.required_context,
            })

    candidates.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    if not candidates:
        return {
            "intent": None,
            "category": None,
            "confidence": 0.0,
            "matched_question": None,
            "requires_clarification": True,
            "needs_context": False,
            "alternatives": [],
            "status": "no_examples",
        }

    best = candidates[0]

    # Keep only the highest-scoring match for each distinct intent.
    best_per_intent = {}

    for candidate in candidates:
        name = candidate["intent"]

        if name not in best_per_intent:
            best_per_intent[name] = candidate

    ranked_intents = sorted(
        best_per_intent.values(),
        key=lambda item: item["score"],
        reverse=True,
    )

    best = ranked_intents[0]

    # Determine whether the request is a contextual follow-up.
    needs_context = best["intent"] in CONTEXTUAL_INTENTS

    if needs_context and not previous_intent and not previous_result:
        return {
            "intent": best["intent"],
            "category": best["category"],
            "confidence": round(best["score"], 3),
            "matched_question": best["matched_question"],
            "requires_clarification": True,
            "needs_context": True,
            "alternatives": [],
            "status": "missing_conversation_context",
        }

    # A low score means we should not pretend to understand.
    if best["score"] < threshold:
        return {
            "intent": None,
            "category": None,
            "confidence": round(best["score"], 3),
            "matched_question": None,
            "requires_clarification": True,
            "needs_context": False,
            "alternatives": [
                {
                    "intent": item["intent"],
                    "confidence": round(item["score"], 3),
                }
                for item in ranked_intents[:3]
            ],
            "status": "unrecognized",
        }

    # Close matches may need clarification.
    second_score = (
        ranked_intents[1]["score"]
        if len(ranked_intents) > 1
        else 0.0
    )

    ambiguous_match = (
        best["score"] - second_score < 0.035
        and second_score >= threshold
    )

    return {
        "intent": best["intent"],
        "category": best["category"],
        "confidence": round(best["score"], 3),
        "matched_question": best["matched_question"],
        "requires_clarification": (
            best["requires_clarification"] or ambiguous_match
        ),
        "needs_context": needs_context,
        "alternatives": [
            {
                "intent": item["intent"],
                "confidence": round(item["score"], 3),
            }
            for item in ranked_intents[1:4]
        ],
        "status": (
            "ambiguous"
            if ambiguous_match
            else "matched"
        ),
    }
