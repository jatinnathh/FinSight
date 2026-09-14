-- Merchant name normalization analysis
SELECT
    m.normalized_name,
    COUNT(DISTINCT m.merchant_name) AS variation_count,
    ARRAY_AGG(DISTINCT m.merchant_name) AS variations,
    SUM(t.amount) AS total_spending
FROM merchants m
LEFT JOIN transactions t ON m.merchant_id = t.merchant_id
GROUP BY m.normalized_name
HAVING COUNT(DISTINCT m.merchant_name) > 1
ORDER BY variation_count DESC;
