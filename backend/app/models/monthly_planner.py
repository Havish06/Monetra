import uuid
from datetime import datetime, date
from decimal import Decimal

from sqlalchemy import Uuid, ForeignKey, Numeric, Integer, Date, DateTime, JSON, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class SalaryProfile(Base):
    __tablename__ = "salary_profiles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    monthly_salary: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    payday_day: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class MonthlyPlan(Base):
    __tablename__ = "monthly_plans"
    __table_args__ = (UniqueConstraint("user_id", "month_start", name="uq_monthly_plan_user_month"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    month_start: Mapped[date] = mapped_column(Date, nullable=False)
    salary_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    savings_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    buffer_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    planned_expenses: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
