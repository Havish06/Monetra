from datetime import datetime
from decimal import Decimal
import uuid

from pydantic import BaseModel, ConfigDict, Field


class TransactionCreate(BaseModel):
    account_id: uuid.UUID | None = None
    title: str = Field(min_length=1, max_length=150)
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    transaction_type: str = Field(pattern=r"^(income|expense)$")
    category: str | None = Field(default=None, max_length=50)
    description: str | None = Field(default=None, max_length=500)
    transaction_date: datetime


class TransactionUpdate(BaseModel):
    account_id: uuid.UUID | None = None
    title: str | None = Field(default=None, min_length=1, max_length=150)
    amount: Decimal | None = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    transaction_type: str | None = Field(default=None, pattern=r"^(income|expense)$")
    category: str | None = Field(default=None, max_length=50)
    description: str | None = Field(default=None, max_length=500)
    transaction_date: datetime | None = None


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    account_id: uuid.UUID | None
    title: str
    amount: Decimal
    transaction_type: str
    category: str | None
    description: str | None
    transaction_date: datetime
    created_at: datetime