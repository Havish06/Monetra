import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class SalaryProfileUpsert(BaseModel):
    monthly_salary: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    payday_day: int = Field(default=5, ge=1, le=31)


class SalaryProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    monthly_salary: Decimal
    payday_day: int
    created_at: datetime
    updated_at: datetime


class PlannedExpenseInput(BaseModel):
    id: str
    title: str = Field(min_length=1, max_length=120)
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    due_date: date
    category: str = Field(default="Other", max_length=50)
    frequency: Literal["once", "monthly", "yearly"] = "once"


class MonthlyPlanUpsert(BaseModel):
    salary_amount: Decimal | None = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    savings_amount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=14, decimal_places=2)
    buffer_amount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=14, decimal_places=2)
    planned_expenses: list[PlannedExpenseInput] = Field(default_factory=list, max_length=100)


class LinkedPaymentResponse(BaseModel):
    id: uuid.UUID
    title: str
    amount: Decimal | None
    due_date: date
    status: Literal["pending", "overdue", "paid"]


class MonthlyPlanResponse(BaseModel):
    id: uuid.UUID | None
    month_start: date
    salary_amount: Decimal
    savings_amount: Decimal
    buffer_amount: Decimal
    planned_expenses: list[PlannedExpenseInput]
    planned_expenses_total: Decimal
    linked_payments: list[LinkedPaymentResponse]
    linked_payments_total: Decimal
    safe_to_spend: Decimal
    over_allocated_by: Decimal
    updated_at: datetime | None
