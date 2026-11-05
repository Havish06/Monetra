import uuid
from decimal import Decimal

from sqlalchemy import (
    String,
    Uuid,
    DateTime,
    Numeric,
    ForeignKey,
    Date,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    limit_amount: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
    )

    period: Mapped[str] = mapped_column(
        String(20),
        default="monthly",
        nullable=False,
    )

    start_date: Mapped[Date] = mapped_column(
        Date,
        nullable=False,
    )

    end_date: Mapped[Date | None] = mapped_column(
        Date,
        nullable=True,
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )