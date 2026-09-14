# FinSight — Data Engineering & SQL Analytics Platform

## 1. What is FinSight?

**FinSight is a personal-finance data engineering platform that turns messy transaction data into validated, traceable analytics.**

The project is deliberately designed around a data-engineering problem rather than a finance dashboard:

> **How do you take unreliable raw data, clean and transform it with SQL, validate it, and make sure the numbers shown to a user can be traced back to their source?**

The application lets a user:

1. Load a realistic, intentionally messy dataset or upload a CSV.
2. Inspect the raw records.
3. Map incoming columns to a canonical transaction schema.
4. Run validation checks before trusting the data.
5. Transform raw transactions into analytical models.
6. Explore SQL transformations and data lineage.
7. Investigate anomalies and data-quality failures.
8. View analytics generated from the modeled data.
9. Ask natural-language questions and inspect the SQL generated for them.

The central idea is:

```text
Raw Financial Data
       ↓
   Ingestion
       ↓
   PostgreSQL
       ↓
 SQL Transformations
       ↓
 Data Quality Checks
       ↓
 Analytical Models
       ↓
   SQL Analytics
       ↓
 User-facing Insights
```

---

# 2. Why this project exists

Most finance applications stop at:

```text
database → charts
```

FinSight focuses on what happens **before** the chart.

A dashboard saying:

> "You spent ₹84,320"

is not very interesting by itself.

FinSight asks:

> Where did that number come from?

The application should allow the user to trace:

```text
₹84,320
   ↓
monthly_spending
   ↓
int_clean_transactions
   ↓
stg_transactions
   ↓
raw.transactions
   ↓
original uploaded record
```

This makes SQL, data modeling, validation, and data lineage visible through the UI.

---

# 3. Dataset

FinSight includes an intentionally messy synthetic dataset generator.

## Current dataset scale

| Metric | Value |
|---|---:|
| Transactions | **100,000** |
| Users | **50** |
| Accounts | **80** |
| Date range | **Jan 2025 – Aug 2026** |
| Supported normal currencies | **4** |
| Deliberately invalid currencies | **3** |
| Transaction statuses | **4** |
| Transaction types | **4** |

Normal currencies:

```text
INR
USD
EUR
GBP
```

Invalid test currencies:

```text
XYZ
ABC
123
```

The generator also produces multiple merchant-name variants to test normalization.

Examples:

```text
Amazon
AMAZON
Amazon.com
AMZN
amazon india
Amazon IN
AMAZON.IN
```

Similar variations are generated for other merchants.

This creates a dataset where simple `SELECT *` queries are not enough.

---

# 4. Data-quality problems intentionally included

The dataset is designed to simulate problems that occur in real data pipelines.

### Duplicate records

The same transaction can appear more than once.

The project can detect duplicates using combinations such as:

```sql
GROUP BY
    account_id,
    merchant_id,
    transaction_date,
    amount,
    currency
HAVING COUNT(*) > 1
```

### Merchant-name inconsistency

A single merchant may appear as:

```text
Amazon
AMAZON
Amazon.com
AMZN
```

The transformation layer maps these variations to a normalized merchant.

### Missing data

Records can contain missing:

- merchants
- categories
- required fields

### Invalid currencies

Records can contain unexpected currency codes.

### Transaction-status complexity

The dataset contains:

```text
completed
pending
failed
refunded
```

### Transaction-type complexity

The dataset contains:

```text
debit
credit
refund
transfer
```

This forces analytical queries to explicitly decide which records should be included.

---

# 5. Core architecture

```text
                         ┌─────────────────────┐
                         │       User          │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │      Next.js        │
                         │        UI           │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │      FastAPI        │
                         │       Backend       │
                         └──────────┬──────────┘
                                    │
                         ┌──────────┴──────────┐
                         ▼                     ▼
                ┌────────────────┐    ┌────────────────┐
                │   PostgreSQL   │    │  SQL / Models  │
                └───────┬────────┘    └───────┬────────┘
                        │                      │
                        └──────────┬───────────┘
                                   ▼
                         ┌─────────────────────┐
                         │ Data Quality /      │
                         │ Pipeline Metadata   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Analytics + AI      │
                         └─────────────────────┘
```

The intended production version adds:

```text
Airflow
  ↓
Python ingestion
  ↓
dbt
  ↓
PostgreSQL
```

with the frontend visualizing the results.

---

# 6. Data model

The main entities are:

```text
users
accounts
transactions
merchants
categories
budgets
subscriptions
exchange_rates
```

Important relationships:

```text
users
  │
  └── accounts
        │
        └── transactions
              │
              ├── merchants
              │      └── categories
              │
              └── exchange_rates
```

This allows SQL queries to demonstrate joins across multiple related tables rather than operating on one flat CSV.

---

# 7. SQL transformation layers

FinSight follows a layered data-modeling approach.

```text
raw
 ↓
staging
 ↓
intermediate
 ↓
marts
```

## Raw

Example:

```text
raw.transactions
```

Contains data close to its ingested form.

---

## Staging

Example:

```text
stg_transactions
```

Responsibilities:

- normalize casing
- parse timestamps
- standardize statuses
- remove unusable records
- preserve a predictable schema

Example:

```sql
SELECT
    transaction_id,
    account_id,
    merchant_id,
    transaction_date,
    amount,
    UPPER(currency) AS currency,
    LOWER(status) AS status,
    LOWER(transaction_type) AS transaction_type
FROM raw.transactions
WHERE transaction_date IS NOT NULL
  AND amount IS NOT NULL;
```

---

## Intermediate

Example:

```text
int_clean_transactions
```

Responsibilities:

- join merchants
- join categories
- normalize merchant names
- fill missing category labels
- restrict data to recognized currencies/statuses

Example:

```sql
SELECT
    t.*,
    COALESCE(
        m.normalized_name,
        t.description,
        'Unknown'
    ) AS merchant,
    COALESCE(
        c.category_name,
        'Uncategorized'
    ) AS category
FROM stg_transactions t
LEFT JOIN merchants m
    ON t.merchant_id = m.merchant_id
LEFT JOIN categories c
    ON m.category_id = c.category_id
WHERE t.currency IN ('INR', 'USD', 'EUR', 'GBP')
  AND t.status IN (
      'completed',
      'pending',
      'failed',
      'refunded'
  );
```

---

# 8. Analytical marts

## Monthly spending

```text
monthly_spending
```

Calculates spending by account and month.

Important SQL concepts:

- CTEs
- `DATE_TRUNC`
- `SUM`
- `GROUP BY`
- filtering

Example:

```sql
WITH monthly AS (
    SELECT
        account_id,
        DATE_TRUNC('month', transaction_date) AS month,
        SUM(amount) AS spending
    FROM int_clean_transactions
    WHERE status = 'completed'
      AND amount > 0
    GROUP BY account_id, month
)
SELECT *
FROM monthly;
```

---

## Merchant metrics

```text
merchant_metrics
```

Calculates:

- transaction count
- total spending
- spending by category
- merchant activity

Example:

```sql
SELECT
    merchant,
    category,
    COUNT(*) AS transaction_count,
    SUM(amount) AS total_spending
FROM int_clean_transactions
WHERE status = 'completed'
  AND amount > 0
GROUP BY merchant, category;
```

---

# 9. SQL concepts demonstrated

FinSight should explicitly demonstrate the SQL skills expected from a data-engineering role.

## CTEs

Used for multi-stage analytical queries.

## Joins

Used across:

```text
transactions
accounts
users
merchants
categories
```

## Window functions

Examples include:

```sql
LAG(...)
```

for month-over-month comparisons.

## Rolling windows

The project includes a 30-day rolling spending query using:

```sql
SUM(amount) OVER (
    PARTITION BY user_id
    ORDER BY transaction_date
    RANGE BETWEEN INTERVAL '30 days' PRECEDING
          AND CURRENT ROW
)
```

## Deduplication

Duplicate groups are identified with grouped SQL and can be extended with:

```sql
ROW_NUMBER() OVER (...)
```

to retain one canonical record.

## Aggregations

The project uses:

```text
SUM
COUNT
AVG
MIN
MAX
STDDEV
```

## Conditional logic

Used for:

- status handling
- refunds
- invalid data
- anomaly classification

---

# 10. Advanced SQL analytics

The project also contains more advanced analytical queries.

### Merchant growth

Uses:

```sql
LAG(transaction_count)
OVER (
    PARTITION BY merchant
    ORDER BY month
)
```

to calculate month-over-month merchant growth.

### Spending anomalies

Uses:

```text
AVG
STDDEV
z-score
```

to identify transactions that significantly deviate from a merchant's normal transaction amount.

### Subscription detection

Uses transaction intervals and window functions to identify recurring payments.

These make the project more than a CRUD application.

---

# 11. Data-quality system

FinSight runs SQL-based validation checks before analytics are considered trustworthy.

Checks include:

- required-field validation
- future transaction dates
- duplicate detection
- invalid currencies
- referential integrity
- negative/non-refund amounts
- missing merchant/category information

The backend exposes detailed quality results and can return:

```text
check name
status
affected rows
sample records
SQL used to detect the issue
```

For example:

```text
FAILED
Duplicate Transactions

Affected rows: 342

[View Records]
[View SQL]
```

The user can then see the actual SQL responsible for the failure.

---

# 12. Pipeline observability

FinSight represents the pipeline as explicit stages.

```text
Ingestion
    ↓
PostgreSQL
    ↓
Staging
    ↓
Intermediate
    ↓
Marts
    ↓
Data Quality
    ↓
Analytics
```

Each pipeline step can expose:

```text
status
rows in
rows out
duration
model
input
output
transformations
```

The current pipeline metadata records example model timings such as:

```text
staging: 4.21 seconds
marts:   5.06 seconds
quality: 2.14 seconds
analytics: 0.92 seconds
```

These are **pipeline-demo metadata values, not production performance benchmarks**.

The recorded demo pipeline duration is approximately:

```text
2 minutes 13 seconds
```

The UI should label these appropriately rather than implying a benchmark.

---

# 13. Data lineage

The lineage graph connects:

```text
raw.transactions
       ↓
stg_transactions
       ↓
int_clean_transactions
       ↓
 ┌─────┴───────────┐
 ↓                 ↓
monthly_spending    merchant_metrics
 ↓                 ↓
 └───────┬─────────┘
         ↓
      Dashboard
```

Each node should be clickable.

Clicking a model shows:

```text
Model
Source
Output
Used by
SQL
```

This lets a user answer:

> "Where did this dashboard number come from?"

---

# 14. User experience

The project should not feel like a collection of disconnected pages.

The intended experience is:

```text
LANDING PAGE
     ↓
"Try Demo Data"
     ↓
INGESTION
     ↓
RAW DATA PREVIEW
     ↓
COLUMN MAPPING
     ↓
VALIDATION
     ↓
PIPELINE RUN
     ↓
DATA QUALITY
     ↓
TRANSFORMATIONS
     ↓
LINEAGE
     ↓
ANALYTICS
     ↓
DATA DETECTIVE
     ↓
ASK FINSIGHT
```

A user should be able to complete this journey without knowing SQL beforehand.

At the same time, a technical reviewer should be able to inspect the SQL underneath every major result.

---

# 15. UI features to prioritize

## A. Landing page

The landing page should immediately explain:

> **From messy financial data to trusted insights.**

Show:

```text
Upload → Clean → Transform → Validate → Analyze
```

Buttons:

```text
Try Demo Data
Upload CSV
Explore Pipeline
```

---

## B. Add Data

Explain exactly what happens after upload:

```text
1. Detect columns
2. Map to schema
3. Validate records
4. Detect data-quality issues
5. Load into PostgreSQL
6. Run transformations
7. Generate analytics
```

The demo dataset should advertise:

```text
100,000 transactions
50 users
80 accounts
20 months of data
4 normal currencies
3 invalid currency codes
4 transaction statuses
4 transaction types
```

---

# 16. Pipeline page

Make the pipeline visual rather than a static status page.

Example:

```text
PIPELINE RUN #42

100,000 input rows

       ↓

INGESTION
100,000 rows
✓ Python
✓ PostgreSQL

       ↓

STAGING
99,723 rows
✓ Timestamp parsing
✓ Currency normalization
✓ Status normalization

       ↓

MARTS
98,942 rows
✓ Joins
✓ Aggregations
✓ Merchant metrics

       ↓

QUALITY
18 passed
2 warnings
0 failed

       ↓

ANALYTICS
READY
```

Every stage should be clickable.

---

# 17. Transformation Explorer

Create a page showing:

```text
RAW RECORD
        ↓
SQL TRANSFORMATION
        ↓
CLEAN RECORD
```

Example:

```text
RAW

merchant = "AMZN"
currency = "inr"
status = "COMPLETED"

        ↓

SQL

UPPER(currency)
LOWER(status)
merchant normalization

        ↓

MODELED

merchant = "Amazon"
currency = "INR"
status = "completed"
```

This makes SQL transformations visible to the user.

---

# 18. Data Quality Explorer

Every check should be interactive.

Example:

```text
✓ Required fields
⚠ Future transaction dates
✗ Duplicate transactions
✓ Currency validation
✓ Referential integrity
```

Clicking a failure should reveal:

```text
342 affected records

[table of actual records]

SQL:

SELECT ...
FROM transactions
GROUP BY ...
HAVING COUNT(*) > 1;
```

This is one of the strongest demonstrations of SQL debugging in the project.

---

# 19. SQL Lab

Create a SQL playground with curated challenges.

Example challenges:

```text
1. Total spending
2. Monthly spending
3. Top merchants
4. Spending by category
5. Duplicate detection
6. Month-over-month growth
7. 30-day rolling spending
8. Spending anomalies
9. Subscription detection
10. First transaction per user
```

For each challenge show:

```text
Question
↓
SQL
↓
Run
↓
Result table
↓
Explanation
```

This makes the project visibly SQL-heavy.

---

# 20. Data Detective

The Data Detective should answer:

> "Why does this number look wrong?"

Example flow:

```text
Spending increased 74%
        ↓
Check duplicates
        ↓
Check missing records
        ↓
Check refunds
        ↓
Check currencies
        ↓
Check merchant distribution
        ↓
ROOT CAUSE
```

Example result:

```text
ROOT CAUSE FOUND

3,204 duplicate transaction groups detected.

Likely cause:
duplicate ingestion.

[View Records]
[View SQL]
[View Pipeline Run]
```

The important feature is not the fancy explanation.

The important feature is that the explanation is backed by SQL and actual records.

---

# 21. Ask FinSight

The natural-language interface should follow:

```text
User question
      ↓
LLM
      ↓
SQL generation
      ↓
SQL validation
      ↓
Read-only validation
      ↓
PostgreSQL
      ↓
Result validation
      ↓
Answer
```

Example:

> Where did I spend the most last month?

Show:

```text
Generated SQL
       ↓
Validation
✓ Read-only
✓ Valid tables
✓ Valid columns
       ↓
Query result
       ↓
Natural-language explanation
```

This connects the data-engineering project with the existing LLM experience.

---

# 22. Incident simulation

A particularly strong feature for demonstrations is:

## "Break the pipeline"

Allow a user to intentionally inject:

```text
Duplicate transactions
Missing categories
Invalid currencies
Broken timestamps
Negative amounts
Missing merchant mappings
```

Then run the pipeline.

The UI should show:

```text
Pipeline
    ↓
❌ Quality check failed
    ↓
342 affected rows
    ↓
Investigate
    ↓
SQL
    ↓
Root cause
    ↓
Fix
    ↓
Run again
    ↓
✓ Quality passed
```

This turns the project into an interactive data-engineering demonstration.

---

# 23. Dashboard traceability

Every important dashboard metric should have:

```text
Metric
  ↓
How calculated?
  ↓
SQL model
  ↓
Source table
  ↓
Filters
  ↓
Last pipeline run
```

For example:

```text
TOTAL SPENDING

₹84,320

How calculated?

Model:
monthly_spending

Filter:
status = completed
amount > 0

Aggregation:
SUM(amount)

Source:
int_clean_transactions
```

The user should be able to click:

**View SQL**

and see the actual query.

---

# 24. Technology stack

## Frontend

```text
Next.js
TypeScript
React
Recharts
```

## Backend

```text
Python
FastAPI
```

## Database

```text
PostgreSQL
```

## Data engineering

```text
SQL
dbt / dbt-style modeling
Airflow
Python ingestion
```

## Infrastructure

```text
Docker
Linux
Git
```

## AI

```text
LLM SQL generation
SQL validation
Natural-language analytics
```

---

# 25. Suggested repository structure

```text
finsight/
│
├── app/
│   ├── dashboard/
│   ├── transactions/
│   ├── analytics/
│   ├── add-data/
│   ├── data-quality/
│   ├── transformations/
│   ├── lineage/
│   ├── pipeline/
│   ├── data-detective/
│   ├── sql-lab/
│   └── ask/
│
├── backend/
│   ├── api/
│   ├── services/
│   ├── db/
│   └── main.py
│
├── sql/
│   ├── basic/
│   ├── intermediate/
│   └── advanced/
│
├── dbt/
│   ├── models/
│   │   ├── staging/
│   │   ├── intermediate/
│   │   └── marts/
│   ├── tests/
│   └── dbt_project.yml
│
├── airflow/
│   └── dags/
│
├── data_generator/
│   └── generate_data.py
│
└── README.md
```

---

# 26. Project metrics

The following metrics are useful for describing the project without inventing production-scale claims:

### Dataset

- **100,000** generated transactions
- **50** users
- **80** accounts
- **20 months** of transaction history
- **4** supported currencies
- **3** deliberately invalid currency codes
- **4** transaction statuses
- **4** transaction types

### SQL

The project contains SQL across:

- basic aggregation
- joins
- CTEs
- window functions
- deduplication
- rolling windows
- anomaly detection
- subscription detection
- merchant growth analysis

### Pipeline

The demo pipeline exposes:

- ingestion
- staging
- intermediate transformations
- analytical marts
- quality validation
- analytics serving

### Quality

Quality checks cover:

- required fields
- duplicate records
- future dates
- currency validity
- referential integrity
- transaction amount rules
- merchant/category completeness

### Existing pipeline metadata

The UI currently models example stage durations of:

- **4.21 s** — staging
- **5.06 s** — marts
- **2.14 s** — quality
- **0.92 s** — analytics

These should be treated as **demo metadata until measured from real executions**.

---

# 27. What makes this a strong data-engineering project

FinSight is not primarily a dashboard.

The dashboard is the final consumer of a pipeline.

The actual project demonstrates:

```text
DATA INGESTION
      +
POSTGRESQL
      +
SQL
      +
DATA MODELING
      +
DATA QUALITY
      +
PIPELINE OBSERVABILITY
      +
DATA LINEAGE
      +
ANALYTICS
      +
LLM SQL GENERATION
      +
SQL VALIDATION
```

The most important design principle is:

> **No important number should be a black box.**

A reviewer should be able to go from:

```text
dashboard metric
```

to:

```text
SQL model
```

to:

```text
transformation
```

to:

```text
source record
```

and understand why the number is correct.

---

# 28. Recommended demo script

A strong 5-minute demo should be:

### Step 1 — Load data

Click:

**Try Demo Data**

Show:

```text
100,000 transactions
50 users
80 accounts
```

### Step 2 — Inspect raw data

Show intentionally messy values:

```text
AMAZON
Amazon.com
AMZN
```

and invalid currency codes.

### Step 3 — Run pipeline

Show:

```text
Ingestion
→ Staging
→ Transform
→ Quality
→ Analytics
```

### Step 4 — Show SQL

Click:

**monthly_spending**

Show the CTE and aggregation.

### Step 5 — Show lineage

Trace:

```text
raw.transactions
→ stg_transactions
→ int_clean_transactions
→ monthly_spending
→ dashboard
```

### Step 6 — Break it

Inject duplicate transactions.

Run quality checks.

Show the failed SQL check.

### Step 7 — Investigate

Use Data Detective.

Show affected records and root cause.

### Step 8 — Fix

Re-run the transformation and quality checks.

Show:

```text
✓ Data quality passed
```

### Step 9 — Ask a question

Ask:

> Which merchant had the highest spending last month?

Show:

```text
Question
→ Generated SQL
→ Validation
→ Query result
→ Answer
```

This demo communicates the entire project far better than simply opening a dashboard.

---

# 29. Resume positioning

The strongest positioning is:

> **Built a PostgreSQL-based financial data platform processing 100K synthetic transactions across 50 users and 80 accounts, with SQL staging/intermediate/mart models, data-quality validation, lineage, anomaly detection, and traceable analytics.**

Then mention specific SQL concepts:

> **Implemented CTEs, multi-table joins, window functions, rolling 30-day metrics, deduplication, merchant normalization, and anomaly detection.**

Then mention the engineering layer:

> **Built an observable ingestion-to-analytics pipeline with validation results, row-level diagnostics, pipeline metadata, and SQL lineage exposed through an interactive Next.js UI.**

And finally the AI component:

> **Added natural-language SQL generation with read-only validation and result inspection rather than executing LLM-generated SQL blindly.**

---

# 30. The final product vision

FinSight should feel like this:

```text
                FINSIGHT

       MESSY DATA → TRUSTED DATA


     ┌─────────┐
     │  INPUT  │
     └────┬────┘
          ↓
     ┌─────────┐
     │ INGEST  │
     └────┬────┘
          ↓
     ┌─────────┐
     │  CLEAN  │
     └────┬────┘
          ↓
     ┌─────────┐
     │TRANSFORM│
     └────┬────┘
          ↓
     ┌─────────┐
     │ VALIDATE│
     └────┬────┘
          ↓
     ┌─────────┐
     │ ANALYZE │
     └────┬────┘
          ↓
     ┌─────────┐
     │ INSIGHT │
     └─────────┘
```

The user should never have to wonder:

> "What is this application actually doing?"

They should be able to **follow the data through the pipeline and inspect the SQL responsible for every transformation and metric.**

