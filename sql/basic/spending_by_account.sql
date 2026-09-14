-- Spending by account
SELECT
    a.account_id,
    a.account_type,
    a.institution,
    a.currency,
    SUM(t.amount) AS total_spending,
    COUNT(*) AS transaction_count
FROM accounts a
JOIN transactions t ON a.account_id = t.account_id
WHERE t.status = 'completed'
  AND t.amount > 0
GROUP BY a.account_id, a.account_type, a.institution, a.currency
ORDER BY total_spending DESC;
