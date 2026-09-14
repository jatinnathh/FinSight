-- Category spending changes: detect significant category shifts
WITH monthly_category AS (
    SELECT
        to_char(t.transaction_date, 'YYYY-MM') AS month,
        c.category_name,
        SUM(t.amount) AS spending
    FROM transactions t
    JOIN merchants m ON t.merchant_id = m.merchant_id
    JOIN categories c ON m.category_id = c.category_id
    WHERE t.status = 'completed' AND t.amount > 0
    GROUP BY to_char(t.transaction_date, 'YYYY-MM'), c.category_name
)
SELECT
    month,
    category_name,
    spending,
    LAG(spending) OVER (PARTITION BY category_name ORDER BY month) AS prev_spending,
    spending - LAG(spending) OVER (PARTITION BY category_name ORDER BY month) AS change,
    ROUND(
        (spending - LAG(spending) OVER (PARTITION BY category_name ORDER BY month))
        / NULLIF(LAG(spending) OVER (PARTITION BY category_name ORDER BY month), 0) * 100, 1
    ) AS change_percent
FROM monthly_category
ORDER BY month DESC, ABS(spending - COALESCE(LAG(spending) OVER (PARTITION BY category_name ORDER BY month), spending)) DESC;
