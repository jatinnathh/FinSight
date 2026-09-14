"""
Data validation service: quality checks on imported data.
"""

from backend.db.database import execute_query, execute_one


async def run_all_checks() -> list[dict]:
    """Run all data quality checks and return results."""
    checks = []

    # 1. Total row count
    row = await execute_one("SELECT COUNT(*) as cnt FROM transactions")
    checks.append({
        "check_name": "Total Rows",
        "status": "info",
        "details": f"{row['cnt']} transactions in database",
        "affected_rows": row["cnt"],
    })

    # 2. Required columns (not null checks)
    row = await execute_one(
        "SELECT COUNT(*) as cnt FROM transactions WHERE account_id IS NULL OR transaction_date IS NULL OR amount IS NULL"
    )
    checks.append({
        "check_name": "Required columns (account_id, date, amount)",
        "status": "pass" if row["cnt"] == 0 else "fail",
        "details": f"{row['cnt']} rows missing required columns",
        "affected_rows": row["cnt"],
    })

    # 3. Date parsing (future dates)
    row = await execute_one(
        "SELECT COUNT(*) as cnt FROM transactions WHERE transaction_date > CURRENT_DATE"
    )
    checks.append({
        "check_name": "Future transaction dates",
        "status": "pass" if row["cnt"] == 0 else "warn",
        "details": f"{row['cnt']} transactions with future dates",
        "affected_rows": row["cnt"],
    })

    # 4. Duplicate detection
    row = await execute_one("""
        SELECT COUNT(*) as cnt FROM (
            SELECT account_id, merchant_id, transaction_date, amount, currency
            FROM transactions
            GROUP BY account_id, merchant_id, transaction_date, amount, currency
            HAVING COUNT(*) > 1
        ) dupes
    """)
    checks.append({
        "check_name": "Duplicate transactions",
        "status": "pass" if row["cnt"] == 0 else "warn",
        "details": f"{row['cnt']} groups of duplicate transactions",
        "affected_rows": row["cnt"],
    })

    # 5. Missing merchants
    row = await execute_one(
        "SELECT COUNT(*) as cnt FROM transactions WHERE merchant_id IS NULL"
    )
    checks.append({
        "check_name": "Missing merchant",
        "status": "pass" if row["cnt"] == 0 else "warn",
        "details": f"{row['cnt']} transactions with no merchant",
        "affected_rows": row["cnt"],
    })

    # 6. Missing categories
    row = await execute_one("""
        SELECT COUNT(*) as cnt FROM transactions t
        LEFT JOIN merchants m ON t.merchant_id = m.merchant_id
        WHERE m.category_id IS NULL AND t.merchant_id IS NOT NULL
    """)
    checks.append({
        "check_name": "Missing categories",
        "status": "pass" if row["cnt"] == 0 else "warn",
        "details": f"{row['cnt']} transactions with uncategorized merchant",
        "affected_rows": row["cnt"],
    })

    # 7. Invalid currencies
    valid_currencies = {"INR", "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "SGD"}
    rows = await execute_query(
        "SELECT DISTINCT currency FROM transactions"
    )
    invalid = [r["currency"] for r in rows if r["currency"] not in valid_currencies]
    checks.append({
        "check_name": "Unknown currencies",
        "status": "pass" if len(invalid) == 0 else "warn",
        "details": f"Found currencies: {', '.join(invalid)}" if invalid else "All currencies valid",
        "affected_rows": len(invalid),
    })

    # 8. Negative non-refund amounts
    row = await execute_one(
        "SELECT COUNT(*) as cnt FROM transactions WHERE amount < 0 AND transaction_type != 'refund'"
    )
    checks.append({
        "check_name": "Negative non-refund amounts",
        "status": "pass" if row["cnt"] == 0 else "fail",
        "details": f"{row['cnt']} transactions with negative amount that are not refunds",
        "affected_rows": row["cnt"],
    })

    return checks
