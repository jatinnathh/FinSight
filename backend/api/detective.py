"""
Data Detective API route.
"""

from fastapi import APIRouter
from backend.services.analytics import get_data_detective

router = APIRouter(prefix="/api/v1/detective", tags=["detective"])


@router.get("")
async def data_detective():
    return await get_data_detective()
