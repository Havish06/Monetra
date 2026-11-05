import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class SavingsGoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    target_amount: Decimal = Field(
        gt=0, max_digits=14, decimal_places=2
    )
    target_date: date | None = None


class SavingsGoalUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    target_amount: Decimal | None = Field(
        default=None, gt=0, max_digits=14, decimal_places=2
    )
    target_date: date | None = None
    status: str | None = Field(
        default=None,
        pattern=r"^(active|completed|paused|cancelled)$",
    )


class SavingsGoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    target_amount: Decimal
    target_date: date | None
    status: str
    created_at: datetime


class SavingsGoalSummary(BaseModel):
    goal: SavingsGoalResponse
    total_saved: Decimal
    remaining: Decimal
    progress_percentage: Decimal
    is_completed: bool