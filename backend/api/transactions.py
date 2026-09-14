"""
Transactions API routes.
"""

from fastapi import APIRouter, Query
from backend.services.analytics import get_transactions

router = APIRouter(prefix="/api/v1/transactions", tags=["transactions"])


@router.get("")
async def list_transactions(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    search: str = Query(None),
    category: str = Query(None),
    status: str = Query(None),
    sort_by: str = Query("transaction_date"),
    sort_order: str = Query("desc"),
):
    return await get_transactions(page, per_page, search, category, status, sort_by, sort_order)
