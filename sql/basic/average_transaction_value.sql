-- Average transaction value by account type
SELECT
    a.account_type,
    COUNT(t.*) AS transaction_count,
    ROUND(AVG(t.amount), 2) AS avg_amount,
    MIN(t.amount) AS min_amount,
    MAX(t.amount) AS max_amount
FROM transactions t
JOIN accounts a ON t.account_id = a.account_id
WHERE t.status = 'completed'
  AND t.amount > 0
GROUP BY a.account_type
ORDER BY avg_amount DESC;
