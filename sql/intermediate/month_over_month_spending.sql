-- Month-over-month spending change
WITH monthly AS (
    SELECT
        to_char(transaction_date, 'YYYY-MM') AS month,
        SUM(amount) AS spending
    FROM transactions
    WHERE status = 'completed' AND amount > 0
    GROUP BY to_char(transaction_date, 'YYYY-MM')
)
SELECT
    month,
    spending,
    LAG(spending) OVER (ORDER BY month) AS prev_month_spending,
    spending - LAG(spending) OVER (ORDER BY month) AS change,
    ROUND(
        (spending - LAG(spending) OVER (ORDER BY month))
        / NULLIF(LAG(spending) OVER (ORDER BY month), 0) * 100, 1
    ) AS change_percent
FROM monthly
ORDER BY month;
