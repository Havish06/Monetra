import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    String, Uuid, DateTime, Numeric, ForeignKey,
    Date, Boolean, func
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Commitment(Base):
    __tablename__ = "commitments"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    title: Mapped[str] = mapped_column(
        String(150), nullable=False
    )

    commitment_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )

    amount: Mapped[Decimal | None] = mapped_column(
        Numeric(14, 2), nullable=True
    )

    frequency: Mapped[str] = mapped_column(
        String(20), default="monthly", nullable=False
    )

    next_due_date: Mapped[date | None] = mapped_column(
        Date, nullable=True
    )

    end_date: Mapped[date | None] = mapped_column(
        Date, nullable=True
    )

    auto_renewal: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(20), default="active", nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )