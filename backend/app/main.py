from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import test_connection
from fastapi import FastAPI, HTTPException
from app.api.financial_accounts import router as financial_accounts_router
from app.api.transactions import router as transactions_router
from app.api.budgets import router as budgets_router

from app.api.savings_goals import router as savings_goals_router
from app.api.savings_contributions import router as savings_contributions_router
from app.api.commitments import router as commitments_router
from app.api.dashboard import router as dashboard_router
from app.api.profile import router as profile_router


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
    except Exception as e:
        print("DATABASE ERROR:", repr(e))
        raise HTTPException(
            status_code=503,
            detail=str(e),
        )

@app.get("/api/v1/dashboard")
def get_dashboard():
    return {
        "user": {
            "firstName": "there"
        },
        "currency": "INR",
        "balance": {
            "available": 24500,
            "income": 45000,
            "spent": 12800,
            "committed": 7700,
            "savings": 5000
        },
        "cashFlow": [
            {"day": "01", "amount": 45000},
            {"day": "05", "amount": 39000},
            {"day": "10", "amount": 35000},
            {"day": "15", "amount": 31800},
            {"day": "20", "amount": 28500},
            {"day": "25", "amount": 24500}
        ],
        "upcoming": [
            {
                "id": "1",
                "title": "Internet bill",
                "subtitle": "Tomorrow · Utilities",
                "amount": 999,
                "type": "bill"
            },
            {
                "id": "2",
                "title": "Design tool trial",
                "subtitle": "In 3 days · Trial ending",
                "amount": 799,
                "type": "trial"
            },
            {
                "id": "3",
                "title": "Dinner with friends",
                "subtitle": "Nov 16 · Lifestyle",
                "amount": 1200,
                "type": "event"
            }
        ]
    }