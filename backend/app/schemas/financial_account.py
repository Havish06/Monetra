from datetime import datetime
from decimal import Decimal
import uuid

from pydantic import BaseModel, ConfigDict, Field


class FinancialAccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    account_type: str = Field(min_length=1, max_length=30)
    institution: str | None = Field(default=None, max_length=100)
    balance: Decimal = Field(default=Decimal("0.00"), max_digits=14, decimal_places=2)
    currency: str = Field(default="INR", pattern=r"^[A-Z]{3}$")


class FinancialAccountUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    account_type: str | None = Field(default=None, min_length=1, max_length=30)
    institution: str | None = Field(default=None, max_length=100)
    balance: Decimal | None = Field(default=None, max_digits=14, decimal_places=2)
    currency: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")


class FinancialAccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    account_type: str
    institution: str | None
    balance: Decimal
    currency: str
    created_at: datetime