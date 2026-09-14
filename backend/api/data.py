"""
Data API routes: CSV upload, column mapping, validation, demo data.
"""

import csv
import io
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from backend.services.ingestion import detect_columns, parse_csv_content, apply_mapping, try_parse_date
from backend.services.validation import run_all_checks
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

    return {"inserted": inserted, "skipped": skipped}


@router.post("/load-demo")
async def load_demo():
    """Load demo dataset (generates and seeds data)."""
    import subprocess
    import sys
    import os

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    # Generate data
    gen_script = os.path.join(base_dir, "data_generator", "generate_data.py")
    result = subprocess.run([sys.executable, gen_script], capture_output=True, text=True, cwd=base_dir)
    if result.returncode != 0:
        raise HTTPException(500, f"Data generation failed: {result.stderr}")

    # Seed data
    seed_script = os.path.join(base_dir, "data_generator", "seed_data.py")
    result = subprocess.run([sys.executable, seed_script], capture_output=True, text=True, cwd=base_dir)
    if result.returncode != 0:
        raise HTTPException(500, f"Data seeding failed: {result.stderr}")

    count = await execute_one("SELECT COUNT(*) as cnt FROM transactions")

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
