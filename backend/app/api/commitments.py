import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import require_path_user

from app.db.database import get_db
from app.models.user import User
from app.models.commitment import Commitment
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


def verify_user(db: Session, user_id: uuid.UUID):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")


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
        raise HTTPException(status_code=404, detail="Commitment not found")

    return commitment


# Upcoming commitments - define before /{commitment_id}
@router.get("/upcoming", response_model=list[CommitmentResponse])
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


# Create commitment
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
    db.commit()
    db.refresh(commitment)

    return commitment


# List commitments
@router.get("", response_model=list[CommitmentResponse])
def list_commitments(
    user_id: uuid.UUID,
    commitment_type: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
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

    return query.order_by(Commitment.created_at.desc()).all()


# Get individual commitment
@router.get("/{commitment_id}", response_model=CommitmentResponse)
def get_single_commitment(
    user_id: uuid.UUID,
    commitment_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    verify_user(db, user_id)

    return get_commitment(db, user_id, commitment_id)


# Update commitment
@router.patch("/{commitment_id}", response_model=CommitmentResponse)
def update_commitment(
    user_id: uuid.UUID,
    commitment_id: uuid.UUID,
    payload: CommitmentUpdate,
    db: Session = Depends(get_db),
):
    verify_user(db, user_id)

    commitment = get_commitment(db, user_id, commitment_id)

    updates = payload.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(commitment, field, value)

    db.commit()
    db.refresh(commitment)

    return commitment


# Delete commitment
@router.delete("/{commitment_id}")
def delete_commitment(
    user_id: uuid.UUID,
    commitment_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    verify_user(db, user_id)

    commitment = get_commitment(db, user_id, commitment_id)

    db.delete(commitment)
    db.commit()

    return {"message": "Commitment deleted successfully"}