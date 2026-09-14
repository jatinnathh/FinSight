"""
Analytics service: dashboard queries, spending analysis, subscription detection.
"""

from backend.db.database import execute_query, execute_one


async def get_overview():
    """Dashboard overview metrics."""
    # Check if any data exists at all
    all_time = await execute_one("SELECT COUNT(*) as cnt FROM transactions")

    # Find the latest month that has data (may not be current month for uploaded CSVs)
    latest_month = await execute_one("""
        SELECT date_trunc('month', MAX(transaction_date)) as latest
        FROM transactions
        WHERE status = 'completed'
    """)

    # Use the latest month with data, or current month as fallback
    if latest_month and latest_month["latest"]:
        report_month_sql = f"'{latest_month['latest'].isoformat()}'::date"
    else:
        report_month_sql = "date_trunc('month', CURRENT_DATE)"

    total = await execute_one(f"""
        SELECT
            COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_spending,
            COUNT(*) as total_transactions,
            COALESCE(AVG(CASE WHEN amount > 0 THEN amount END), 0) as avg_transaction
        FROM transactions
        WHERE status = 'completed'
          AND transaction_date >= {report_month_sql}
    """)

    prev_month = await execute_one(f"""
        SELECT COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_spending
        FROM transactions
        WHERE status = 'completed'
          AND transaction_date >= {report_month_sql} - interval '1 month'
          AND transaction_date < {report_month_sql}
    """)

    sub_total = await execute_one("""
        SELECT COALESCE(SUM(amount), 0) as total
        FROM subscriptions
    """)

    current_spending = float(total["total_spending"])
    prev_spending = float(prev_month["total_spending"])
    change_pct = 0
    if prev_spending > 0:
        change_pct = round(((current_spending - prev_spending) / prev_spending) * 100, 1)

    return {
        "total_spending": round(current_spending, 2),
        "total_transactions": total["total_transactions"],
        "all_time_transactions": all_time["cnt"],
        "avg_transaction": round(float(total["avg_transaction"]), 2),
        "prev_month_spending": round(prev_spending, 2),
        "change_percent": change_pct,
        "subscription_total": round(float(sub_total["total"]), 2),
    }


async def get_spending_over_time(months: int = 12):
    """Monthly spending trend."""
    rows = await execute_query("""
        SELECT
            to_char(transaction_date, 'YYYY-MM') as month,
            SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as spending
        FROM transactions
        WHERE status = 'completed'
          AND transaction_date >= COALESCE(
              (SELECT MAX(transaction_date) FROM transactions) - make_interval(months => $1),
              CURRENT_DATE - make_interval(months => $1)
          )
        GROUP BY to_char(transaction_date, 'YYYY-MM')
        ORDER BY month
    """, months)
    return [{"month": r["month"], "spending": round(float(r["spending"]), 2)} for r in rows]


async def get_top_categories(limit: int = 10):
    """Top spending categories."""
    rows = await execute_query("""
        SELECT
            COALESCE(c.category_name, 'Uncategorized') as category,
            SUM(t.amount) as total,
            COUNT(*) as count
        FROM transactions t
        LEFT JOIN merchants m ON t.merchant_id = m.merchant_id
        LEFT JOIN categories c ON m.category_id = c.category_id
        WHERE t.status = 'completed' AND t.amount > 0
        GROUP BY c.category_name
        ORDER BY total DESC
        LIMIT $1
    """, limit)
    return [{"category": r["category"], "total": round(float(r["total"]), 2), "count": r["count"]} for r in rows]


async def get_top_merchants(limit: int = 10):
    """Top merchants by spending."""
    rows = await execute_query("""
        SELECT
            COALESCE(m.normalized_name, t.description, 'Unknown') as merchant,
            SUM(t.amount) as total,
            COUNT(*) as count
        FROM transactions t
        LEFT JOIN merchants m ON t.merchant_id = m.merchant_id
        WHERE t.status = 'completed' AND t.amount > 0
        GROUP BY COALESCE(m.normalized_name, t.description, 'Unknown')
        ORDER BY total DESC
        LIMIT $1
    """, limit)
    return [{"merchant": r["merchant"], "total": round(float(r["total"]), 2), "count": r["count"]} for r in rows]


async def get_transactions(
    page: int = 1,
    per_page: int = 50,
    search: str = None,
    category: str = None,
    status: str = None,
    sort_by: str = "transaction_date",
    sort_order: str = "desc"
):
    """Paginated transaction list with search/filter."""
    allowed_sorts = {"transaction_date", "amount", "merchant", "status"}
    if sort_by not in allowed_sorts:
        sort_by = "transaction_date"
    if sort_order not in ("asc", "desc"):
        sort_order = "desc"

    conditions = []
    params = []
    idx = 1

    if search:
        conditions.append(f"(m.normalized_name ILIKE ${idx} OR t.description ILIKE ${idx})")
        params.append(f"%{search}%")
        idx += 1

    if category:
        conditions.append(f"c.category_name = ${idx}")
        params.append(category)
        idx += 1

    if status:
        conditions.append(f"t.status = ${idx}")
        params.append(status)
        idx += 1

    where = "WHERE " + " AND ".join(conditions) if conditions else ""

    sort_col = {
        "transaction_date": "t.transaction_date",
        "amount": "t.amount",
        "merchant": "m.normalized_name",
        "status": "t.status",
    }.get(sort_by, "t.transaction_date")

    offset = (page - 1) * per_page
    params.extend([per_page, offset])

    rows = await execute_query(f"""
        SELECT
            t.transaction_id,
            t.transaction_date,
            COALESCE(m.normalized_name, t.description, 'Unknown') as merchant,
            COALESCE(c.category_name, 'Uncategorized') as category,
            t.amount,
            t.currency,
            t.status,
            t.transaction_type
        FROM transactions t
        LEFT JOIN merchants m ON t.merchant_id = m.merchant_id
        LEFT JOIN categories c ON m.category_id = c.category_id
        {where}
        ORDER BY {sort_col} {sort_order}
        LIMIT ${idx} OFFSET ${idx + 1}
    """, *params)

    count_row = await execute_one(f"""
        SELECT COUNT(*) as cnt
        FROM transactions t
        LEFT JOIN merchants m ON t.merchant_id = m.merchant_id
        LEFT JOIN categories c ON m.category_id = c.category_id
        {where}
    """, *params[:-2])

    return {
        "transactions": [
            {
                "id": r["transaction_id"],
                "date": r["transaction_date"].isoformat() if r["transaction_date"] else None,
                "merchant": r["merchant"],
                "category": r["category"],
                "amount": float(r["amount"]),
                "currency": r["currency"],
                "status": r["status"],
                "type": r["transaction_type"],
            }
            for r in rows
        ],
        "total": count_row["cnt"],
        "page": page,
        "per_page": per_page,
        "total_pages": (count_row["cnt"] + per_page - 1) // per_page,
    }


async def detect_subscriptions():
    """Detect recurring transactions (same merchant, similar amount, regular intervals)."""
    rows = await execute_query("""
        WITH recurring AS (
            SELECT
                COALESCE(m.normalized_name, t.description) as merchant,
                ROUND(AVG(t.amount)::numeric, 2) as avg_amount,
                COUNT(*) as occurrences,
                MIN(t.transaction_date) as first_seen,
                MAX(t.transaction_date) as last_seen,
                ROUND(
                    EXTRACT(EPOCH FROM (MAX(t.transaction_date) - MIN(t.transaction_date)))
                    / NULLIF(COUNT(*) - 1, 0) / 86400
                ) as avg_days_between
            FROM transactions t
            LEFT JOIN merchants m ON t.merchant_id = m.merchant_id
            WHERE t.status = 'completed' AND t.amount > 0
            GROUP BY COALESCE(m.normalized_name, t.description)
            HAVING COUNT(*) >= 3
        )
        SELECT *
        FROM recurring
        WHERE avg_days_between BETWEEN 25 AND 35
           OR avg_days_between BETWEEN 355 AND 375
           OR avg_days_between BETWEEN 6 AND 8
        ORDER BY avg_amount DESC
    """)

    subscriptions = []
    for r in rows:
        days = float(r["avg_days_between"]) if r["avg_days_between"] else 30
        if days <= 10:
            frequency = "weekly"
        elif days <= 40:
            frequency = "monthly"
        else:
            frequency = "yearly"

        subscriptions.append({
            "merchant": r["merchant"],
            "amount": float(r["avg_amount"]),
            "frequency": frequency,
            "occurrences": r["occurrences"],
            "first_seen": r["first_seen"].isoformat() if r["first_seen"] else None,
            "last_seen": r["last_seen"].isoformat() if r["last_seen"] else None,
        })

    monthly_total = sum(
        s["amount"] if s["frequency"] == "monthly"
        else s["amount"] * 4 if s["frequency"] == "weekly"
        else s["amount"] / 12
        for s in subscriptions
    )

    return {
        "subscriptions": subscriptions,
        "monthly_total": round(monthly_total, 2),
        "yearly_total": round(monthly_total * 12, 2),
    }


async def get_budgets(user_id: int = 1):
    """Get budgets with current spending."""
    rows = await execute_query("""
        SELECT
            b.budget_id,
            c.category_name,
            b.monthly_limit,
            COALESCE(SUM(
                CASE WHEN t.transaction_date >= date_trunc('month', CURRENT_DATE)
                     AND t.status = 'completed' AND t.amount > 0
                THEN t.amount ELSE 0 END
            ), 0) as current_spending
        FROM budgets b
        JOIN categories c ON b.category_id = c.category_id
        LEFT JOIN merchants m ON m.category_id = c.category_id
        LEFT JOIN transactions t ON t.merchant_id = m.merchant_id
        WHERE b.user_id = $1
        GROUP BY b.budget_id, c.category_name, b.monthly_limit
        ORDER BY c.category_name
    """, user_id)

    return [
        {
            "budget_id": r["budget_id"],
            "category": r["category_name"],
            "monthly_limit": float(r["monthly_limit"]),
            "current_spending": round(float(r["current_spending"]), 2),
            "percent_used": round(float(r["current_spending"]) / float(r["monthly_limit"]) * 100, 1) if float(r["monthly_limit"]) > 0 else 0,
        }
        for r in rows
    ]


async def get_spending_by_category_monthly():
    """Category spending over time for analytics page."""
    rows = await execute_query("""
        SELECT
            to_char(t.transaction_date, 'YYYY-MM') as month,
            COALESCE(c.category_name, 'Uncategorized') as category,
            SUM(t.amount) as total
        FROM transactions t
        LEFT JOIN merchants m ON t.merchant_id = m.merchant_id
        LEFT JOIN categories c ON m.category_id = c.category_id
        WHERE t.status = 'completed' AND t.amount > 0
          AND t.transaction_date >= COALESCE(
              (SELECT MAX(transaction_date) FROM transactions) - interval '12 months',
              CURRENT_DATE - interval '12 months'
          )
        GROUP BY to_char(t.transaction_date, 'YYYY-MM'), c.category_name
        ORDER BY month, total DESC
    """)
    return [{"month": r["month"], "category": r["category"], "total": round(float(r["total"]), 2)} for r in rows]


async def get_data_detective():
    """Data Detective: anomaly investigation."""
    # Find latest month with data
    latest = await execute_one("""
        SELECT COALESCE(date_trunc('month', MAX(transaction_date)), date_trunc('month', CURRENT_DATE)) as m
        FROM transactions WHERE status = 'completed'
    """)
    latest_month = latest["m"]

    # Current (latest) vs previous month spending
    current = await execute_one("""
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE status = 'completed' AND amount > 0
          AND transaction_date >= $1
    """, latest_month)
    previous = await execute_one("""
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE status = 'completed' AND amount > 0
          AND transaction_date >= $1 - interval '1 month'
          AND transaction_date < $1
    """, latest_month)

    current_val = float(current["total"])
    prev_val = float(previous["total"])
    change_pct = round(((current_val - prev_val) / prev_val) * 100, 1) if prev_val > 0 else 0

    # Investigate anomalies
    dupes = await execute_one("""
        SELECT COUNT(*) as cnt FROM (
            SELECT account_id, merchant_id, transaction_date, amount
            FROM transactions
            GROUP BY account_id, merchant_id, transaction_date, amount
            HAVING COUNT(*) > 1
        ) d
    """)

    missing = await execute_one(
        "SELECT COUNT(*) as cnt FROM transactions WHERE merchant_id IS NULL"
    )

    refunds = await execute_one(
        "SELECT COUNT(*) as cnt FROM transactions WHERE transaction_type = 'refund'"
    )

    bad_currency = await execute_one("""
        SELECT COUNT(*) as cnt FROM transactions
        WHERE currency NOT IN ('INR', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'SGD')
    """)

    return {
        "current_month_spending": round(current_val, 2),
        "previous_month_spending": round(prev_val, 2),
        "change_percent": change_pct,
        "anomalies": {
            "duplicate_transactions": dupes["cnt"],
            "missing_merchants": missing["cnt"],
            "refunds": refunds["cnt"],
            "currency_anomalies": bad_currency["cnt"],
        },
    }
