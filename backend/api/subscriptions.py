"""
Subscriptions API routes.
"""

from fastapi import APIRouter
from backend.services.analytics import detect_subscriptions

router = APIRouter(prefix="/api/v1/subscriptions", tags=["subscriptions"])


@router.get("")
async def list_subscriptions():
    return await detect_subscriptions()
