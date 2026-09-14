-- Spending breakdown by category
SELECT
    c.category_name,
    c.parent_category,
    SUM(t.amount) AS total_spending,
    COUNT(*) AS transaction_count,
    ROUND(AVG(t.amount), 2) AS avg_amount
FROM transactions t
JOIN merchants m ON t.merchant_id = m.merchant_id
JOIN categories c ON m.category_id = c.category_id
WHERE t.status = 'completed'
  AND t.amount > 0
GROUP BY c.category_name, c.parent_category
ORDER BY total_spending DESC;
