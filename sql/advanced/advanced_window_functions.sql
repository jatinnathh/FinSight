-- Advanced Window Functions Demonstration
-- LAG, LEAD, ROW_NUMBER, RANK, DENSE_RANK, SUM OVER, AVG OVER

-- 1. LAG and LEAD: Month-over-month spending with previous and next month
WITH monthly_spending AS (
    SELECT
        a.user_id,
        to_char(t.transaction_date, 'YYYY-MM') AS month,
        SUM(t.amount) AS spending
    FROM transactions t
    JOIN accounts a ON t.account_id = a.account_id
    WHERE t.status = 'completed' AND t.amount > 0
    GROUP BY a.user_id, to_char(t.transaction_date, 'YYYY-MM')
)
SELECT
    user_id,
    month,
    spending,
    LAG(spending) OVER (PARTITION BY user_id ORDER BY month) AS previous_month,
    LEAD(spending) OVER (PARTITION BY user_id ORDER BY month) AS next_month,
    spending - LAG(spending) OVER (PARTITION BY user_id ORDER BY month) AS change_from_previous
FROM monthly_spending
ORDER BY user_id, month
LIMIT 100;

-- 2. ROW_NUMBER: Rank transactions within each account
SELECT
    transaction_id,
    account_id,
    transaction_date,
    amount,
    ROW_NUMBER() OVER (
        PARTITION BY account_id
        ORDER BY amount DESC
    ) AS row_num
FROM transactions
WHERE status = 'completed' AND amount > 0
LIMIT 100;

-- 3. RANK and DENSE_RANK: Rank merchants by spending
SELECT
    m.normalized_name AS merchant,
    SUM(t.amount) AS total_spending,
    RANK() OVER (ORDER BY SUM(t.amount) DESC) AS rank,
    DENSE_RANK() OVER (ORDER BY SUM(t.amount) DESC) AS dense_rank
FROM transactions t
JOIN merchants m ON t.merchant_id = m.merchant_id
WHERE t.status = 'completed' AND t.amount > 0
GROUP BY m.normalized_name
ORDER BY rank
LIMIT 50;

-- 4. SUM OVER: Running total by user
SELECT
    a.user_id,
    t.transaction_date,
    t.amount,
    SUM(t.amount) OVER (
        PARTITION BY a.user_id
        ORDER BY t.transaction_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM transactions t
JOIN accounts a ON t.account_id = a.account_id
WHERE t.status = 'completed' AND t.amount > 0
ORDER BY a.user_id, t.transaction_date
LIMIT 100;

-- 5. AVG OVER: Moving average (7-day)
SELECT
    transaction_date,
    amount,
    ROUND(
        AVG(amount) OVER (
            ORDER BY transaction_date
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ), 2
    ) AS moving_avg_7day
FROM transactions
WHERE status = 'completed' AND amount > 0
ORDER BY transaction_date
LIMIT 100;
