"""
CSV ingestion service: parsing, column detection, mapping.
"""

import csv
import io
from datetime import datetime

# FinSight canonical schema
CANONICAL_COLUMNS = [
    "transaction_date", "merchant", "amount", "currency",
    "status", "transaction_type", "description"
]

# Common CSV column aliases
COLUMN_ALIASES = {
    "transaction_date": ["date", "transaction_date", "trans_date", "txn_date", "posting_date", "value_date"],
    "merchant": ["merchant", "description", "merchant_name", "payee", "vendor", "name", "details", "narration", "particulars"],
    "amount": ["amount", "value", "transaction_amount", "txn_amount", "debit", "sum", "total"],
    "currency": ["currency", "currency_code", "ccy", "curr"],
    "status": ["status", "transaction_status", "txn_status", "state"],
    "transaction_type": ["type", "transaction_type", "txn_type", "dr_cr", "debit_credit"],
    "description": ["description", "memo", "note", "remarks", "reference", "details", "narration"],
}

DATE_FORMATS = [
    "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%m-%d-%Y",
    "%d-%b-%Y", "%Y/%m/%d", "%d.%m.%Y", "%b %d, %Y", "%B %d, %Y",
]


def detect_columns(headers: list[str]) -> dict:
    """Auto-detect column mapping from CSV headers to canonical schema."""
    mapping = {}
    headers_lower = [h.strip().lower().replace(" ", "_") for h in headers]

    for canonical, aliases in COLUMN_ALIASES.items():
        for i, header in enumerate(headers_lower):
            if header in aliases:
                mapping[headers[i]] = canonical
                break

    return mapping


def parse_csv_content(content: str) -> dict:
    """Parse CSV content and return headers, sample rows, and stats."""
    reader = csv.reader(io.StringIO(content))
    headers = next(reader)
    headers = [h.strip() for h in headers]

    rows = []
    for row in reader:
        rows.append(row)

    sample = rows[:10]
    total_rows = len(rows)

    # Detect date range
    date_col = None
    mapping = detect_columns(headers)
    for orig, canonical in mapping.items():
        if canonical == "transaction_date":
            date_col = headers.index(orig)
            break

    min_date = None
    max_date = None
    if date_col is not None:
        for row in rows:
            if date_col < len(row):
                parsed = try_parse_date(row[date_col])
                if parsed:
                    if min_date is None or parsed < min_date:
                        min_date = parsed
                    if max_date is None or parsed > max_date:
                        max_date = parsed

    # Detect currencies
    currencies = set()
    currency_col = None
    for orig, canonical in mapping.items():
        if canonical == "currency":
            currency_col = headers.index(orig)
            break
    if currency_col is not None:
        for row in rows:
            if currency_col < len(row) and row[currency_col].strip():
                currencies.add(row[currency_col].strip())

    return {
        "headers": headers,
        "sample": sample,
        "total_rows": total_rows,
        "mapping": mapping,
        "date_range": {
            "min": min_date.isoformat() if min_date else None,
            "max": max_date.isoformat() if max_date else None,
        },
        "currencies": list(currencies),
    }


def try_parse_date(date_str: str):
    """Try parsing a date string in multiple formats."""
    date_str = date_str.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None


def apply_mapping(rows: list, headers: list, mapping: dict) -> list[dict]:
    """Apply column mapping and return list of canonical dicts."""
    # Reverse mapping: original header -> canonical name
    header_to_canonical = {}
    for orig, canonical in mapping.items():
        idx = headers.index(orig) if orig in headers else None
        if idx is not None:
            header_to_canonical[idx] = canonical

    result = []
    for row in rows:
        record = {}
        for idx, canonical in header_to_canonical.items():
            if idx < len(row):
                val = row[idx].strip()
                if canonical == "transaction_date":
                    parsed = try_parse_date(val)
                    record[canonical] = parsed
                elif canonical == "amount":
                    try:
                        record[canonical] = float(val.replace(",", ""))
                    except ValueError:
                        record[canonical] = None
                else:
                    record[canonical] = val if val else None
            else:
                record[canonical] = None
        result.append(record)

    return result
