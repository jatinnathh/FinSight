"""
Pipeline status API routes.
"""

from fastapi import APIRouter
from backend.db.database import execute_query, execute_one

router = APIRouter(prefix="/api/v1/pipeline", tags=["pipeline"])


@router.get("/status")
async def pipeline_status():
    """Get latest pipeline run status."""
    latest = await execute_one("""
        SELECT run_id, started_at, finished_at, status,
               rows_processed, rows_rejected, error_message, steps
        FROM pipeline_runs
        ORDER BY started_at DESC
        LIMIT 1
    """)

    if not latest:
        return {
            "status": "no_runs",
            "message": "No pipeline runs yet",
        }

    execution_time = None
    if latest["started_at"] and latest["finished_at"]:
        delta = latest["finished_at"] - latest["started_at"]
        execution_time = str(delta)

    return {
        "run_id": latest["run_id"],
        "started_at": latest["started_at"].isoformat() if latest["started_at"] else None,
        "finished_at": latest["finished_at"].isoformat() if latest["finished_at"] else None,
        "status": latest["status"],
        "rows_processed": latest["rows_processed"],
        "rows_rejected": latest["rows_rejected"],
        "error_message": latest["error_message"],
        "steps": latest["steps"],
        "execution_time": execution_time,
    }


@router.get("/history")
async def pipeline_history():
    """Get pipeline run history."""
    rows = await execute_query("""
        SELECT run_id, started_at, finished_at, status,
               rows_processed, rows_rejected
        FROM pipeline_runs
        ORDER BY started_at DESC
        LIMIT 20
    """)

    return {
        "runs": [
            {
                "run_id": r["run_id"],
                "started_at": r["started_at"].isoformat() if r["started_at"] else None,
                "finished_at": r["finished_at"].isoformat() if r["finished_at"] else None,
                "status": r["status"],
                "rows_processed": r["rows_processed"],
                "rows_rejected": r["rows_rejected"],
            }
            for r in rows
        ]
    }
