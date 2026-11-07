
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import require_path_user
from app.db.database import get_db
from app.models.user import User
from app.models.commitment import Commitment
from app.models.payment import Payment
from app.schemas.commitment import (
    CommitmentCreate,
    CommitmentUpdate,
    CommitmentResponse,
)


router = APIRouter(
    prefix="/api/v1/users/{user_id}/commitments",
    tags=["Commitments & Subscriptions"],
    dependencies=[Depends(require_path_user)],
)


# --------------------------------------------------
# HELPERS
# --------------------------------------------------

def verify_user(db: Session, user_id: uuid.UUID):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )


def get_commitment(
    db: Session,
    user_id: uuid.UUID,
    commitment_id: uuid.UUID,
):
    commitment = db.query(Commitment).filter(
        Commitment.id == commitment_id,
        Commitment.user_id == user_id,
    ).first()

    if not commitment:
        raise HTTPException(
            status_code=404,
            detail="Commitment not found",
        )

    return commitment


def payment_status(due_date: date) -> str:
    return "overdue" if due_date < date.today() else "pending"


def get_open_payment(
    db: Session,
    commitment_id: uuid.UUID,
    due_date: date | None = None,
):
    query = db.query(Payment).filter(
        Payment.commitment_id == commitment_id,
        Payment.status.in_(["pending", "overdue"]),
    )

    if due_date is not None:
        query = query.filter(Payment.due_date == due_date)

    return query.order_by(Payment.due_date.asc()).first()


# --------------------------------------------------
# UPCOMING COMMITMENTS
# --------------------------------------------------

@router.get(
    "/upcoming",
    response_model=list[CommitmentResponse],
)
def get_upcoming_commitments(
    user_id: uuid.UUID,
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    verify_user(db, user_id)

    today = date.today()
    deadline = date.fromordinal(today.toordinal() + days)

    return (
        db.query(Commitment)
        .filter(
            Commitment.user_id == user_id,
            Commitment.status == "active",
            Commitment.next_due_date.isnot(None),
            Commitment.next_due_date >= today,
            Commitment.next_due_date <= deadline,
        )
        .order_by(Commitment.next_due_date.asc())
        .all()
    )


# --------------------------------------------------
# CREATE COMMITMENT
# --------------------------------------------------

@router.post(
    "",
    response_model=CommitmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_commitment(
    user_id: uuid.UUID,
    payload: CommitmentCreate,
    db: Session = Depends(get_db),
):
    verify_user(db, user_id)

    commitment = Commitment(
        user_id=user_id,
        **payload.model_dump(),
    )

    db.add(commitment)
    db.flush()

    # Automatically create the first payment.
    if commitment.next_due_date is not None:
        db.add(
            Payment(
                commitment_id=commitment.id,
                user_id=user_id,
                amount=commitment.amount,
                due_date=commitment.next_due_date,
                status=payment_status(commitment.next_due_date),
            )
        )

    db.commit()
    db.refresh(commitment)

    return commitment


# --------------------------------------------------
# LIST COMMITMENTS
# --------------------------------------------------

@router.get(
    "",
    response_model=list[CommitmentResponse],
)
def list_commitments(
    user_id: uuid.UUID,
    commitment_type: str | None = None,
    status_filter: str | None = Query(
        default=None,
        alias="status",
    ),
    db: Session = Depends(get_db),
):
    verify_user(db, user_id)

    query = db.query(Commitment).filter(
        Commitment.user_id == user_id
    )

    if commitment_type:
        query = query.filter(
            Commitment.commitment_type == commitment_type
        )

    if status_filter:
        query = query.filter(
            Commitment.status == status_filter
        )

    return query.order_by(
        Commitment.created_at.desc()
    ).all()


# --------------------------------------------------
# GET INDIVIDUAL COMMITMENT
# --------------------------------------------------

@router.get(
    "/{commitment_id}",
    response_model=CommitmentResponse,
)
def get_single_commitment(
    user_id: uuid.UUID,
    commitment_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    verify_user(db, user_id)

    return get_commitment(
        db,
        user_id,
        commitment_id,
    )


# --------------------------------------------------
# UPDATE COMMITMENT
# --------------------------------------------------

@router.patch(
    "/{commitment_id}",
    response_model=CommitmentResponse,
)
def update_commitment(
    user_id: uuid.UUID,
    commitment_id: uuid.UUID,
    payload: CommitmentUpdate,
    db: Session = Depends(get_db),
):
    verify_user(db, user_id)

    commitment = get_commitment(
        db,
        user_id,
        commitment_id,
    )

    old_due_date = commitment.next_due_date

    updates = payload.model_dump(exclude_unset=True)

    # Apply commitment changes.
    for field, value in updates.items():
        setattr(commitment, field, value)

    # Synchronize the next unpaid payment when
    # its amount or due date changes.
    if "next_due_date" in updates or "amount" in updates:

        new_due_date = commitment.next_due_date

        current_payment = get_open_payment(
            db,
            commitment.id,
            old_due_date,
        )

        # No next due date: remove the outstanding
        # payment, but never delete paid history.
        if new_due_date is None:

            if current_payment:
                db.delete(current_payment)

        else:

            existing_payment = (
                db.query(Payment)
                .filter(
                    Payment.commitment_id == commitment.id,
                    Payment.due_date == new_due_date,
                )
                .first()
            )

            # Never overwrite or reuse a paid payment.
            if (
                existing_payment
                and existing_payment.status == "paid"
                and (
                    current_payment is None
                    or existing_payment.id != current_payment.id
                )
            ):
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "A paid payment already exists for "
                        "the selected due date."
                    ),
                )

            if current_payment:

                if (
                    existing_payment
                    and existing_payment.id != current_payment.id
                ):
                    # Reuse the existing unpaid occurrence
                    # rather than creating a duplicate.
                    db.delete(current_payment)

                    existing_payment.amount = commitment.amount
                    existing_payment.status = payment_status(
                        new_due_date
                    )

                else:
                    current_payment.due_date = new_due_date
                    current_payment.amount = commitment.amount
                    current_payment.status = payment_status(
                        new_due_date
                    )

            elif existing_payment:

                existing_payment.amount = commitment.amount
                existing_payment.status = payment_status(
                    new_due_date
                )

            else:

                db.add(
                    Payment(
                        commitment_id=commitment.id,
                        user_id=user_id,
                        amount=commitment.amount,
                        due_date=new_due_date,
                        status=payment_status(new_due_date),
                    )
                )

    db.commit()
    db.refresh(commitment)

    return commitment


# --------------------------------------------------
# DELETE COMMITMENT
# --------------------------------------------------

@router.delete("/{commitment_id}")
def delete_commitment(
    user_id: uuid.UUID,
    commitment_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    verify_user(db, user_id)

    commitment = get_commitment(
        db,
        user_id,
        commitment_id,
    )

    db.delete(commitment)
    db.commit()

    return {
        "message": "Commitment deleted successfully"
    }
