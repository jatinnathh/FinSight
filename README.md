# FinSight — Data Engineering & SQL Analytics Platform

<div align="center">

**From messy financial data → trusted data → explainable insights**

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql)](https://neon.tech/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://typescriptlang.org/)

</div>

---

## Overview

FinSight is a **full-stack data engineering portfolio project** that demonstrates a complete data pipeline — from raw, messy CSV ingestion through SQL transformations, data quality validation, lineage tracking, and interactive analytics.

Unlike typical CRUD dashboards, FinSight focuses on **what happens before the chart**: data ingestion, column mapping, validation, transformation, quality checks, and traceability. Every metric on the dashboard is traceable back through the SQL DAG to its raw source.

### Key Metrics

| Metric | Value |
|---|---:|
| Demo transactions generated | **100,000** |
| CSV upload support | **Up to 10,000+ rows** |
| SQL transformation layers | **4** (raw → staging → intermediate → marts) |
| Data quality checks | **8** automated checks |
| API endpoints | **20+** RESTful routes |
| Database tables | **10** normalized tables |
| Supported currencies | **8** (INR, USD, EUR, GBP, JPY, CAD, AUD, SGD) |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        User Browser                         │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                   Next.js 16 (Turbopack)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │Dashboard │  │SQL Lab   │  │Pipeline  │  │Data Quality │  │
│  │          │  │          │  │Runs      │  │Inspector    │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │CSV Upload│  │Lineage   │  │Detective │  │Ask FinSight │  │
│  │& Mapping │  │Graph     │  │          │  │(AI/NL→SQL)  │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘  │
└──────────────────────────┬───────────────────────────────────┘
                           │  HTTP Proxy (rewrites)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                           │
│  ┌─────────────────┐  ┌──────────────────┐                   │
│  │ Ingestion        │  │ Analytics        │                   │
│  │ • CSV parsing    │  │ • Overview       │                   │
│  │ • Column detect  │  │ • Spending trend │                   │
│  │ • Mapping        │  │ • Categories     │                   │
│  │ • Batch import   │  │ • Merchants      │                   │
│  └─────────────────┘  └──────────────────┘                   │
│  ┌─────────────────┐  ┌──────────────────┐                   │
│  │ Validation       │  │ Pipeline         │                   │
│  │ • 8 quality      │  │ • Metadata       │                   │
│  │   checks         │  │ • Run tracking   │                   │
│  │ • SQL-inspectable│  │ • Step timings   │                   │
│  └─────────────────┘  └──────────────────┘                   │
│  ┌─────────────────┐  ┌──────────────────┐                   │
│  │ LLM Service      │  │ Incident Engine  │                   │
│  │ • NL → SQL       │  │ • Inject faults  │                   │
│  │ • Gemini API     │  │ • Fix faults     │                   │
│  └─────────────────┘  └──────────────────┘                   │
└──────────────────────────┬───────────────────────────────────┘
                           │  asyncpg (connection pool)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│               PostgreSQL (Neon Serverless)                    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Tables: users, accounts, transactions, merchants,     │    │
│  │         categories, budgets, subscriptions,           │    │
│  │         exchange_rates, pipeline_runs,                │    │
│  │         data_quality_results                          │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 16 + TypeScript | SSR/CSR pages, component-based UI |
| **Charts** | Recharts | Interactive spending trends, category breakdowns |
| **Backend** | FastAPI + Python 3.12 | Async REST API, CSV processing, analytics |
| **Database** | PostgreSQL on Neon | Serverless cloud PostgreSQL, connection pooling |
| **DB Driver** | asyncpg | High-performance async PostgreSQL driver |
| **AI/NLP** | Google Gemini API | Natural language → SQL translation |
| **Data Gen** | Python (Faker + custom) | Synthetic messy dataset generation |

---

## Data Pipeline

```
   CSV / Demo Data
        │
        ▼
┌───────────────┐
│  1. INGESTION │  Parse CSV, detect columns, auto-map aliases
│     800+ ms   │  Supports 10+ date formats, debit/credit columns
└───────┬───────┘
        ▼
┌───────────────┐
│  2. MAPPING   │  Map uploaded columns → canonical schema
│               │  Required: transaction_date, amount
│               │  Optional: merchant, currency, status, type, description
└───────┬───────┘
        ▼
┌───────────────┐
│  3. VALIDATE  │  Separate errors (required) vs warnings (optional)
│               │  Detect duplicates, unparseable dates, missing amounts
│               │  Returns: valid_rows, invalid_rows, errors, warnings
└───────┬───────┘
        ▼
┌───────────────┐
│  4. IMPORT    │  Batch INSERT via executemany (asyncpg)
│    ~3 sec     │  800 rows in ~3s to Neon (vs 120s+ row-by-row)
│   for 800     │  Auto-resolve merchants, safe NULL handling
└───────┬───────┘
        ▼
┌───────────────┐
│  5. QUALITY   │  8 automated SQL checks:
│   CHECKS      │  • Required columns (NOT NULL)
│               │  • Future dates
│               │  • Duplicate detection
│               │  • Missing merchants
│               │  • Missing categories
│               │  • Invalid currencies
│               │  • Negative non-refund amounts
│               │  Each check: status, affected rows, SQL, sample records
└───────┬───────┘
        ▼
┌───────────────┐
│  6. ANALYTICS │  Dashboard, spending trends, category breakdowns,
│               │  merchant rankings, subscription detection,
│               │  anomaly investigation
└───────────────┘
```

---

## SQL Transformation Layers

FinSight follows a dbt-style layered data modeling approach:

### Layer 1: Raw
```sql
-- raw.transactions — ingested data as-is
SELECT * FROM transactions;
```

### Layer 2: Staging
```sql
-- stg_transactions — cleaned, normalized
SELECT
    transaction_id, account_id, merchant_id,
    transaction_date, amount,
    UPPER(currency) AS currency,
    LOWER(status) AS status,
    LOWER(transaction_type) AS transaction_type
FROM transactions
WHERE transaction_date IS NOT NULL AND amount IS NOT NULL;
```

### Layer 3: Intermediate
```sql
-- int_clean_transactions — enriched with merchant/category joins
SELECT t.*,
    COALESCE(m.normalized_name, t.description, 'Unknown') AS merchant,
    COALESCE(c.category_name, 'Uncategorized') AS category
FROM stg_transactions t
LEFT JOIN merchants m ON t.merchant_id = m.merchant_id
LEFT JOIN categories c ON m.category_id = c.category_id
WHERE t.currency IN ('INR', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'SGD');
```

### Layer 4: Marts
```sql
-- monthly_spending — analytical aggregate
SELECT
    account_id,
    DATE_TRUNC('month', transaction_date) AS month,
    SUM(amount) AS spending,
    COUNT(*) AS transaction_count
FROM int_clean_transactions
WHERE status = 'completed' AND amount > 0
GROUP BY account_id, month;
```

---

## Database Schema

```
┌─────────┐     ┌───────────┐     ┌──────────────┐
│  users  │────▶│ accounts  │────▶│ transactions │
│  (50)   │     │   (80)    │     │  (100,000)   │
└─────────┘     └───────────┘     └──────┬───────┘
                                         │
                    ┌────────────────────┤
                    ▼                    ▼
              ┌───────────┐      ┌─────────────┐
              │ merchants │─────▶│ categories  │
              │   (200+)  │      │    (24)     │
              └───────────┘      └─────────────┘

Other tables: budgets, subscriptions, exchange_rates,
              pipeline_runs, data_quality_results
```

### Table Details

| Table | Rows (demo) | Key Columns |
|---|---:|---|
| `users` | 50 | user_id, name, email |
| `accounts` | 80 | account_id, user_id, account_type, currency |
| `transactions` | 100,000 | transaction_id, account_id, merchant_id, date, amount, currency, status, type |
| `merchants` | 200+ | merchant_id, merchant_name, normalized_name, category_id |
| `categories` | 24 | category_id, category_name, parent_category |
| `exchange_rates` | 1,460+ | date, base_currency, target_currency, rate |
| `pipeline_runs` | dynamic | run_id, status, rows_processed, rows_rejected |
| `data_quality_results` | dynamic | check_name, status, affected_rows |

---

## Features

### 1. CSV Upload & Column Mapping
- Drag-and-drop CSV upload
- Auto-detection of column types via alias matching (10+ aliases per canonical field)
- Interactive mapping UI: map any CSV column → canonical schema field or skip
- Required fields: `transaction_date`, `amount`
- Optional fields: `merchant`, `currency`, `status`, `transaction_type`, `description`
- Supports 10 date formats (`YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`, etc.)
- Handles split debit/credit columns automatically

### 2. Validation Engine
- **Errors** (block import): unparseable dates, missing/invalid amounts
- **Warnings** (allow import): missing merchant, missing optional fields, duplicates
- Returns structured response: `valid_rows`, `invalid_rows`, `errors[]`, `warnings[]`, `missing_optional_fields[]`, `duplicate_count`
- Validates before import — user sees exact issues before committing

### 3. Batch Import
- Uses `asyncpg.executemany()` for batched INSERT operations
- 800 rows imported in ~3 seconds to Neon (serverless PostgreSQL)
- Batch merchant resolution: single query for all unique merchants
- Safe NULL handling with `or` pattern for optional field defaults
- Fallback to row-by-row on batch failure with per-row error reporting

### 4. Interactive Dashboard
- Total spending, transaction count, average transaction
- Month-over-month change percentage
- Spending trend chart (Recharts LineChart)
- Top categories breakdown with visual bars
- Auto-adapts to uploaded data date range (not hardcoded to current month)

### 5. SQL Lab
- Write and execute arbitrary SQL against the live database
- Syntax-highlighted query editor
- Tabular results display
- Pre-built example queries

### 6. Data Quality Inspector
- 8 automated quality checks with pass/warn/fail status
- Click any check to see: affected records, the exact SQL used
- Checks: required columns, future dates, duplicates, missing merchants, missing categories, invalid currencies, negative non-refund amounts

### 7. Break the Pipeline
- Inject deliberate data quality incidents:
  - 500 duplicate transactions
  - 200 invalid currency records
  - 150 future-dated transactions
  - 100 negative non-refund amounts
  - 300 missing-category records
- Fix incidents with one click (tagged for safe removal)
- Watch quality checks fail and recover

### 8. Data Lineage
- Visual DAG: `raw.transactions` → `stg_transactions` → `int_clean_transactions` → marts → dashboard
- Click any node to see: model name, source, output, SQL, dependencies

### 9. Data Detective
- Anomaly investigation: duplicates, missing merchants, refunds, currency issues
- Current vs previous month spending comparison
- Z-score based spending anomaly detection

### 10. Ask FinSight (AI)
- Natural language → SQL via Google Gemini API
- Ask questions like "What are my top 5 merchants by spending?"
- See the generated SQL alongside results
- Schema-aware prompting for accurate queries

---

## Data Quality Checks

| # | Check | Type | SQL Pattern |
|---|---|---|---|
| 1 | Required columns (account_id, date, amount) | `fail` | `WHERE col IS NULL` |
| 2 | Future transaction dates | `warn` | `WHERE date > CURRENT_DATE` |
| 3 | Duplicate transactions | `warn` | `GROUP BY ... HAVING COUNT(*) > 1` |
| 4 | Missing merchants | `warn` | `WHERE merchant_id IS NULL` |
| 5 | Missing categories | `warn` | `LEFT JOIN ... WHERE category_id IS NULL` |
| 6 | Invalid currencies | `warn` | `WHERE currency NOT IN (...)` |
| 7 | Negative non-refund amounts | `fail` | `WHERE amount < 0 AND type != 'refund'` |
| 8 | Total row count | `info` | `SELECT COUNT(*)` |

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL database (or [Neon](https://neon.tech) account)

### Installation

```bash
# Clone repository
git clone https://github.com/jatinnathh/FinSight.git
cd FinSight

# Backend setup
python -m venv venv
.\venv\Scripts\activate        # Windows
pip install -r backend/requirements.txt

# Frontend setup
npm install

# Environment variables
# Create .env file with:
# DATABASE_URL=postgresql://user:pass@host/dbname
# GEMINI_API_KEY=your-key (optional, for Ask FinSight)
```

### Running

```bash
# Terminal 1: Backend
.\venv\Scripts\python.exe backend\main.py
# Starts FastAPI on http://localhost:8000 with auto-reload

# Terminal 2: Frontend
npm run dev
# Starts Next.js on http://localhost:3000
```

### First Run

1. Open `http://localhost:3000`
2. Click **"Try Demo Dataset"** to load 100K synthetic transactions
3. Or click **"Upload CSV"** to import your own data
4. Explore: Dashboard → SQL Lab → Data Quality → Pipeline → Lineage → Detective

---

## API Endpoints

### Data Ingestion
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/data/upload-csv` | Upload CSV, detect columns |
| `POST` | `/api/v1/data/validate` | Validate column mapping |
| `POST` | `/api/v1/data/import` | Batch import mapped data |
| `POST` | `/api/v1/data/load-demo` | Generate & load demo dataset |
| `GET` | `/api/v1/data/quality` | Run all quality checks |
| `GET` | `/api/v1/data/quality/detail` | Sample records + SQL for a check |

### Pipeline
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/data/inject-incident` | Inject a data quality incident |
| `POST` | `/api/v1/data/fix-incident` | Remove injected incident records |
| `GET` | `/api/v1/pipeline/runs` | List pipeline run history |
| `GET` | `/api/v1/pipeline/models` | SQL transformation models |
| `GET` | `/api/v1/pipeline/lineage` | Data lineage DAG |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/dashboard/overview` | Dashboard metrics |
| `GET` | `/api/v1/dashboard/spending-over-time` | Monthly spending trend |
| `GET` | `/api/v1/dashboard/top-categories` | Top spending categories |
| `GET` | `/api/v1/dashboard/top-merchants` | Top merchants by spend |
| `POST` | `/api/v1/ask` | Natural language → SQL |
| `GET` | `/api/v1/health` | Health check |

---

## Project Structure

```
finsight/
├── app/                          # Next.js 16 pages (App Router)
│   ├── page.tsx                  # Landing page
│   ├── dashboard/page.tsx        # Analytics dashboard
│   ├── add-data/                 # Data ingestion
│   │   ├── page.tsx              # Demo data loader
│   │   └── upload/page.tsx       # CSV upload + mapping
│   ├── sql-lab/page.tsx          # Interactive SQL editor
│   ├── pipeline/page.tsx         # Pipeline run history
│   ├── data-quality/page.tsx     # Quality check results
│   ├── data-detective/page.tsx   # Anomaly investigation
│   ├── break-pipeline/page.tsx   # Incident injection
│   ├── ask/page.tsx              # AI-powered NL→SQL
│   ├── components/Sidebar.tsx    # Navigation sidebar
│   └── layout.tsx                # Root layout
├── backend/
│   ├── main.py                   # FastAPI app entry point
│   ├── api/                      # Route handlers
│   │   ├── data.py               # CSV upload, validate, import
│   │   ├── dashboard.py          # Dashboard analytics
│   │   ├── pipeline.py           # Pipeline metadata
│   │   ├── ask.py                # AI query endpoint
│   │   └── ...
│   ├── services/                 # Business logic
│   │   ├── ingestion.py          # CSV parsing, column detection
│   │   ├── analytics.py          # SQL analytics queries
│   │   ├── validation.py         # Data quality checks
│   │   ├── pipeline_metadata.py  # Pipeline run tracking
│   │   └── llm.py                # Gemini AI integration
│   └── db/
│       ├── database.py           # asyncpg connection pool
│       └── schema.sql            # Database DDL
├── data_generator/
│   ├── generate_data.py          # Synthetic data generation
│   └── seed_data.py              # Database seeding
├── next.config.ts                # API proxy rewrites
├── package.json
└── .env                          # Database + API keys
```

---

## SQL Concepts Demonstrated

| Concept | Where Used |
|---|---|
| **CTEs** | Monthly spending, merchant metrics, anomaly detection |
| **JOINs** (LEFT, INNER) | Transactions ↔ merchants ↔ categories |
| **Window Functions** (LAG, ROW_NUMBER) | Month-over-month comparisons |
| **Rolling Windows** | 30-day rolling spending averages |
| **Aggregations** (SUM, COUNT, AVG, STDDEV) | All analytics queries |
| **Conditional Logic** (CASE WHEN) | Status handling, refund filtering |
| **Deduplication** | GROUP BY + HAVING COUNT(*) > 1 |
| **Date Functions** | DATE_TRUNC, TO_CHAR, interval arithmetic |
| **Subqueries** | Subscription detection, anomaly flagging |
| **Z-Score Analysis** | Spending anomaly detection with AVG + STDDEV |

---

## Performance

| Operation | Metric |
|---|---|
| CSV upload (800 rows) | ~500ms |
| Column auto-detection | ~1ms |
| Validation (800 rows) | ~200ms |
| Batch import (800 rows → Neon) | ~3s |
| Dashboard overview query | ~150ms |
| Data quality (8 checks) | ~500ms |
| Demo data generation (100K) | ~30s |

---

## License

MIT

---

<div align="center">

Built by [Jatin Nath](https://github.com/jatinnathh) as a data engineering portfolio project.

</div>
