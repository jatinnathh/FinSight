-- Rolling 30-day spending per user
SELECT
    a.user_id,
    t.transaction_date,
    t.amount,
    SUM(t.amount) OVER (
        PARTITION BY a.user_id
        ORDER BY t.transaction_date
        RANGE BETWEEN INTERVAL '30 days' PRECEDING AND CURRENT ROW
    ) AS rolling_30day_spending
FROM transactions t
JOIN accounts a ON t.account_id = a.account_id
WHERE t.status = 'completed' AND t.amount > 0
ORDER BY a.user_id, t.transaction_date
LIMIT 100;
