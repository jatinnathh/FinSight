-- Total spending across all accounts
SELECT
    SUM(amount) AS total_spending,
    COUNT(*) AS transaction_count,
    ROUND(AVG(amount), 2) AS average_amount
FROM transactions
WHERE status = 'completed'
  AND amount > 0;
