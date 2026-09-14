-- Subscription detection: recurring transactions with regular intervals
WITH transaction_intervals AS (
    SELECT
        m.normalized_name AS merchant,
        t.amount,
        t.transaction_date,
        LAG(t.transaction_date) OVER (
            PARTITION BY m.normalized_name
            ORDER BY t.transaction_date
        ) AS prev_date,
        t.transaction_date - LAG(t.transaction_date) OVER (
            PARTITION BY m.normalized_name
            ORDER BY t.transaction_date
        ) AS days_between
    FROM transactions t
    JOIN merchants m ON t.merchant_id = m.merchant_id
    WHERE t.status = 'completed' AND t.amount > 0
),
merchant_patterns AS (
    SELECT
        merchant,
        COUNT(*) AS occurrence_count,
        ROUND(AVG(amount)::numeric, 2) AS avg_amount,
        ROUND(STDDEV(amount)::numeric, 2) AS amount_stddev,
        ROUND(AVG(EXTRACT(EPOCH FROM days_between) / 86400)::numeric, 1) AS avg_days_between,
        ROUND(STDDEV(EXTRACT(EPOCH FROM days_between) / 86400)::numeric, 1) AS days_stddev
    FROM transaction_intervals
    WHERE days_between IS NOT NULL
    GROUP BY merchant
    HAVING COUNT(*) >= 3
)
SELECT
    merchant,
    avg_amount,
    occurrence_count,
    avg_days_between,
    days_stddev,
    CASE
        WHEN avg_days_between BETWEEN 6 AND 8 THEN 'weekly'
        WHEN avg_days_between BETWEEN 13 AND 16 THEN 'biweekly'
        WHEN avg_days_between BETWEEN 25 AND 35 THEN 'monthly'
        WHEN avg_days_between BETWEEN 85 AND 95 THEN 'quarterly'
        WHEN avg_days_between BETWEEN 355 AND 375 THEN 'yearly'
        ELSE 'irregular'
    END AS detected_frequency
FROM merchant_patterns
WHERE days_stddev < 10
ORDER BY avg_amount DESC;
