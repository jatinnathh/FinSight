"""
Analytics API routes.
"""

from fastapi import APIRouter
from backend.services.analytics import get_spending_by_category_monthly, get_top_merchants

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get("/category-monthly")
async def category_monthly():
    data = await get_spending_by_category_monthly()
    return {"data": data}


@router.get("/merchants")
async def merchants(limit: int = 20):
    data = await get_top_merchants(limit)
    return {"data": data}
