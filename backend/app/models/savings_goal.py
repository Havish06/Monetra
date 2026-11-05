import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import String, Uuid, DateTime, Numeric, ForeignKey, Date, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(120), nullable=False)

    target_amount: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), nullable=False
    )

    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    status: Mapped[str] = mapped_column(
        String(20), default="active", nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )