-- Merchant growth: month-over-month transaction count growth per merchant
WITH monthly_merchant AS (
    SELECT
        m.normalized_name AS merchant,
        to_char(t.transaction_date, 'YYYY-MM') AS month,
        COUNT(*) AS transaction_count,
        SUM(t.amount) AS total_amount
    FROM transactions t
    JOIN merchants m ON t.merchant_id = m.merchant_id
    WHERE t.status = 'completed' AND t.amount > 0
    GROUP BY m.normalized_name, to_char(t.transaction_date, 'YYYY-MM')
)
SELECT
    merchant,
    month,
    transaction_count,
    total_amount,
    LAG(transaction_count) OVER (PARTITION BY merchant ORDER BY month) AS prev_count,
    ROUND(
        (transaction_count - LAG(transaction_count) OVER (PARTITION BY merchant ORDER BY month))::numeric
        / NULLIF(LAG(transaction_count) OVER (PARTITION BY merchant ORDER BY month), 0) * 100, 1
    ) AS growth_percent
FROM monthly_merchant
ORDER BY merchant, month;
