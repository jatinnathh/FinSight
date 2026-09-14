-- Top 5 merchants per category
WITH ranked AS (
    SELECT
        c.category_name,
        m.normalized_name AS merchant,
        SUM(t.amount) AS total_spending,
        ROW_NUMBER() OVER (
            PARTITION BY c.category_name
            ORDER BY SUM(t.amount) DESC
        ) AS rank
    FROM transactions t
    JOIN merchants m ON t.merchant_id = m.merchant_id
    JOIN categories c ON m.category_id = c.category_id
    WHERE t.status = 'completed' AND t.amount > 0
    GROUP BY c.category_name, m.normalized_name
)
SELECT category_name, merchant, total_spending, rank
FROM ranked
WHERE rank <= 5
ORDER BY category_name, rank;
