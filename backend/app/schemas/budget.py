import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class BudgetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=50)
    limit_amount: Decimal = Field(
        gt=0, max_digits=14, decimal_places=2
    )
    period: str = Field(
        default="monthly",
        pattern=r"^(weekly|monthly|yearly|custom)$",
    )
    start_date: date
    end_date: date | None = None


class BudgetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    category: str | None = Field(default=None, min_length=1, max_length=50)
    limit_amount: Decimal | None = Field(
        default=None, gt=0, max_digits=14, decimal_places=2
    )
    period: str | None = Field(
        default=None,
        pattern=r"^(weekly|monthly|yearly|custom)$",
    )
    start_date: date | None = None
    end_date: date | None = None


class BudgetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    category: str
    limit_amount: Decimal
    period: str
    start_date: date
    end_date: date | None
    created_at: datetime


class BudgetSummary(BaseModel):
    budget: BudgetResponse
    spent: Decimal
    remaining: Decimal
    utilization_percentage: Decimal
    is_exceeded: bool