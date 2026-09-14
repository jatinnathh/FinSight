-- Most expensive transaction per month
WITH ranked AS (
    SELECT
        to_char(transaction_date, 'YYYY-MM') AS month,
        transaction_id,
        amount,
        description,
        ROW_NUMBER() OVER (
            PARTITION BY to_char(transaction_date, 'YYYY-MM')
            ORDER BY amount DESC
        ) AS rank
    FROM transactions
    WHERE status = 'completed' AND amount > 0
)
SELECT month, transaction_id, amount, description
FROM ranked
WHERE rank = 1
ORDER BY month;
