-- Currency-normalized spending: convert all amounts to INR
WITH inr_transactions AS (
    SELECT
        t.transaction_id,
        t.transaction_date,
        t.amount,
        t.currency,
        CASE
            WHEN t.currency = 'INR' THEN t.amount
            ELSE t.amount / COALESCE(er.rate, 1)
        END AS amount_inr
    FROM transactions t
    LEFT JOIN exchange_rates er
        ON t.transaction_date = er.date
        AND er.base_currency = 'INR'
        AND er.target_currency = t.currency
    WHERE t.status = 'completed' AND t.amount > 0
)
SELECT
    to_char(transaction_date, 'YYYY-MM') AS month,
    currency,
    SUM(amount) AS original_total,
    ROUND(SUM(amount_inr)::numeric, 2) AS total_inr,
    COUNT(*) AS transaction_count
FROM inr_transactions
GROUP BY to_char(transaction_date, 'YYYY-MM'), currency
ORDER BY month, total_inr DESC;
