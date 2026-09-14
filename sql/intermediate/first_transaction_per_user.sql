-- First transaction per user
SELECT DISTINCT ON (u.user_id)
    u.user_id,
    u.name,
    t.transaction_date AS first_transaction_date,
    t.amount,
    m.normalized_name AS merchant
FROM users u
JOIN accounts a ON u.user_id = a.user_id
JOIN transactions t ON a.account_id = t.account_id
LEFT JOIN merchants m ON t.merchant_id = m.merchant_id
WHERE t.status = 'completed'
ORDER BY u.user_id, t.transaction_date ASC;
