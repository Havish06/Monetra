from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.intelligence.data_resolver import resolve_financial_context
from app.intelligence.pipeline import process_message
from app.intelligence.financial_engine import analyze_finances
from app.intelligence.decision_engine import evaluate_decision
from app.intelligence.response_generator import generate_response


router = APIRouter(
    prefix="/api/v1/ai",
    tags=["Monetra AI"],
)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    previous_intent: str | None = None
    previous_result: dict[str, Any] | None = None


class ChatResponse(BaseModel):
    message: str
    intent: str
    category: str | None = None
    confidence: float
    response: str
    decision: dict[str, Any]
    analysis: dict[str, Any]
    clarification_required: bool


@router.post("/chat", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        context = resolve_financial_context(
            db=db,
            user_id=current_user.id,
        )

        pipeline_result = process_message(
            message=payload.message,
            previous_intent=payload.previous_intent,
            previous_result=payload.previous_result,
            reference_date=date.today(),
        )

        analysis = analyze_finances(context)

        decision = evaluate_decision(
            pipeline_result=pipeline_result,
            context=context,
            analysis=analysis,
        )

        response = generate_response(
            pipeline_result=pipeline_result,
            analysis=analysis,
            decision=decision,
        )

        return {
            "message": payload.message,
            "intent": pipeline_result.get("intent", "unknown"),
            "category": pipeline_result.get("category"),
            "confidence": pipeline_result.get("confidence", 0),
            "response": response,
            "decision": decision,
            "analysis": analysis,
            "clarification_required": pipeline_result.get(
                "requires_clarification", False
            ),
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/financial-overview")
def financial_overview(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        context = resolve_financial_context(
            db=db,
            user_id=current_user.id,
        )

        return {
            "analysis": analyze_finances(context),
            "fetched_at": context["fetched_at"],
            "date_range": context["date_range"],
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))