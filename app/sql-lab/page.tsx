"use client";

import { useState } from "react";

type Challenge = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  concepts: string[];
  sql: string;
  rows: Record<string, string>[];
};

const challenges: Challenge[] = [
  {
    id: "total-spending",
    title: "Find total spending",
    description: "Calculate the total amount spent across all completed transactions.",
    difficulty: "Basic",
    concepts: ["aggregation", "filtering"],
    sql: `SELECT
  SUM(amount) AS total_spending,
  COUNT(*) AS transaction_count
FROM transactions
WHERE status = 'completed'
  AND amount > 0;`,
    rows: [
      { total_spending: "42.8Cr", transaction_count: "85,210" },
    ],
  },
  {
    id: "top-merchants",
    title: "Top 5 merchants",
    description: "Find the highest-spending merchants with their transaction counts.",
    difficulty: "Basic",
    concepts: ["aggregation", "JOIN", "ORDER BY", "LIMIT"],
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
    id: "monthly-spending",
    title: "Monthly spending trend",
    description: "Calculate spending grouped by month to see trends over time.",
    difficulty: "Basic",
    concepts: ["DATE_TRUNC", "GROUP BY", "aggregation"],
    sql: `SELECT
  DATE_TRUNC('month', transaction_date) AS month,
  SUM(amount) AS spending,
  COUNT(*) AS transactions
FROM transactions
WHERE status = 'completed'
  AND amount > 0
GROUP BY month
ORDER BY month;`,
    rows: [
      { month: "2026-04", spending: "42.0L", transactions: "4,820" },
      { month: "2026-05", spending: "48.0L", transactions: "5,110" },
      { month: "2026-06", spending: "51.0L", transactions: "5,340" },
    ],
  },
  {
    id: "dedupe",
    title: "Detect duplicates",
    description: "Find duplicate transaction groups using GROUP BY and HAVING.",
    difficulty: "Intermediate",
    concepts: ["GROUP BY", "HAVING", "duplicate detection"],
    sql: `SELECT
  account_id,
  merchant_id,
  transaction_date,
  amount,
  currency,
  COUNT(*) AS duplicate_count
FROM transactions
GROUP BY account_id, merchant_id, transaction_date, amount, currency
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;`,
    rows: [
      { account_id: "12", merchant_id: "45", amount: "1200.00", duplicate_count: "3" },
      { account_id: "7", merchant_id: "23", amount: "899.00", duplicate_count: "2" },
      { account_id: "34", merchant_id: "12", amount: "450.00", duplicate_count: "2" },
    ],
  },
  {
    id: "mom-growth",
    title: "Month-over-month growth",
    description: "Calculate the percentage change in spending between consecutive months.",
    difficulty: "Intermediate",
    concepts: ["CTE", "LAG", "window function"],
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
      { month: "2026-04", spending: "42.0L", previous: "39.8L", growth_percent: "5.5%" },
      { month: "2026-05", spending: "48.0L", previous: "42.0L", growth_percent: "14.2%" },
      { month: "2026-06", spending: "51.0L", previous: "48.0L", growth_percent: "6.2%" },
    ],
  },
  {
    id: "merchant-growth",
    title: "Merchant growth analysis",
    description: "Compare each merchant's recent vs. earlier spending to find growing merchants.",
    difficulty: "Advanced",
    concepts: ["CTE", "CASE WHEN", "window function", "comparative analysis"],
    sql: `WITH merchant_monthly AS (
  SELECT
    COALESCE(m.normalized_name, 'Unknown') AS merchant,
    DATE_TRUNC('month', t.transaction_date) AS month,
    SUM(t.amount) AS spending
  FROM transactions t
  LEFT JOIN merchants m ON t.merchant_id = m.merchant_id
  WHERE t.status = 'completed' AND t.amount > 0
  GROUP BY merchant, month
),
merchant_trend AS (
  SELECT
    merchant,
    SUM(CASE WHEN month >= CURRENT_DATE - interval '3 months' THEN spending ELSE 0 END) AS recent,
    SUM(CASE WHEN month < CURRENT_DATE - interval '3 months' THEN spending ELSE 0 END) AS earlier
  FROM merchant_monthly
  GROUP BY merchant
)
SELECT
  merchant,
  recent,
  earlier,
  ROUND(((recent - earlier) / NULLIF(earlier, 0)) * 100, 1) AS growth_pct
FROM merchant_trend
WHERE earlier > 0
ORDER BY growth_pct DESC
LIMIT 10;`,
    rows: [
      { merchant: "Blinkit", recent: "8.2L", earlier: "4.1L", growth_pct: "100.0%" },
      { merchant: "Swiggy", recent: "12.4L", earlier: "9.8L", growth_pct: "26.5%" },
    ],
  },
  {
    id: "rolling",
    title: "30-day rolling spending",
    description: "Calculate a rolling 30-day spending window for trend analysis.",
    difficulty: "Advanced",
    concepts: ["window function", "ROWS BETWEEN", "time series"],
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
  {
    id: "anomalies",
    title: "Spending anomalies",
    description: "Detect days with unusually high spending using standard deviation.",
    difficulty: "Advanced",
    concepts: ["window function", "AVG", "STDDEV", "anomaly detection"],
    sql: `WITH daily_spend AS (
  SELECT
    transaction_date,
    SUM(amount) AS daily_total
  FROM transactions
  WHERE status = 'completed' AND amount > 0
  GROUP BY transaction_date
),
stats AS (
  SELECT
    transaction_date,
    daily_total,
    AVG(daily_total) OVER (
      ORDER BY transaction_date
      ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ) AS rolling_avg,
    STDDEV(daily_total) OVER (
      ORDER BY transaction_date
      ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ) AS rolling_stddev
  FROM daily_spend
)
SELECT
  transaction_date,
  daily_total,
  ROUND(rolling_avg::numeric, 0) AS avg,
  ROUND((daily_total - rolling_avg) / NULLIF(rolling_stddev, 0), 2) AS z_score
FROM stats
WHERE (daily_total - rolling_avg) / NULLIF(rolling_stddev, 0) > 2
ORDER BY z_score DESC
LIMIT 10;`,
    rows: [
      { transaction_date: "2026-03-15", daily_total: "4.8L", avg: "1.5L", z_score: "3.2" },
      { transaction_date: "2026-07-22", daily_total: "3.9L", avg: "1.6L", z_score: "2.8" },
    ],
  },
];

export default function SqlLabPage() {
  const [selectedId, setSelectedId] = useState(challenges[0].id);
  const [ran, setRan] = useState(false);
  const selected = challenges.find((c) => c.id === selectedId) || challenges[0];

  return (
    <div>
      <h1 className="page-title">SQL Lab</h1>
      <p className="page-subtitle">
        Choose a data challenge, inspect the SQL pattern, and see the results.
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
                <span className={`badge ${challenge.difficulty === "Basic" ? "pass" : challenge.difficulty === "Intermediate" ? "warn" : "fail"}`} style={{ fontSize: 10 }}>
                  {challenge.difficulty}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="detail-panel">
          <h2 style={{ fontSize: 16, margin: "0 0 6px" }}>{selected.title}</h2>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14, lineHeight: 1.5 }}>
            {selected.description}
          </p>

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
            <>
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
                          {Object.values(row).map((value, vi) => (
                            <td key={vi}>{value}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div className="card-title">SQL Concepts Used</div>
                <div className="step-list">
                  {selected.concepts.map((concept) => (
                    <div className="step-row" key={concept}>
                      <span>{concept}</span>
                      <span style={{ color: "var(--success)", fontWeight: 600, fontSize: 13 }}>✓</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
