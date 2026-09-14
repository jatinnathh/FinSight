"use client";

import { useState } from "react";

type Challenge = {
  id: string;
  title: string;
  concepts: string[];
  sql: string;
  rows: Record<string, string>[];
};

const challenges: Challenge[] = [
  {
    id: "top-merchants",
    title: "Top 5 merchants",
    concepts: ["aggregation", "joins", "sorting"],
    sql: `SELECT
  COALESCE(m.normalized_name, t.description, 'Unknown') AS merchant,
  COUNT(*) AS transactions,
  SUM(t.amount) AS spending
FROM transactions t
LEFT JOIN merchants m ON t.merchant_id = m.merchant_id
WHERE t.status = 'completed'
  AND t.amount > 0
GROUP BY merchant
ORDER BY spending DESC
LIMIT 5;`,
    rows: [
      { merchant: "Rent", transactions: "2,341", spending: "5.8Cr" },
      { merchant: "MakeMyTrip", transactions: "1,084", spending: "2.2Cr" },
      { merchant: "Croma", transactions: "912", spending: "1.7Cr" },
    ],
  },
  {
    id: "mom-growth",
    title: "Month-over-month growth",
    concepts: ["CTEs", "date grouping", "window functions"],
    sql: `WITH monthly_spend AS (
  SELECT
    DATE_TRUNC('month', transaction_date) AS month,
    SUM(amount) AS spending
  FROM transactions
  WHERE status = 'completed'
    AND amount > 0
  GROUP BY month
),
with_previous AS (
  SELECT
    month,
    spending,
    LAG(spending) OVER (ORDER BY month) AS previous
  FROM monthly_spend
)
SELECT
  month,
  spending,
  previous,
  ROUND(((spending - previous) / NULLIF(previous, 0)) * 100, 2) AS growth_percent
FROM with_previous
ORDER BY month;`,
    rows: [
      { month: "2026-04", spending: "42.0L", previous: "39.8L", growth: "5.5%" },
      { month: "2026-05", spending: "48.0L", previous: "42.0L", growth: "14.2%" },
      { month: "2026-06", spending: "51.0L", previous: "48.0L", growth: "6.2%" },
    ],
  },
  {
    id: "dedupe",
    title: "Deduplicate transactions",
    concepts: ["window functions", "partitioning", "quality checks"],
    sql: `WITH ranked AS (
  SELECT
    transaction_id,
    account_id,
    merchant_id,
    transaction_date,
    amount,
    currency,
    ROW_NUMBER() OVER (
      PARTITION BY account_id, merchant_id, transaction_date, amount, currency
      ORDER BY transaction_id
    ) AS duplicate_rank
  FROM transactions
)
SELECT *
FROM ranked
WHERE duplicate_rank = 1;`,
    rows: [
      { transaction_id: "18423", merchant_id: "12", amount: "1200.00", duplicate_rank: "1" },
      { transaction_id: "19231", merchant_id: "12", amount: "1200.00", duplicate_rank: "1" },
      { transaction_id: "20489", merchant_id: "44", amount: "899.00", duplicate_rank: "1" },
    ],
  },
  {
    id: "rolling",
    title: "30-day rolling spending",
    concepts: ["window functions", "time series", "analytics"],
    sql: `WITH daily AS (
  SELECT
    transaction_date,
    SUM(amount) AS daily_spending
  FROM transactions
  WHERE status = 'completed'
    AND amount > 0
  GROUP BY transaction_date
)
SELECT
  transaction_date,
  daily_spending,
  SUM(daily_spending) OVER (
    ORDER BY transaction_date
    ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
  ) AS rolling_30_day_spending
FROM daily
ORDER BY transaction_date;`,
    rows: [
      { transaction_date: "2026-06-01", daily_spending: "1.4L", rolling_30_day: "38.2L" },
      { transaction_date: "2026-06-02", daily_spending: "1.7L", rolling_30_day: "39.1L" },
      { transaction_date: "2026-06-03", daily_spending: "1.2L", rolling_30_day: "39.6L" },
    ],
  },
];

export default function SqlLabPage() {
  const [selectedId, setSelectedId] = useState(challenges[1].id);
  const [ran, setRan] = useState(false);
  const selected = challenges.find((challenge) => challenge.id === selectedId) || challenges[0];

  return (
    <div>
      <h1 className="page-title">SQL Lab</h1>
      <p className="page-subtitle">
        Choose a predefined analytics challenge and inspect the SQL pattern.
      </p>

      <div className="detail-grid">
        <div className="card">
          <div className="card-title">Choose a Challenge</div>
          <div className="step-list">
            {challenges.map((challenge) => (
              <button
                key={challenge.id}
                className="step-row"
                onClick={() => {
                  setSelectedId(challenge.id);
                  setRan(false);
                }}
                style={{
                  width: "100%",
                  background:
                    selected.id === challenge.id ? "var(--surface)" : "transparent",
                  borderLeft: 0,
                  borderRight: 0,
                  borderTop: 0,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <span>{challenge.title}</span>
                <span className="badge info">{challenge.concepts[0]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="detail-panel">
          <div className="card-title">{selected.title}</div>
          <div className="tech-list" style={{ marginBottom: 16 }}>
            {selected.concepts.map((concept) => (
              <span className="tech-pill" key={concept}>
                {concept}
              </span>
            ))}
          </div>
          <div className="sql-block">{selected.sql}</div>
          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => setRan(true)}
          >
            Run Query
          </button>

          {ran && (
            <div className="modal-surface">
              <div className="card-title">Result Preview</div>
              <div className="data-table-mini">
                <table>
                  <thead>
                    <tr>
                      {Object.keys(selected.rows[0]).map((key) => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selected.rows.map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((value) => (
                          <td key={value}>{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
