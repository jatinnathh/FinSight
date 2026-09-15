"""
FinSight Backend — FastAPI Application
"""

import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.db.database import get_pool, close_pool
from backend.api.data import router as data_router
from backend.api.dashboard import router as dashboard_router
from backend.api.transactions import router as transactions_router
from backend.api.subscriptions import router as subscriptions_router
from backend.api.budgets import router as budgets_router
from backend.api.ask import router as ask_router
from backend.api.pipeline import router as pipeline_router
from backend.api.detective import router as detective_router
from backend.api.analytics import router as analytics_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize connection pool
    await get_pool()
    print("Database pool initialized")
    yield
    # Shutdown: close pool
    await close_pool()
    print("Database pool closed")


app = FastAPI(
    title="FinSight API",
    description="Personal finance analytics platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(data_router)
app.include_router(dashboard_router)
app.include_router(transactions_router)
app.include_router(subscriptions_router)
app.include_router(budgets_router)
app.include_router(ask_router)
app.include_router(pipeline_router)
app.include_router(detective_router)
app.include_router(analytics_router)


@app.get("/api/v1/health")
async def health():
    return {"status": "healthy", "service": "finsight-api"}


@app.get("/api/v1/categories")
async def list_categories():
    from backend.db.database import execute_query
    rows = await execute_query("SELECT category_id, category_name, parent_category FROM categories ORDER BY category_name")
    return {"categories": [dict(r) for r in rows]}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
