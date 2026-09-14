"""
Budgets API routes.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from backend.services.analytics import get_budgets
from backend.db.database import execute_command, execute_one

router = APIRouter(prefix="/api/v1/budgets", tags=["budgets"])


class BudgetCreate(BaseModel):
    category_id: int
    monthly_limit: float
    user_id: int = 1


class BudgetUpdate(BaseModel):
    monthly_limit: float


@router.get("")
async def list_budgets(user_id: int = 1):
    return {"budgets": await get_budgets(user_id)}


@router.post("")
async def create_budget(data: BudgetCreate):
    row = await execute_one(
        "INSERT INTO budgets (user_id, category_id, monthly_limit) VALUES ($1, $2, $3) RETURNING budget_id",
        data.user_id, data.category_id, data.monthly_limit
    )
    return {"budget_id": row["budget_id"], "status": "created"}


@router.put("/{budget_id}")
async def update_budget(budget_id: int, data: BudgetUpdate):
    await execute_command(
        "UPDATE budgets SET monthly_limit = $1 WHERE budget_id = $2",
        data.monthly_limit, budget_id
    )
    return {"budget_id": budget_id, "status": "updated"}


@router.delete("/{budget_id}")
async def delete_budget(budget_id: int):
    await execute_command("DELETE FROM budgets WHERE budget_id = $1", budget_id)
    return {"budget_id": budget_id, "status": "deleted"}
