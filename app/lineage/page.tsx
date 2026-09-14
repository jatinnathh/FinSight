"use client";

import { useState } from "react";

type Model = {
  id: string;
  label: string;
  source: string;
  output: string;
  usedBy: string[];
  sql: string;
};

const models: Model[] = [
  {
    id: "raw",
    label: "raw.transactions",
    source: "CSV upload, demo generator, or future API ingestion",
    output: "stg_transactions",
    usedBy: ["stg_transactions"],
    sql: `SELECT *
FROM transactions;`,
  },
  {
    id: "stg",
    label: "stg_transactions",
    source: "raw.transactions",
    output: "int_clean_transactions",
    usedBy: ["int_clean_transactions", "Data Quality"],
    sql: `SELECT
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
  AND amount IS NOT NULL;`,
  },
  {
    id: "int",
    label: "int_clean_transactions",
    source: "stg_transactions",
    output: "monthly_spending, merchant_metrics",
    usedBy: ["monthly_spending", "merchant_metrics"],
    sql: `SELECT
  t.*,
  COALESCE(m.normalized_name, t.description, 'Unknown') AS merchant,
  COALESCE(c.category_name, 'Uncategorized') AS category
FROM stg_transactions t
LEFT JOIN merchants m ON t.merchant_id = m.merchant_id
LEFT JOIN categories c ON m.category_id = c.category_id
WHERE t.currency IN ('INR', 'USD', 'EUR', 'GBP')
  AND t.status IN ('completed', 'pending', 'failed', 'refunded');`,
  },
  {
    id: "monthly",
    label: "monthly_spending",
    source: "int_clean_transactions",
    output: "dashboard",
    usedBy: ["Dashboard", "Analytics", "Ask FinSight"],
    sql: `WITH monthly AS (
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
FROM monthly;`,
  },
  {
    id: "merchant",
    label: "merchant_metrics",
    source: "int_clean_transactions",
    output: "analytics",
    usedBy: ["Analytics", "Data Detective", "Ask FinSight"],
    sql: `SELECT
  merchant,
  category,
  COUNT(*) AS transaction_count,
  SUM(amount) AS total_spending
FROM int_clean_transactions
WHERE status = 'completed'
  AND amount > 0
GROUP BY merchant, category;`,
  },
  {
    id: "dashboard",
    label: "dashboard",
    source: "monthly_spending, merchant_metrics",
    output: "FinSight UI",
    usedBy: ["Recruiter demo", "User decisions"],
    sql: `SELECT
  SUM(spending) AS total_spending
FROM monthly_spending
WHERE month = DATE_TRUNC('month', CURRENT_DATE);`,
  },
];

export default function LineagePage() {
  const [selectedId, setSelectedId] = useState("monthly");
  const selected = models.find((model) => model.id === selectedId) || models[0];

  return (
    <div>
      <h1 className="page-title">Lineage</h1>
      <p className="page-subtitle">
        Trace a dashboard number back through source data, SQL models, and quality checks.
      </p>

      <div className="detail-grid">
        <div className="lineage-canvas">
          <div className="lineage-graph">
            <LineageNode modelId="raw" selectedId={selectedId} onSelect={setSelectedId} />
            <Connector />
            <LineageNode modelId="stg" selectedId={selectedId} onSelect={setSelectedId} />
            <Connector />
            <LineageNode modelId="int" selectedId={selectedId} onSelect={setSelectedId} />
            <Connector />
            <div className="lineage-row">
              <LineageNode modelId="monthly" selectedId={selectedId} onSelect={setSelectedId} />
              <LineageNode modelId="merchant" selectedId={selectedId} onSelect={setSelectedId} />
            </div>
            <Connector />
            <LineageNode modelId="dashboard" selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        </div>

        <div className="detail-panel">
          <div className="card-title">{selected.label}</div>
          <div className="detective-stat">
            <span className="label">Source</span>
            <span className="value">{selected.source}</span>
          </div>
          <div className="detective-stat">
            <span className="label">Output</span>
            <span className="value">{selected.output}</span>
          </div>

          <div style={{ marginTop: 18 }}>
            <div className="card-title">SQL</div>
            <div className="sql-block">{selected.sql}</div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div className="card-title">Used By</div>
            <div className="step-list">
              {selected.usedBy.map((consumer) => (
                <div className="step-row" key={consumer}>
                  <span>{consumer}</span>
                  <span className="badge info">CONSUMER</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LineageNode({
  modelId,
  selectedId,
  onSelect,
}: {
  modelId: string;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const model = models.find((item) => item.id === modelId);
  if (!model) return null;

  return (
    <button
      className={`lineage-node${selectedId === modelId ? " active" : ""}`}
      onClick={() => onSelect(modelId)}
    >
      {model.label}
    </button>
  );
}

function Connector() {
  return <div className="pipeline-connector">|</div>;
}
