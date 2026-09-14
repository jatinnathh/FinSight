"""
Data API routes: CSV upload, column mapping, validation, demo data.
"""

import csv
import io
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from backend.services.ingestion import detect_columns, parse_csv_content, apply_mapping, try_parse_date
from backend.services.validation import run_all_checks
from backend.services.pipeline_metadata import record_pipeline_run
from backend.db.database import execute_command, execute_query, execute_one, init_schema, get_pool

router = APIRouter(prefix="/api/v1/data", tags=["data"])


class ColumnMapping(BaseModel):
    mapping: dict[str, str]
    csv_content: str


class ImportRequest(BaseModel):
    mapping: dict[str, str]
    csv_content: str
    account_id: int = 1


@router.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    """Upload a CSV file and detect columns."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files are supported")

    content = await file.read()
    text = content.decode("utf-8")
    result = parse_csv_content(text)

    return {
        "filename": file.filename,
        "headers": result["headers"],
        "sample": result["sample"],
        "total_rows": result["total_rows"],
        "suggested_mapping": result["mapping"],
        "date_range": result["date_range"],
        "currencies": result["currencies"],
    }


@router.post("/validate")
async def validate_mapping(data: ColumnMapping):
    """Validate a column mapping against CSV data."""
    reader = csv.reader(io.StringIO(data.csv_content))
    headers = next(reader)
    rows = list(reader)

    mapped = apply_mapping(rows, headers, data.mapping)

    issues = []
    valid_count = 0
    invalid_dates = 0
    missing_amounts = 0
    missing_merchants = 0

    for record in mapped:
        if record.get("transaction_date") is None:
            invalid_dates += 1
        if record.get("amount") is None:
            missing_amounts += 1
        if not record.get("merchant"):
            missing_merchants += 1
        else:
            valid_count += 1

    if invalid_dates > 0:
        issues.append({"type": "warn", "message": f"{invalid_dates} rows with unparseable dates"})
    if missing_amounts > 0:
        issues.append({"type": "fail", "message": f"{missing_amounts} rows with missing amounts"})
    if missing_merchants > 0:
        issues.append({"type": "warn", "message": f"{missing_merchants} rows with missing merchant"})

    return {
        "total_rows": len(rows),
        "valid_rows": valid_count,
        "issues": issues,
    }


@router.post("/import")
async def import_data(data: ImportRequest):
    """Import mapped CSV data into the database."""
    reader = csv.reader(io.StringIO(data.csv_content))
    headers = next(reader)
    rows = list(reader)

    mapped = apply_mapping(rows, headers, data.mapping)

    inserted = 0
    skipped = 0
    pool = await get_pool()

    async with pool.acquire() as conn:
        for record in mapped:
            if record.get("transaction_date") is None or record.get("amount") is None:
                skipped += 1
                continue

            # Find or create merchant
            merchant_id = None
            if record.get("merchant"):
                m = await conn.fetchrow(
                    "SELECT merchant_id FROM merchants WHERE merchant_name = $1 OR normalized_name = $1 LIMIT 1",
                    record["merchant"]
                )
                if m:
                    merchant_id = m["merchant_id"]
                else:
                    m = await conn.fetchrow(
                        "INSERT INTO merchants (merchant_name, normalized_name) VALUES ($1, $1) RETURNING merchant_id",
                        record["merchant"]
                    )
                    merchant_id = m["merchant_id"]

            await conn.execute(
                """INSERT INTO transactions
                   (account_id, merchant_id, transaction_date, amount, currency, status, transaction_type, description)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)""",
                data.account_id,
                merchant_id,
                record["transaction_date"],
                record["amount"],
                record.get("currency", "INR"),
                record.get("status", "completed"),
                record.get("transaction_type", "debit"),
                record.get("description", record.get("merchant", "")),
            )
            inserted += 1

    await record_pipeline_run(inserted + skipped, skipped, "success")

    return {"inserted": inserted, "skipped": skipped}


@router.post("/load-demo")
async def load_demo():
    """Load demo dataset (generates and seeds data)."""
    import subprocess
    import sys
    import os

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    # Use the venv Python — sys.executable may point to anaconda under uvicorn reloader
    venv_python = os.path.join(base_dir, "venv", "Scripts", "python.exe")
    python_exe = venv_python if os.path.exists(venv_python) else sys.executable

    # Generate data
    gen_script = os.path.join(base_dir, "data_generator", "generate_data.py")
    result = subprocess.run([python_exe, gen_script], capture_output=True, text=True, cwd=base_dir)
    if result.returncode != 0:
        raise HTTPException(500, f"Data generation failed: {result.stderr}")

    # Seed data
    seed_script = os.path.join(base_dir, "data_generator", "seed_data.py")
    result = subprocess.run([python_exe, seed_script], capture_output=True, text=True, cwd=base_dir)
    if result.returncode != 0:
        raise HTTPException(500, f"Data seeding failed: {result.stderr}")

    count = await execute_one("SELECT COUNT(*) as cnt FROM transactions")
    await record_pipeline_run(count["cnt"], 0, "success")

    return {
        "status": "success",
        "message": "Demo data loaded successfully",
        "total_transactions": count["cnt"],
    }


@router.get("/quality")
async def data_quality():
    """Run data quality checks."""
    checks = await run_all_checks()
    return {"checks": checks}


QUALITY_DETAIL_QUERIES = {
    "Required columns (account_id, date, amount)": {
        "sql": """
SELECT transaction_id, account_id, transaction_date, amount
FROM transactions
WHERE account_id IS NULL OR transaction_date IS NULL OR amount IS NULL
LIMIT 25;
""",
        "query": """
            SELECT transaction_id, account_id, transaction_date, amount
            FROM transactions
            WHERE account_id IS NULL OR transaction_date IS NULL OR amount IS NULL
            LIMIT 25
        """,
    },
    "Future transaction dates": {
        "sql": """
SELECT transaction_id, transaction_date, amount, currency, status
FROM transactions
WHERE transaction_date > CURRENT_DATE
ORDER BY transaction_date DESC
LIMIT 25;
""",
        "query": """
            SELECT transaction_id, transaction_date, amount, currency, status
            FROM transactions
            WHERE transaction_date > CURRENT_DATE
            ORDER BY transaction_date DESC
            LIMIT 25
        """,
    },
    "Duplicate transactions": {
        "sql": """
SELECT account_id, merchant_id, transaction_date, amount, currency, COUNT(*) AS duplicate_count
FROM transactions
GROUP BY account_id, merchant_id, transaction_date, amount, currency
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 25;
""",
        "query": """
            SELECT account_id, merchant_id, transaction_date, amount, currency, COUNT(*) AS duplicate_count
            FROM transactions
            GROUP BY account_id, merchant_id, transaction_date, amount, currency
            HAVING COUNT(*) > 1
            ORDER BY duplicate_count DESC
            LIMIT 25
        """,
    },
    "Missing merchant": {
        "sql": """
SELECT transaction_id, transaction_date, amount, currency, description
FROM transactions
WHERE merchant_id IS NULL
ORDER BY transaction_date DESC
LIMIT 25;
""",
        "query": """
            SELECT transaction_id, transaction_date, amount, currency, description
            FROM transactions
            WHERE merchant_id IS NULL
            ORDER BY transaction_date DESC
            LIMIT 25
        """,
    },
    "Missing categories": {
        "sql": """
SELECT t.transaction_id, COALESCE(m.normalized_name, t.description) AS merchant, c.category_name AS category
FROM transactions t
LEFT JOIN merchants m ON t.merchant_id = m.merchant_id
LEFT JOIN categories c ON m.category_id = c.category_id
WHERE m.category_id IS NULL AND t.merchant_id IS NOT NULL
LIMIT 25;
""",
        "query": """
            SELECT t.transaction_id, COALESCE(m.normalized_name, t.description) AS merchant,
                   c.category_name AS category
            FROM transactions t
            LEFT JOIN merchants m ON t.merchant_id = m.merchant_id
            LEFT JOIN categories c ON m.category_id = c.category_id
            WHERE m.category_id IS NULL AND t.merchant_id IS NOT NULL
            LIMIT 25
        """,
    },
    "Unknown currencies": {
        "sql": """
SELECT transaction_id, transaction_date, amount, currency, status
FROM transactions
WHERE currency NOT IN ('INR', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'SGD')
ORDER BY transaction_date DESC
LIMIT 25;
""",
        "query": """
            SELECT transaction_id, transaction_date, amount, currency, status
            FROM transactions
            WHERE currency NOT IN ('INR', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'SGD')
            ORDER BY transaction_date DESC
            LIMIT 25
        """,
    },
    "Negative non-refund amounts": {
        "sql": """
SELECT transaction_id, transaction_date, amount, currency, transaction_type
FROM transactions
WHERE amount < 0 AND transaction_type != 'refund'
ORDER BY transaction_date DESC
LIMIT 25;
""",
        "query": """
            SELECT transaction_id, transaction_date, amount, currency, transaction_type
            FROM transactions
            WHERE amount < 0 AND transaction_type != 'refund'
            ORDER BY transaction_date DESC
            LIMIT 25
        """,
    },
}


@router.get("/quality/detail")
async def data_quality_detail(check_name: str):
    """Return sample affected records and SQL for a known quality check."""
    detail = QUALITY_DETAIL_QUERIES.get(check_name)
    if not detail:
        return {"check_name": check_name, "sql": None, "records": []}

    rows = await execute_query(detail["query"])
    records = []
    for row in rows:
        record = {}
        for key, value in dict(row).items():
            if hasattr(value, "isoformat"):
                record[key] = value.isoformat()
            elif not isinstance(value, (str, int, float, bool, type(None))):
                record[key] = str(value)
            else:
                record[key] = value
        records.append(record)

    return {
        "check_name": check_name,
        "sql": detail["sql"].strip(),
        "records": records,
    }
