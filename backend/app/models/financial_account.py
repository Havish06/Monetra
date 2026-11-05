import uuid

from sqlalchemy import String, Uuid, DateTime, Numeric, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base

from datetime import datetime
from decimal import Decimal

class FinancialAccount(Base):
    __tablename__ = "financial_accounts"

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

    account_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    institution: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    balance: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        default=0,
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        default="INR",
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )