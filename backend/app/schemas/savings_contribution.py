import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class SavingsContributionCreate(BaseModel):
    amount: Decimal = Field(
        gt=0, max_digits=14, decimal_places=2
    )
    contribution_date: date
    note: str | None = Field(default=None, max_length=250)


class SavingsContributionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    goal_id: uuid.UUID
    user_id: uuid.UUID
    amount: Decimal
    contribution_date: date
    note: str | None
    created_at: datetime