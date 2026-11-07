
from .question_bank import QUESTION_BANK
from .recognizer import recognize_intent
from .entities import extract_entities


def process_message(
    message: str,
    previous_intent: str | None = None,
    previous_result: dict | None = None,
    reference_date=None,
) -> dict:
    """
    Process a customer message through Monetra's intelligence pipeline.

    1. Recognize the customer's intent.
    2. Extract entities.
    3. Identify required context.
    4. Return a structured result.
    """

    if not isinstance(message, str) or not message.strip():
        return {
            "message": message,
            "intent": None,
            "category": None,
            "confidence": 0.0,
            "entities": {},
            "required_context": [],
            "requires_clarification": True,
            "clarification_reason": "empty_message",
            "status": "empty_message",
        }

    recognition = recognize_intent(
        message,
        previous_intent=previous_intent,
        previous_result=previous_result,
    )

    entities = extract_entities(
        message,
        reference_date=reference_date,
    )

    intent_name = recognition["intent"]

    intent_definition = next(
        (
            item for item in QUESTION_BANK
            if item.name == intent_name
        ),
        None,
    )

    required_context = (
        intent_definition.required_context
        if intent_definition
        else []
    )

    clarification_reason = None

    if recognition["status"] == "unrecognized":
        clarification_reason = "intent_not_recognized"

    elif recognition["status"] == "missing_conversation_context":
        clarification_reason = "missing_conversation_context"

    elif recognition["status"] == "ambiguous":
        clarification_reason = "multiple_possible_intents"

    elif recognition["requires_clarification"]:
        clarification_reason = "intent_requires_more_information"

    return {
        "message": message,
        "intent": intent_name,
        "category": recognition["category"],
        "confidence": recognition["confidence"],
        "matched_question": recognition["matched_question"],
        "alternatives": recognition["alternatives"],
        "entities": entities,
        "required_context": required_context,
        "requires_clarification": (
            recognition["requires_clarification"]
            or recognition["status"] in {
                "unrecognized",
                "missing_conversation_context",
            }
        ),
        "clarification_reason": clarification_reason,
        "needs_context": recognition["needs_context"],
        "status": recognition["status"],
    }
