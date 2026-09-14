-- Customer cohort analysis: group users by first transaction month
WITH first_transaction AS (
    SELECT
        a.user_id,
        MIN(t.transaction_date) AS first_date
    FROM transactions t
    JOIN accounts a ON t.account_id = a.account_id
    WHERE t.status = 'completed'
    GROUP BY a.user_id
),
cohorts AS (
    SELECT
        user_id,
        to_char(first_date, 'YYYY-MM') AS cohort_month
    FROM first_transaction
)
SELECT
    co.cohort_month,
    to_char(t.transaction_date, 'YYYY-MM') AS activity_month,
    COUNT(DISTINCT a.user_id) AS active_users,
    SUM(t.amount) AS total_spending,
    ROUND(AVG(t.amount), 2) AS avg_spending
FROM cohorts co
JOIN accounts a ON co.user_id = a.user_id
JOIN transactions t ON a.account_id = t.account_id
WHERE t.status = 'completed' AND t.amount > 0
GROUP BY co.cohort_month, to_char(t.transaction_date, 'YYYY-MM')
ORDER BY co.cohort_month, activity_month;
