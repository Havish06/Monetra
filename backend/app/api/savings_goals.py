import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.models.savings_goal import SavingsGoal
from app.models.savings_contribution import SavingsContribution

from app.core.security import require_path_user

from app.schemas.savings_goal import (
    SavingsGoalCreate,
    SavingsGoalUpdate,
    SavingsGoalResponse,
    SavingsGoalSummary,
)


router = APIRouter(
    prefix="/api/v1/users/{user_id}/savings-goals",
    tags=["Savings Goals"],

    dependencies=[Depends(require_path_user)],
)


def verify_user(user_id: uuid.UUID, db: Session):
    if not db.get(User, user_id):
        raise HTTPException(status_code=404, detail="User not found")


def calculate_summary(
    user_id: uuid.UUID,
    goal: SavingsGoal,
    db: Session,
) -> SavingsGoalSummary:
    total = db.query(
        func.coalesce(func.sum(SavingsContribution.amount), 0)
    ).filter(
        SavingsContribution.goal_id == goal.id,
        SavingsContribution.user_id == user_id,
    ).scalar()

    total_saved = Decimal(str(total))
    remaining = max(goal.target_amount - total_saved, Decimal("0"))

    progress = min(
        total_saved / goal.target_amount * Decimal("100"),
        Decimal("100"),
    ).quantize(Decimal("0.01"))

    return SavingsGoalSummary(
        goal=goal,
        total_saved=total_saved,
        remaining=remaining,
        progress_percentage=progress,
        is_completed=total_saved >= goal.target_amount,
    )


@router.post(
    "",
    response_model=SavingsGoalResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_goal(
    user_id: uuid.UUID,
    goal: SavingsGoalCreate,
    db: Session = Depends(get_db),
):
    verify_user(user_id, db)

    new_goal = SavingsGoal(
        user_id=user_id,
        **goal.model_dump(),
    )

    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)

    return new_goal


@router.get("", response_model=list[SavingsGoalResponse])
def list_goals(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    verify_user(user_id, db)

    return db.query(SavingsGoal).filter(
        SavingsGoal.user_id == user_id
    ).order_by(SavingsGoal.created_at.desc()).all()


@router.get("/summary", response_model=list[SavingsGoalSummary])
def list_goal_summaries(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    verify_user(user_id, db)

    goals = db.query(SavingsGoal).filter(
        SavingsGoal.user_id == user_id
    ).all()

    return [
        calculate_summary(user_id, goal, db)
        for goal in goals
    ]


@router.get("/{goal_id}", response_model=SavingsGoalResponse)
def get_goal(
    user_id: uuid.UUID,
    goal_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    verify_user(user_id, db)

    goal = db.query(SavingsGoal).filter(
        SavingsGoal.id == goal_id,
        SavingsGoal.user_id == user_id,
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Savings goal not found")

    return goal


@router.get("/{goal_id}/summary", response_model=SavingsGoalSummary)
def get_goal_summary(
    user_id: uuid.UUID,
    goal_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    verify_user(user_id, db)

    goal = db.query(SavingsGoal).filter(
        SavingsGoal.id == goal_id,
        SavingsGoal.user_id == user_id,
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Savings goal not found")

    return calculate_summary(user_id, goal, db)


@router.patch("/{goal_id}", response_model=SavingsGoalResponse)
def update_goal(
    user_id: uuid.UUID,
    goal_id: uuid.UUID,
    updates: SavingsGoalUpdate,
    db: Session = Depends(get_db),
):
    verify_user(user_id, db)

    goal = db.query(SavingsGoal).filter(
        SavingsGoal.id == goal_id,
        SavingsGoal.user_id == user_id,
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Savings goal not found")

    update_data = updates.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(goal, field, value)

    db.commit()
    db.refresh(goal)

    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    user_id: uuid.UUID,
    goal_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    verify_user(user_id, db)

    goal = db.query(SavingsGoal).filter(
        SavingsGoal.id == goal_id,
        SavingsGoal.user_id == user_id,
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Savings goal not found")

    db.delete(goal)
    db.commit()
