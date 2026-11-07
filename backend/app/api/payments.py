import uuid
import calendar
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.security import require_path_user
from app.db.database import get_db
from app.models.user import User
from app.models.commitment import Commitment
from app.models.payment import Payment
from app.schemas.payment import PaymentResponse


router = APIRouter(
    prefix="/api/v1/users/{user_id}/payments",
    tags=["Payments"],
    dependencies=[Depends(require_path_user)],
)


def verify_user(db: Session, user_id: uuid.UUID):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")


def get_payment(
    db: Session,
    user_id: uuid.UUID,
    payment_id: uuid.UUID,
):
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id == user_id,
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    return payment


def next_due_date(current: date, frequency: str) -> date | None:
    frequency = frequency.lower()

    if frequency == "once":
        return None

    if frequency == "weekly":
        from datetime import timedelta
        return current + timedelta(days=7)

    if frequency == "monthly":
        year = current.year + (1 if current.month == 12 else 0)
        month = 1 if current.month == 12 else current.month + 1
        day = min(current.day, calendar.monthrange(year, month)[1])
        return date(year, month, day)

    if frequency == "yearly":
        year = current.year + 1
        day = min(current.day, calendar.monthrange(year, current.month)[1])
        return date(year, current.month, day)

    raise HTTPException(
        status_code=400,
        detail=f"Unsupported payment frequency: {frequency}",
    )


def refresh_payment_statuses(db: Session, user_id: uuid.UUID):
    today = date.today()

    payments = db.query(Payment).filter(
        Payment.user_id == user_id,
        Payment.status.in_(["pending", "overdue"]),
    ).all()

    changed = False

    for payment in payments:
        new_status = (
            "overdue" if payment.due_date < today else "pending"
        )

        if payment.status != new_status:
            payment.status = new_status
            changed = True

    if changed:
        db.commit()


@router.get("", response_model=list[PaymentResponse])
def list_payments(
    user_id: uuid.UUID,
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    verify_user(db, user_id)
    refresh_payment_statuses(db, user_id)

    query = db.query(Payment).filter(Payment.user_id == user_id)

    if status_filter:
        if status_filter not in {"pending", "overdue", "paid"}:
            raise HTTPException(
                status_code=400,
                detail="Invalid payment status",
            )
        query = query.filter(Payment.status == status_filter)

    return query.order_by(
        Payment.due_date.asc(),
        Payment.created_at.desc(),
    ).all()


@router.patch("/{payment_id}/pay", response_model=PaymentResponse)
def mark_payment_paid(
    user_id: uuid.UUID,
    payment_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    verify_user(db, user_id)

    payment = get_payment(db, user_id, payment_id)

    if payment.status == "paid":
        raise HTTPException(
            status_code=409,
            detail="Payment is already marked as paid",
        )

    commitment = db.query(Commitment).filter(
        Commitment.id == payment.commitment_id,
        Commitment.user_id == user_id,
    ).first()

    if not commitment:
        raise HTTPException(
            status_code=404,
            detail="Associated commitment not found",
        )

    payment.status = "paid"
    payment.paid_at = datetime.now(timezone.utc)

    following_date = next_due_date(
        payment.due_date,
        commitment.frequency,
    )

    if following_date is None:
        commitment.status = "completed"
        commitment.next_due_date = None

    elif (
        commitment.status == "active"
        and (
            commitment.end_date is None
            or following_date <= commitment.end_date
        )
    ):
        commitment.next_due_date = following_date

        existing = db.query(Payment).filter(
            Payment.commitment_id == commitment.id,
            Payment.due_date == following_date,
        ).first()

        if not existing:
            db.add(
                Payment(
                    commitment_id=commitment.id,
                    user_id=user_id,
                    amount=commitment.amount,
                    due_date=following_date,
                    status="pending",
                )
            )

    db.commit()
    db.refresh(payment)

    return payment