-- Spending anomalies: transactions that deviate significantly from average
WITH stats AS (
    SELECT
        m.normalized_name AS merchant,
        AVG(t.amount) AS avg_amount,
        STDDEV(t.amount) AS stddev_amount
    FROM transactions t
    JOIN merchants m ON t.merchant_id = m.merchant_id
    WHERE t.status = 'completed' AND t.amount > 0
    GROUP BY m.normalized_name
    HAVING COUNT(*) >= 5
)
SELECT
    t.transaction_id,
    t.transaction_date,
    m.normalized_name AS merchant,
    t.amount,
    ROUND(s.avg_amount::numeric, 2) AS merchant_avg,
    ROUND(s.stddev_amount::numeric, 2) AS merchant_stddev,
    ROUND(((t.amount - s.avg_amount) / NULLIF(s.stddev_amount, 0))::numeric, 2) AS z_score
FROM transactions t
JOIN merchants m ON t.merchant_id = m.merchant_id
JOIN stats s ON m.normalized_name = s.merchant
WHERE t.status = 'completed'
  AND t.amount > 0
  AND ABS(t.amount - s.avg_amount) > 2 * s.stddev_amount
ORDER BY ABS(t.amount - s.avg_amount) DESC
LIMIT 50;
