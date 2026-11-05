import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.models.savings_goal import SavingsGoal
from app.models.savings_contribution import SavingsContribution

from app.core.security import require_path_user

from app.schemas.savings_contribution import (
    SavingsContributionCreate,
    SavingsContributionResponse,
)


router = APIRouter(
    prefix="/api/v1/users/{user_id}/savings-goals/{goal_id}/contributions",
    tags=["Savings Contributions"],
    dependencies=[Depends(require_path_user)],
)


def verify_goal(
    user_id: uuid.UUID,
    goal_id: uuid.UUID,
    db: Session,
):
    if not db.get(User, user_id):
        raise HTTPException(status_code=404, detail="User not found")

    goal = db.query(SavingsGoal).filter(
        SavingsGoal.id == goal_id,
        SavingsGoal.user_id == user_id,
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Savings goal not found")

    return goal


@router.post(
    "",
    response_model=SavingsContributionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_contribution(
    user_id: uuid.UUID,
    goal_id: uuid.UUID,
    contribution: SavingsContributionCreate,
    db: Session = Depends(get_db),
):
    goal = verify_goal(user_id, goal_id, db)

    if goal.status != "active":
        raise HTTPException(
            status_code=409,
            detail="Contributions are only allowed for active goals",
        )

    new_contribution = SavingsContribution(
        user_id=user_id,
        goal_id=goal_id,
        **contribution.model_dump(),
    )

    db.add(new_contribution)
    db.commit()
    db.refresh(new_contribution)

    return new_contribution


@router.get("", response_model=list[SavingsContributionResponse])
def list_contributions(
    user_id: uuid.UUID,
    goal_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    verify_goal(user_id, goal_id, db)

    return db.query(SavingsContribution).filter(
        SavingsContribution.user_id == user_id,
        SavingsContribution.goal_id == goal_id,
    ).order_by(
        SavingsContribution.contribution_date.desc()
    ).all()


@router.delete(
    "/{contribution_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_contribution(
    user_id: uuid.UUID,
    goal_id: uuid.UUID,
    contribution_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    verify_goal(user_id, goal_id, db)

    contribution = db.query(SavingsContribution).filter(
        SavingsContribution.id == contribution_id,
        SavingsContribution.user_id == user_id,
        SavingsContribution.goal_id == goal_id,
    ).first()

    if not contribution:
        raise HTTPException(
            status_code=404,
            detail="Contribution not found",
        )

    db.delete(contribution)
    db.commit()