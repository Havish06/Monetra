import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class AccountOverview(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    account_type: str
    balance: Decimal
    currency: str


class TransactionOverview(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    amount: Decimal
    transaction_type: str
    category: str | None
    transaction_date: datetime


class BudgetOverview(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    category: str
    limit_amount: Decimal
    spent: Decimal
    remaining: Decimal
    utilization_percentage: Decimal


class SavingsGoalOverview(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    target_amount: Decimal
    total_saved: Decimal
    remaining: Decimal
    progress_percentage: Decimal
    target_date: date | None
    status: str


class CommitmentOverview(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    commitment_type: str
    amount: Decimal | None
    frequency: str
    next_due_date: date | None
    auto_renewal: bool


class DashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    total_account_balance: Decimal
    monthly_income: Decimal
    monthly_expenses: Decimal
    monthly_net: Decimal
    total_savings_target: Decimal
    total_saved: Decimal
    upcoming_commitments_count: int

    accounts: list[AccountOverview]
    recent_transactions: list[TransactionOverview]
    budgets: list[BudgetOverview]
    savings_goals: list[SavingsGoalOverview]
    upcoming_commitments: list[CommitmentOverview]