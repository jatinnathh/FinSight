-- Duplicate transaction detection
SELECT
    account_id,
    merchant_id,
    transaction_date,
    amount,
    currency,
    COUNT(*) AS duplicate_count
FROM transactions
GROUP BY account_id, merchant_id, transaction_date, amount, currency
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 50;
