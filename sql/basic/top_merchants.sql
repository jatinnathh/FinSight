-- Top merchants by total spending
SELECT
    m.normalized_name AS merchant,
    SUM(t.amount) AS total_spending,
    COUNT(*) AS transaction_count,
    ROUND(AVG(t.amount), 2) AS avg_amount,
    MIN(t.transaction_date) AS first_transaction,
    MAX(t.transaction_date) AS last_transaction
FROM transactions t
JOIN merchants m ON t.merchant_id = m.merchant_id
WHERE t.status = 'completed'
  AND t.amount > 0
GROUP BY m.normalized_name
ORDER BY total_spending DESC
LIMIT 20;
