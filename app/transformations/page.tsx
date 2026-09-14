"use client";

import { useState } from "react";

const rawRows = [
  { merchant: "AMAZON", amount: "1200", currency: "INR", date: "09/12/25", status: "Completed" },
  { merchant: "Amazon.com", amount: "1200", currency: "INR", date: "2025-09-12", status: "completed" },
  { merchant: "AMZN", amount: "1200", currency: "INR", date: "12-09-2025", status: "COMPLETED" },
];

const cleanRows = [
  {
    merchant: "Amazon",
    amount: "1200.00",
    currency: "INR",
    transaction_date: "2025-09-12",
    status: "completed",
  },
];

const transformations = [
  "Merchant normalization",
  "Timestamp normalization",
  "Currency validation",
  "Duplicate detection",
  "Status normalization",
];

const sql = `WITH normalized AS (
  SELECT
    COALESCE(m.normalized_name, t.description) AS merchant,
    t.amount,
    UPPER(t.currency) AS currency,
    t.transaction_date,
    LOWER(t.status) AS status
  FROM raw.transactions t
  LEFT JOIN merchants m ON t.merchant_id = m.merchant_id
),
deduped AS (
  SELECT *,
         ROW_NUMBER() OVER (
           PARTITION BY merchant, amount, currency, transaction_date
           ORDER BY transaction_date
         ) AS row_number
  FROM normalized
)
SELECT merchant, amount, currency, transaction_date, status
FROM deduped
WHERE row_number = 1
  AND currency IN ('INR', 'USD', 'EUR', 'GBP')
  AND status IN ('completed', 'pending', 'failed', 'refunded');`;

export default function TransformationsPage() {
  const [showSql, setShowSql] = useState(false);

  return (
    <div>
      <h1 className="page-title">Transformations</h1>
      <p className="page-subtitle">
        Before and after records showing how raw exports become modeled analytics data.
      </p>

      <div className="split-workbench">
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">Raw Data</div>
            <div className="data-table-mini">
              <table>
                <thead>
                  <tr>
                    {Object.keys(rawRows[0]).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawRows.map((row) => (
                    <tr key={`${row.merchant}-${row.date}`}>
                      {Object.values(row).map((value) => (
                        <td key={value}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="transform-arrow">
            |<br />
            dbt transformation
            <br />v
          </div>

          <div className="card">
            <div className="card-title">Clean Model</div>
            <div className="data-table-mini">
              <table>
                <thead>
                  <tr>
                    {Object.keys(cleanRows[0]).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cleanRows.map((row) => (
                    <tr key={row.transaction_date}>
                      {Object.values(row).map((value) => (
                        <td key={value}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="detail-panel">
          <div className="card-title">Transformations</div>
          <div className="step-list">
            {transformations.map((item) => (
              <div className="step-row" key={item}>
                <span>{item}</span>
                <span className="badge pass">PASS</span>
              </div>
            ))}
          </div>

          <button
            className="btn"
            style={{ marginTop: 18 }}
            onClick={() => setShowSql((value) => !value)}
          >
            {showSql ? "Hide SQL" : "View SQL"}
          </button>

          {showSql && (
            <div className="modal-surface">
              <div className="card-title">stg_transactions.sql</div>
              <div className="sql-block">{sql}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
