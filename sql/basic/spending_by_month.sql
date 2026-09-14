-- Monthly spending trend
SELECT
    to_char(transaction_date, 'YYYY-MM') AS month,
    SUM(amount) AS total_spending,
    COUNT(*) AS transaction_count,
    ROUND(AVG(amount), 2) AS avg_amount
FROM transactions
WHERE status = 'completed'
  AND amount > 0
GROUP BY to_char(transaction_date, 'YYYY-MM')
ORDER BY month;
