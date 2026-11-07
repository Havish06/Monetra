from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import test_connection
from app.api.financial_accounts import router as financial_accounts_router
from app.api.transactions import router as transactions_router
from app.api.budgets import router as budgets_router
from app.api.savings_goals import router as savings_goals_router
from app.api.savings_contributions import router as savings_contributions_router
from app.api.commitments import router as commitments_router
from app.api.dashboard import router as dashboard_router
from app.api.profile import router as profile_router
from app.api.ai import router as ai_router
from app.api.payments import router as payments_router
from app.api.monthly_planner import router as monthly_planner_router


app = FastAPI(
    title="Monetra API",
    description="Intelligent Financial Orchestration",
    version="0.1.0",
)

app.include_router(financial_accounts_router)
app.include_router(transactions_router)
app.include_router(budgets_router)
app.include_router(savings_goals_router)
app.include_router(savings_contributions_router)
app.include_router(commitments_router)
app.include_router(dashboard_router)
app.include_router(profile_router)
app.include_router(ai_router)
app.include_router(payments_router)
app.include_router(monthly_planner_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this before production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "app": "Monetra",
        "status": "running",
        "version": "0.1.0",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/health/database")
def database_health():
    try:
        result = test_connection()
        return {
            "status": "connected",
            "database": "supabase-postgresql",
            "test_query": result,
        }
    except Exception as exc:
        print("DATABASE ERROR:", repr(exc))
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc
