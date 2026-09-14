-- Running spending total
SELECT
    transaction_date,
    amount,
    SUM(amount) OVER (
        ORDER BY transaction_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM transactions
WHERE status = 'completed' AND amount > 0
ORDER BY transaction_date
LIMIT 100;
