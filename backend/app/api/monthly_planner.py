import uuid
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.security import require_path_user
from app.db.database import get_db
from app.models.user import User
from app.models.monthly_planner import SalaryProfile, MonthlyPlan
from app.schemas.monthly_planner import SalaryProfileUpsert, SalaryProfileResponse, MonthlyPlanUpsert, MonthlyPlanResponse

router = APIRouter(
    prefix="/api/v1/users/{user_id}/monthly-planner",
    tags=["Monthly Planner"],
    dependencies=[Depends(require_path_user)],
)


def verify_user(db: Session, user_id: uuid.UUID):
    if not db.query(User.id).filter(User.id == user_id).first():
        raise HTTPException(status_code=404, detail="User not found")


def month_start(value: date) -> date:
    return date(value.year, value.month, 1)


def serialize_plan(plan: MonthlyPlan | None, period: date, salary: Decimal = Decimal("0")):
    if plan is None:
        return {
            "id": None, "month_start": period, "salary_amount": salary,
            "savings_amount": Decimal("0"), "buffer_amount": Decimal("0"),
            "planned_expenses": [], "planned_expenses_total": Decimal("0"),
            "safe_to_spend": salary, "over_allocated_by": Decimal("0"),
            "updated_at": None,
        }
    expenses = plan.planned_expenses or []
    total = sum((Decimal(str(item["amount"])) for item in expenses), Decimal("0"))
    remaining = Decimal(str(plan.salary_amount)) - Decimal(str(plan.savings_amount)) - Decimal(str(plan.buffer_amount)) - total
    return {
        "id": plan.id, "month_start": plan.month_start,
        "salary_amount": plan.salary_amount, "savings_amount": plan.savings_amount,
        "buffer_amount": plan.buffer_amount, "planned_expenses": expenses,
        "planned_expenses_total": total, "safe_to_spend": max(remaining, Decimal("0")),
        "over_allocated_by": max(-remaining, Decimal("0")), "updated_at": plan.updated_at,
    }


@router.get("/salary", response_model=SalaryProfileResponse | None)
def get_salary(user_id: uuid.UUID, db: Session = Depends(get_db)):
    verify_user(db, user_id)
    return db.query(SalaryProfile).filter(SalaryProfile.user_id == user_id).first()


@router.put("/salary", response_model=SalaryProfileResponse)
def put_salary(user_id: uuid.UUID, payload: SalaryProfileUpsert, db: Session = Depends(get_db)):
    verify_user(db, user_id)
    profile = db.query(SalaryProfile).filter(SalaryProfile.user_id == user_id).first()
    if profile is None:
        profile = SalaryProfile(user_id=user_id, **payload.model_dump())
        db.add(profile)
    else:
        profile.monthly_salary = payload.monthly_salary
        profile.payday_day = payload.payday_day
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/plan", response_model=MonthlyPlanResponse)
def get_plan(
    user_id: uuid.UUID,
    month: date = Query(..., description="Any date within the requested month"),
    db: Session = Depends(get_db),
):
    verify_user(db, user_id)
    period = month_start(month)
    plan = db.query(MonthlyPlan).filter(MonthlyPlan.user_id == user_id, MonthlyPlan.month_start == period).first()
    profile = db.query(SalaryProfile).filter(SalaryProfile.user_id == user_id).first()
    return serialize_plan(plan, period, profile.monthly_salary if profile else Decimal("0"))


@router.put("/plan", response_model=MonthlyPlanResponse)
def put_plan(
    user_id: uuid.UUID,
    payload: MonthlyPlanUpsert,
    month: date = Query(..., description="Any date within the requested month"),
    db: Session = Depends(get_db),
):
    verify_user(db, user_id)
    period = month_start(month)
    profile = db.query(SalaryProfile).filter(SalaryProfile.user_id == user_id).first()
    salary = payload.salary_amount or (profile.monthly_salary if profile else None)
    if salary is None or salary <= 0:
        raise HTTPException(status_code=422, detail="Set your monthly salary before creating a plan.")
    expenses = [item.model_dump(mode="json") for item in payload.planned_expenses]
    total = sum((Decimal(str(item["amount"])) for item in expenses), Decimal("0"))
    allocated = payload.savings_amount + payload.buffer_amount + total
    if allocated > salary:
        raise HTTPException(status_code=422, detail="Savings, buffer and expenses exceed your planned salary.")
    plan = db.query(MonthlyPlan).filter(MonthlyPlan.user_id == user_id, MonthlyPlan.month_start == period).first()
    if plan is None:
        plan = MonthlyPlan(user_id=user_id, month_start=period, salary_amount=salary, savings_amount=payload.savings_amount, buffer_amount=payload.buffer_amount, planned_expenses=expenses)
        db.add(plan)
    else:
        plan.salary_amount = salary
        plan.savings_amount = payload.savings_amount
        plan.buffer_amount = payload.buffer_amount
        plan.planned_expenses = expenses
    db.commit()
    db.refresh(plan)
    return serialize_plan(plan, period)
