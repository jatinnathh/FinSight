"""
Pipeline metadata helpers for visualizing ingestion, transformation, and quality.
"""

import json

from backend.db.database import execute_command, execute_one
from backend.services.validation import run_all_checks

VALID_CURRENCIES = ("INR", "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "SGD")
VALID_STATUSES = ("completed", "pending", "failed", "refunded")
VALID_TYPES = ("debit", "credit", "refund", "transfer")


async def transaction_counts() -> dict:
    """Return row counts used by pipeline and transformation screens."""
    total = await execute_one("SELECT COUNT(*) as cnt FROM transactions")
    staging = await execute_one("""
        SELECT COUNT(*) as cnt
        FROM transactions
        WHERE transaction_date IS NOT NULL
          AND amount IS NOT NULL
          AND currency = ANY($1::text[])
          AND status = ANY($2::text[])
          AND transaction_type = ANY($3::text[])
    """, list(VALID_CURRENCIES), list(VALID_STATUSES), list(VALID_TYPES))
    marts = await execute_one("""
        SELECT COUNT(*) as cnt
        FROM transactions
        WHERE status = 'completed'
          AND amount > 0
          AND currency = ANY($1::text[])
    """, list(VALID_CURRENCIES))
    duplicate_groups = await execute_one("""
        SELECT COUNT(*) as cnt FROM (
            SELECT account_id, merchant_id, transaction_date, amount, currency
            FROM transactions
            GROUP BY account_id, merchant_id, transaction_date, amount, currency
            HAVING COUNT(*) > 1
        ) dupes
    """)

    return {
        "raw": int(total["cnt"]),
        "staging": int(staging["cnt"]),
        "marts": int(marts["cnt"]),
        "duplicate_groups": int(duplicate_groups["cnt"]),
    }


async def build_pipeline_steps(rows_processed: int | None = None) -> list[dict]:
    """Build the visual pipeline stages from current database state."""
    counts = await transaction_counts()
    source_rows = rows_processed or counts["raw"]
    checks = await run_all_checks()
    passed = len([c for c in checks if c["status"] in ("pass", "info")])
    warnings = len([c for c in checks if c["status"] == "warn"])
    failed = len([c for c in checks if c["status"] == "fail"])
    quality_status = "failed" if failed else "warning" if warnings else "completed"

    return [
        {
            "id": "source",
            "name": "CSV / Source",
            "technology": "CSV export",
            "status": "completed",
            "rows_in": source_rows,
            "rows_out": source_rows,
            "duration_seconds": 0.18,
            "timing_label": "simulated",
            "model": "incoming file",
            "input": "bank export or demo generator",
            "output": "ingestion queue",
            "transformations": ["Read headers", "Sampled first rows", "Detected currencies"],
        },
        {
            "id": "ingestion",
            "name": "Ingestion",
            "technology": "Python",
            "status": "completed",
            "rows_in": source_rows,
            "rows_out": counts["raw"],
            "duration_seconds": 11.34,
            "timing_label": "simulated",
            "model": "backend.services.ingestion",
            "input": "ingestion queue",
            "output": "raw.transactions",
            "transformations": ["Parsed CSV rows", "Mapped source columns", "Loaded records"],
        },
        {
            "id": "raw",
            "name": "Raw Postgres",
            "technology": "PostgreSQL",
            "status": "completed",
            "rows_in": counts["raw"],
            "rows_out": counts["raw"],
            "duration_seconds": 2.77,
            "timing_label": "simulated",
            "model": "transactions",
            "input": "Python ingestion",
            "output": "raw.transactions",
            "transformations": ["Stored canonical columns", "Preserved source descriptors"],
        },
        {
            "id": "staging",
            "name": "dbt Staging",
            "technology": "dbt + SQL",
            "status": "completed",
            "rows_in": counts["raw"],
            "rows_out": counts["staging"],
            "duration_seconds": 4.21,
            "timing_label": "simulated",
            "model": "stg_transactions",
            "input": "raw.transactions",
            "output": "staging.stg_transactions",
            "transformations": [
                "Parsed timestamps",
                "Normalized currencies",
                "Standardized status",
                "Removed invalid records",
            ],
        },
        {
            "id": "marts",
            "name": "dbt Marts",
            "technology": "dbt + SQL",
            "status": "completed",
            "rows_in": counts["staging"],
            "rows_out": counts["marts"],
            "duration_seconds": 5.06,
            "timing_label": "simulated",
            "model": "monthly_spending, merchant_metrics",
            "input": "staging.stg_transactions",
            "output": "marts analytics tables",
            "transformations": [
                "Filtered completed debits",
                "Joined merchants and categories",
                "Aggregated monthly spending",
            ],
        },
        {
            "id": "quality",
            "name": "Quality",
            "technology": "dbt tests",
            "status": quality_status,
            "rows_in": counts["marts"],
            "rows_out": counts["marts"],
            "duration_seconds": 2.14,
            "timing_label": "simulated",
            "model": "data_quality_results",
            "input": "staging and marts",
            "output": "quality report",
            "passed": passed,
            "warnings": warnings,
            "failed": failed,
            "transformations": ["Uniqueness checks", "Currency checks", "Referential checks"],
        },
        {
            "id": "analytics",
            "name": "Analytics",
            "technology": "SQL + UI",
            "status": "completed" if failed == 0 else "blocked",
            "rows_in": counts["marts"],
            "rows_out": counts["marts"],
            "duration_seconds": 0.92,
            "timing_label": "simulated",
            "model": "dashboard API",
            "input": "marts analytics tables",
            "output": "FinSight dashboard",
            "transformations": ["Served metrics", "Explained SQL lineage"],
        },
    ]


async def record_pipeline_run(rows_processed: int, rows_rejected: int = 0, status: str = "success"):
    """Persist a pipeline run with detailed visual steps."""
    steps = await build_pipeline_steps(rows_processed)
    await execute_command("""
        INSERT INTO pipeline_runs (
            started_at, finished_at, status, rows_processed, rows_rejected,
            error_message, steps
        )
        VALUES (
            CURRENT_TIMESTAMP - interval '2 minutes 13 seconds',
            CURRENT_TIMESTAMP,
            $1, $2, $3, NULL, $4::jsonb
        )
    """, status, rows_processed, rows_rejected, json.dumps(steps))
