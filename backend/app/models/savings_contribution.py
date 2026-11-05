import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import String, Uuid, DateTime, Numeric, ForeignKey, Date, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class SavingsContribution(Base):
    __tablename__ = "savings_contributions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )

    goal_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("savings_goals.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), nullable=False
    )

    contribution_date: Mapped[date] = mapped_column(
        Date, nullable=False
    )

    note: Mapped[str | None] = mapped_column(
        String(250), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )