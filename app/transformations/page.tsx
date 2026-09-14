"use client";

import { useState } from "react";
import Link from "next/link";

const rawExamples = [
  {
    merchant: "AMZN",
    currency: "inr",
    status: "COMPLETED",
    category: "NULL",
    date: "12/03/26",
  },
  {
    merchant: "Amazon.com",
    currency: "INR",
    status: "completed",
    category: "NULL",
    date: "2026-03-12",
  },
  {
    merchant: "amazon india",
    currency: "Inr",
    status: "Completed",
    category: "NULL",
    date: "03-12-2026",
  },
];

const cleanExample = {
  merchant: "Amazon",
  currency: "INR",
  status: "completed",
  category: "Shopping",
  date: "2026-03-12",
};

const transformSteps = [
  "UPPER(currency)",
  "LOWER(status)",
  "Merchant normalization via JOIN",
  "Date parsing to YYYY-MM-DD",
  "Category lookup via merchants → categories",
  "Duplicate detection via ROW_NUMBER()",
];

const stagingSql = `-- stg_transactions: normalize raw fields
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
  AND amount IS NOT NULL;`;

const cleanSql = `-- int_clean_transactions: join and enrich
SELECT
  t.*,
  COALESCE(m.normalized_name, t.description, 'Unknown') AS merchant,
  COALESCE(c.category_name, 'Uncategorized') AS category
FROM stg_transactions t
LEFT JOIN merchants m ON t.merchant_id = m.merchant_id
LEFT JOIN categories c ON m.category_id = c.category_id
WHERE t.currency IN ('INR', 'USD', 'EUR', 'GBP')
  AND t.status IN ('completed', 'pending', 'failed', 'refunded');`;

const dedupeSql = `-- Deduplication via window function
WITH ranked AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY account_id, merchant_id,
                   transaction_date, amount, currency
      ORDER BY transaction_id
    ) AS duplicate_rank
  FROM stg_transactions
)
SELECT * FROM ranked WHERE duplicate_rank = 1;`;

export default function TransformationsPage() {
  const [selectedRaw, setSelectedRaw] = useState(0);
  const [showSql, setShowSql] = useState<string | null>(null);

  return (
    <div>
      <h1 className="page-title">Transformations</h1>
      <p className="page-subtitle">
        Watch a single raw record become a clean, modeled transaction through
        SQL transformations.
      </p>

      <div className="split-workbench">
        {/* Left: transformation showcase */}
        <div className="transform-showcase">
          {/* Raw record */}
          <div className="transform-record">
            <div className="transform-record-title">Raw Transaction</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {rawExamples.map((_, i) => (
                <button
                  key={i}
                  className="btn"
                  onClick={() => setSelectedRaw(i)}
                  style={{
                    padding: "4px 10px",
                    fontSize: 11,
                    background:
                      selectedRaw === i ? "var(--foreground)" : undefined,
                    color:
                      selectedRaw === i ? "var(--background)" : undefined,
                    borderColor:
                      selectedRaw === i ? "var(--foreground)" : undefined,
                  }}
                >
                  Variant {i + 1}
                </button>
              ))}
            </div>
            {Object.entries(rawExamples[selectedRaw]).map(([key, val]) => (
              <div className="transform-field" key={key}>
                <span className="transform-field-name">{key}</span>
                <span className={`transform-field-value${val === "NULL" || val === "inr" || val === "Inr" || val === "COMPLETED" || val === "Completed" || val === "AMZN" || val === "amazon india" || val === "Amazon.com" || val === "12/03/26" || val === "03-12-2026" ? " dirty" : ""}`}>
                  {val}
                </span>
              </div>
            ))}
          </div>

          {/* Arrow */}
          <div className="transform-center-arrow">↓</div>

          {/* SQL steps */}
          <div className="transform-sql-list">
            <div className="transform-record-title" style={{ marginBottom: 8 }}>
              SQL Transformation
            </div>
            {transformSteps.map((step) => (
              <div className="transform-sql-item" key={step}>
                {step}
              </div>
            ))}
          </div>

          {/* Arrow */}
          <div className="transform-center-arrow">↓</div>

          {/* Clean record */}
          <div className="transform-record" style={{ borderColor: "var(--success)" }}>
            <div className="transform-record-title" style={{ color: "var(--success)" }}>
              Modeled Transaction
            </div>
            {Object.entries(cleanExample).map(([key, val]) => (
              <div className="transform-field" key={key}>
                <span className="transform-field-name">{key}</span>
                <span className="transform-field-value clean">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: detail panel */}
        <div className="detail-panel">
          <div className="card-title">SQL Models</div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14, lineHeight: 1.6 }}>
            Three SQL models transform raw bank exports into clean, deduplicated,
            categorized transactions.
          </p>

          <div className="step-list">
            <button
              className="step-row"
              onClick={() => setShowSql(showSql === "staging" ? null : "staging")}
              style={{ cursor: "pointer", background: "none", border: 0, borderBottom: "1px solid var(--border)", fontFamily: "inherit", textAlign: "left", width: "100%" }}
            >
              <span>stg_transactions</span>
              <span className="badge pass">STAGING</span>
            </button>
            <button
              className="step-row"
              onClick={() => setShowSql(showSql === "clean" ? null : "clean")}
              style={{ cursor: "pointer", background: "none", border: 0, borderBottom: "1px solid var(--border)", fontFamily: "inherit", textAlign: "left", width: "100%" }}
            >
              <span>int_clean_transactions</span>
              <span className="badge pass">INTERMEDIATE</span>
            </button>
            <button
              className="step-row"
              onClick={() => setShowSql(showSql === "dedupe" ? null : "dedupe")}
              style={{ cursor: "pointer", background: "none", border: 0, fontFamily: "inherit", textAlign: "left", width: "100%" }}
            >
              <span>deduplication</span>
              <span className="badge pass">QUALITY</span>
            </button>
          </div>

          {showSql && (
            <div className="modal-surface">
              <div className="card-title">
                {showSql === "staging" ? "stg_transactions.sql" : showSql === "clean" ? "int_clean_transactions.sql" : "deduplication.sql"}
              </div>
              <div className="sql-block">
                {showSql === "staging" ? stagingSql : showSql === "clean" ? cleanSql : dedupeSql}
              </div>
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <Link href="/lineage" className="btn" style={{ marginRight: 8 }}>
              View Lineage
            </Link>
            <Link href="/data-quality" className="btn">
              View Quality Checks
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
