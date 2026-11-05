import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class CommitmentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    commitment_type: str = Field(min_length=1, max_length=30)
    amount: Decimal | None = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    frequency: str = Field(min_length=1, max_length=20)
    next_due_date: date | None = None
    end_date: date | None = None
    auto_renewal: bool = False


class CommitmentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=150)
    commitment_type: str | None = Field(default=None, min_length=1, max_length=30)
    amount: Decimal | None = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    frequency: str | None = Field(default=None, min_length=1, max_length=20)
    next_due_date: date | None = None
    end_date: date | None = None
    auto_renewal: bool | None = None
    status: str | None = Field(
        default=None,
        pattern=r"^(active|paused|cancelled|completed|expired)$"
    )


class CommitmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    commitment_type: str
    amount: Decimal | None
    frequency: str
    next_due_date: date | None
    end_date: date | None
    auto_renewal: bool
    status: str
    created_at: datetime