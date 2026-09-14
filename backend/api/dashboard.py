"""
Dashboard API routes.
"""

from fastapi import APIRouter
from backend.services.analytics import get_overview, get_spending_over_time, get_top_categories, get_top_merchants

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/overview")
async def overview():
    data = await get_overview()
    return data


@router.get("/spending-over-time")
async def spending_over_time(months: int = 12):
    data = await get_spending_over_time(months)
    return {"data": data}


@router.get("/top-categories")
async def top_categories(limit: int = 10):
    data = await get_top_categories(limit)
    return {"data": data}


@router.get("/top-merchants")
async def top_merchants(limit: int = 10):
    data = await get_top_merchants(limit)
    return {"data": data}
