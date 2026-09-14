-- Transaction count by status
SELECT
    status,
    COUNT(*) AS count,
    SUM(amount) AS total_amount,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM transactions
GROUP BY status
ORDER BY count DESC;
