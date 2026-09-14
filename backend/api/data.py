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

    # Required fields: transaction_date and amount
    # Optional fields: merchant, currency, status, transaction_type, description
    REQUIRED_FIELDS = ["transaction_date", "amount"]
    OPTIONAL_FIELDS = ["merchant", "currency", "status", "transaction_type", "description"]

    errors = []
    warnings = []
    valid_count = 0
    invalid_count = 0
    invalid_dates = 0
    missing_amounts = 0

    # Track missing optional fields
    optional_missing_counts: dict[str, int] = {f: 0 for f in OPTIONAL_FIELDS}

    # Detect which canonical fields are mapped
    mapped_canonical = set(data.mapping.values()) - {"(skip)"}
    missing_optional_fields = [f for f in OPTIONAL_FIELDS if f not in mapped_canonical]

    # Duplicate detection: count rows with identical required+optional values
    seen: dict[tuple, int] = {}

    for record in mapped:
        has_valid_date = record.get("transaction_date") is not None
        has_valid_amount = record.get("amount") is not None

        if not has_valid_date:
            invalid_dates += 1
        if not has_valid_amount:
            missing_amounts += 1

        # A row is VALID when both required fields are present and parseable
        if has_valid_date and has_valid_amount:
            valid_count += 1
        else:
            invalid_count += 1

        # Track missing optional fields per row
        for field in OPTIONAL_FIELDS:
            if not record.get(field):
                optional_missing_counts[field] += 1

        # Duplicate detection key
        key = (
            str(record.get("transaction_date")),
            str(record.get("amount")),
            record.get("merchant", ""),
            record.get("currency", ""),
            record.get("transaction_type", ""),
        )
        seen[key] = seen.get(key, 0) + 1

    duplicate_count = sum(count - 1 for count in seen.values() if count > 1)

    # Build errors (required field issues)
    if invalid_dates > 0:
        errors.append({"type": "error", "message": f"{invalid_dates} row(s) with unparseable or missing dates"})
    if missing_amounts > 0:
        errors.append({"type": "error", "message": f"{missing_amounts} row(s) with missing or invalid amounts"})

    # Build warnings (optional field issues)
    if missing_optional_fields:
        warnings.append({
            "type": "warn",
            "message": f"Unmapped optional columns: {', '.join(missing_optional_fields)}"
        })
    for field in OPTIONAL_FIELDS:
        if field not in missing_optional_fields and optional_missing_counts[field] > 0:
            warnings.append({
                "type": "warn",
                "message": f"{optional_missing_counts[field]} row(s) with missing {field}"
            })
    if duplicate_count > 0:
        warnings.append({"type": "warn", "message": f"{duplicate_count} potential duplicate row(s)"})

    # Backwards-compatible: merge into issues list for frontend
    issues = errors + warnings

    return {
        "total_rows": len(rows),
        "valid_rows": valid_count,
        "invalid_rows": invalid_count,
        "errors": errors,
        "warnings": warnings,
        "missing_optional_fields": missing_optional_fields,
        "duplicate_count": duplicate_count,
        "issues": issues,
    }


@router.post("/import")
async def import_data(data: ImportRequest):
    """Import mapped CSV data into the database."""
    import decimal
    import traceback

    try:
        reader = csv.reader(io.StringIO(data.csv_content))
        headers = next(reader)
        rows = list(reader)

        mapped = apply_mapping(rows, headers, data.mapping)

        # Pre-process: separate valid rows from invalid
        valid_records = []
        skipped = 0

        for record in mapped:
            if record.get("transaction_date") is None or record.get("amount") is None:
                skipped += 1
                continue
            valid_records.append(record)

        if not valid_records:
            return {"inserted": 0, "skipped": skipped, "errors": []}

        pool = await get_pool()
        inserted = 0
        errors = []

        async with pool.acquire() as conn:
            # Step 1: Batch-resolve merchants
            unique_merchants = set()
            for rec in valid_records:
                m = rec.get("merchant")
                if m:
                    unique_merchants.add(m)

            merchant_map: dict[str, int] = {}

            if unique_merchants:
                merchant_list = list(unique_merchants)
                existing = await conn.fetch(
                    "SELECT merchant_id, merchant_name, normalized_name FROM merchants WHERE merchant_name = ANY($1) OR normalized_name = ANY($1)",
                    merchant_list
                )
                for row in existing:
                    merchant_map[row["merchant_name"]] = row["merchant_id"]
                    if row["normalized_name"]:
                        merchant_map[row["normalized_name"]] = row["merchant_id"]

                missing = [m for m in merchant_list if m not in merchant_map]
                for m_name in missing:
                    row = await conn.fetchrow(
                        "INSERT INTO merchants (merchant_name, normalized_name) VALUES ($1, $1) RETURNING merchant_id",
                        m_name
                    )
                    merchant_map[m_name] = row["merchant_id"]

            # Step 2: Build insert tuples
            insert_tuples = []
            for rec in valid_records:
                merchant_name = rec.get("merchant")
                merchant_id = merchant_map.get(merchant_name) if merchant_name else None
                currency = rec.get("currency") or "INR"
                status = rec.get("status") or "completed"
                txn_type = rec.get("transaction_type") or "debit"
                description = rec.get("description") or merchant_name or ""

                insert_tuples.append((
                    data.account_id,
                    merchant_id,
                    rec["transaction_date"],
                    decimal.Decimal(str(rec["amount"])),
                    currency,
                    status,
                    txn_type,
                    description,
                ))

            # Step 3: Batch insert
            try:
                await conn.executemany(
                    """INSERT INTO transactions
                       (account_id, merchant_id, transaction_date, amount, currency, status, transaction_type, description)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)""",
                    insert_tuples
                )
                inserted = len(insert_tuples)
            except Exception as e:
                errors.append({"row": 0, "error": str(e)})
                # Fallback: row-by-row
                for i, tup in enumerate(insert_tuples):
                    try:
                        await conn.execute(
                            """INSERT INTO transactions
                               (account_id, merchant_id, transaction_date, amount, currency, status, transaction_type, description)
                               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)""",
                            *tup
                        )
                        inserted += 1
                    except Exception as row_err:
                        skipped += 1
                        if len(errors) < 20:
                            errors.append({"row": i + 1, "error": str(row_err)})

        await record_pipeline_run(inserted + skipped, skipped, "success" if inserted > 0 else "failed")

        return {"inserted": inserted, "skipped": skipped, "errors": errors}

    except Exception as e:
        tb = traceback.format_exc()
        print(f"IMPORT ERROR: {tb}")
        raise HTTPException(500, detail=f"Import failed: {str(e)}")


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


class IncidentRequest(BaseModel):
    incident_type: str  # duplicates, missing_categories, invalid_currencies, future_dates, negative_amounts


@router.post("/inject-incident")
async def inject_incident(data: IncidentRequest):
    """Inject a data quality incident for the Break Pipeline feature."""
    pool = await get_pool()
    injected = 0

    async with pool.acquire() as conn:
        if data.incident_type == "duplicates":
            # Copy 500 random existing rows with a tag
            await conn.execute("""
                INSERT INTO transactions (account_id, merchant_id, transaction_date, amount, currency, status, transaction_type, description)
                SELECT account_id, merchant_id, transaction_date, amount, currency, status, transaction_type,
                       '__INJECTED_DUPLICATE__'
                FROM transactions
                ORDER BY RANDOM()
                LIMIT 500
            """)
            injected = 500

        elif data.incident_type == "invalid_currencies":
            # Insert 200 rows with bad currency codes
            await conn.execute("""
                INSERT INTO transactions (account_id, merchant_id, transaction_date, amount, currency, status, transaction_type, description)
                SELECT account_id, merchant_id, transaction_date, amount,
                       (ARRAY['XYZ', 'ABC', '123'])[1 + floor(random()*3)::int],
                       status, transaction_type, '__INJECTED_CURRENCY__'
                FROM transactions
                WHERE status = 'completed'
                ORDER BY RANDOM()
                LIMIT 200
            """)
            injected = 200

        elif data.incident_type == "future_dates":
            # Insert 150 rows with dates in 2028
            await conn.execute("""
                INSERT INTO transactions (account_id, merchant_id, transaction_date, amount, currency, status, transaction_type, description)
                SELECT account_id, merchant_id,
                       CURRENT_DATE + (30 + floor(random()*365))::int,
                       amount, currency, status, transaction_type, '__INJECTED_FUTURE__'
                FROM transactions
                WHERE status = 'completed'
                ORDER BY RANDOM()
                LIMIT 150
            """)
            injected = 150

        elif data.incident_type == "negative_amounts":
            # Insert 100 debit rows with negative amounts
            await conn.execute("""
                INSERT INTO transactions (account_id, merchant_id, transaction_date, amount, currency, status, transaction_type, description)
                SELECT account_id, merchant_id, transaction_date,
                       -ABS(amount), currency, status, 'debit', '__INJECTED_NEGATIVE__'
                FROM transactions
                WHERE status = 'completed' AND amount > 0
                ORDER BY RANDOM()
                LIMIT 100
            """)
            injected = 100

        elif data.incident_type == "missing_categories":
            # Insert 300 rows with NULL merchant_id
            await conn.execute("""
                INSERT INTO transactions (account_id, merchant_id, transaction_date, amount, currency, status, transaction_type, description)
                SELECT account_id, NULL, transaction_date, amount, currency, status, transaction_type, '__INJECTED_NOCATEGORY__'
                FROM transactions
                WHERE status = 'completed'
                ORDER BY RANDOM()
                LIMIT 300
            """)
            injected = 300

        else:
            raise HTTPException(400, f"Unknown incident type: {data.incident_type}")

    return {"injected": injected, "incident_type": data.incident_type}


@router.post("/fix-incident")
async def fix_incident(data: IncidentRequest):
    """Remove injected incident records and restore pipeline health."""
    pool = await get_pool()

    tag_map = {
        "duplicates": "__INJECTED_DUPLICATE__",
        "invalid_currencies": "__INJECTED_CURRENCY__",
        "future_dates": "__INJECTED_FUTURE__",
        "negative_amounts": "__INJECTED_NEGATIVE__",
        "missing_categories": "__INJECTED_NOCATEGORY__",
    }

    tag = tag_map.get(data.incident_type)
    if not tag:
        raise HTTPException(400, f"Unknown incident type: {data.incident_type}")

    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM transactions WHERE description = $1", tag
        )

    removed = int(result.split()[-1]) if result else 0
    checks = await run_all_checks()

    return {
        "removed": removed,
        "incident_type": data.incident_type,
        "quality_checks": checks,
    }


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
