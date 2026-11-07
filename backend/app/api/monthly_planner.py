import uuid
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.security import require_path_user
from app.db.database import get_db
from app.models.user import User
from app.models.monthly_planner import SalaryProfile, MonthlyPlan
from app.models.payment import Payment
from app.models.commitment import Commitment
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


def due_payment_snapshot(db: Session, user_id: uuid.UUID, period: date):
    next_period = date(
        period.year + (1 if period.month == 12 else 0),
        1 if period.month == 12 else period.month + 1,
        1,
    )
    query = (
        db.query(Payment, Commitment.title)
        .join(Commitment, Commitment.id == Payment.commitment_id)
        .filter(
            Payment.user_id == user_id,
            Payment.due_date < next_period,
            Payment.status.in_(["pending", "overdue"]),
        )
    )
    current_month = date.today().replace(day=1)
    # For the current month, include unpaid overdue items from earlier months.
    # Historical and future plans only include payments due within that month.
    if period != current_month:
        query = query.filter(Payment.due_date >= period)
    rows = query.order_by(Payment.due_date.asc()).all()
    linked = [
        {"id": payment.id, "title": title, "amount": payment.amount,
         "due_date": payment.due_date, "status": payment.status}
        for payment, title in rows
    ]
    total = sum(
        (Decimal(str(item["amount"])) for item in linked if item["amount"] is not None),
        Decimal("0"),
    )
    return linked, total


def serialize_plan(
    plan: MonthlyPlan | None,
    period: date,
    salary: Decimal = Decimal("0"),
    linked_payments: list | None = None,
    linked_payments_total: Decimal = Decimal("0"),
    expenses_override: list | None = None,
):
    expenses = (plan.planned_expenses or []) if plan is not None else (expenses_override or [])
    plan_salary = Decimal(str(plan.salary_amount)) if plan is not None else Decimal(str(salary))
    savings = Decimal(str(plan.savings_amount)) if plan is not None else Decimal("0")
    buffer = Decimal(str(plan.buffer_amount)) if plan is not None else Decimal("0")
    expense_total = sum((Decimal(str(item["amount"])) for item in expenses), Decimal("0"))
    remaining = plan_salary - savings - buffer - expense_total - linked_payments_total
    return {
        "id": plan.id if plan is not None else None,
        "month_start": period,
        "salary_amount": plan_salary,
        "savings_amount": savings,
        "buffer_amount": buffer,
        "planned_expenses": expenses,
        "planned_expenses_total": expense_total,
        "linked_payments": linked_payments or [],
        "linked_payments_total": linked_payments_total,
        "safe_to_spend": max(remaining, Decimal("0")),
        "over_allocated_by": max(-remaining, Decimal("0")),
        "updated_at": plan.updated_at if plan is not None else None,
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
    plan = db.query(MonthlyPlan).filter(
        MonthlyPlan.user_id == user_id,
        MonthlyPlan.month_start == period,
    ).first()
    profile = db.query(SalaryProfile).filter(SalaryProfile.user_id == user_id).first()
    salary = profile.monthly_salary if profile else Decimal("0")
    linked_payments, payments_total = due_payment_snapshot(db, user_id, period)

    if plan is not None:
        return serialize_plan(plan, period, salary, linked_payments, payments_total)

    from calendar import monthrange
    prior_plans = (
        db.query(MonthlyPlan)
        .filter(MonthlyPlan.user_id == user_id, MonthlyPlan.month_start < period)
        .order_by(MonthlyPlan.month_start.desc())
        .all()
    )
    carried = {}
    for prior in prior_plans:
        for item in prior.planned_expenses or []:
            expense_id = item.get("id")
            if not expense_id or expense_id in carried:
                continue
            frequency = item.get("frequency", "once")
            if frequency not in ("monthly", "yearly"):
                continue
            due = date.fromisoformat(item["due_date"])
            if frequency == "yearly" and not (period.month == due.month and period.year > due.year):
                continue
            day = min(due.day, monthrange(period.year, period.month)[1])
            carried[expense_id] = {
                **item,
                "due_date": date(period.year, period.month, day).isoformat(),
            }

    return serialize_plan(
        None, period, salary, linked_payments, payments_total,
        expenses_override=list(carried.values()),
    )


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
    linked_payments, payments_total = due_payment_snapshot(db, user_id, period)
    allocated = payload.savings_amount + payload.buffer_amount + total + payments_total
    if allocated > salary:
        raise HTTPException(
            status_code=422,
            detail="Savings, buffer, planned expenses and unpaid bills exceed your planned salary.",
        )
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
    return serialize_plan(plan, period, salary, linked_payments, payments_total)
