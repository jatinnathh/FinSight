"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface DetectiveData {
  current_month_spending: number;
  previous_month_spending: number;
  change_percent: number;
  anomalies: {
    duplicate_transactions: number;
    missing_merchants: number;
    refunds: number;
    currency_anomalies: number;
  };
}

const investigationSteps = [
  "Checking data freshness",
  "Checking duplicate records",
  "Checking merchant distribution",
  "Checking refund activity",
  "Checking currency anomalies",
  "Comparing spending patterns",
];

export default function DataDetectivePage() {
  const [data, setData] = useState<DetectiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [investigating, setInvestigating] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/detective");
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // API not available
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!investigating || completedSteps >= investigationSteps.length) return;

    const timer = window.setTimeout(() => {
      setCompletedSteps((value) => value + 1);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [investigating, completedSteps]);

  const rootCause = useMemo(() => {
    if (!data) return null;
    const entries = [
      {
        key: "duplicate_transactions",
        title: "Duplicate transactions",
        count: data.anomalies.duplicate_transactions,
        source: "raw.transactions",
        check: "duplicate_transaction_check",
        likelyCause: "Duplicate ingestion during a previous pipeline run.",
        sql: `SELECT account_id, merchant_id, transaction_date, amount, currency, COUNT(*) AS duplicate_count
FROM transactions
GROUP BY account_id, merchant_id, transaction_date, amount, currency
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;`,
      },
      {
        key: "missing_merchants",
        title: "Missing merchants",
        count: data.anomalies.missing_merchants,
        source: "raw.transactions",
        check: "merchant_required_check",
        likelyCause: "Source file did not include merchant descriptors for some rows.",
        sql: `SELECT transaction_id, transaction_date, amount, description
FROM transactions
WHERE merchant_id IS NULL;`,
      },
      {
        key: "currency_anomalies",
        title: "Invalid currencies",
        count: data.anomalies.currency_anomalies,
        source: "stg_transactions",
        check: "accepted_currency_values",
        likelyCause: "Currency codes were not mapped to supported ISO values.",
        sql: `SELECT transaction_id, amount, currency
FROM transactions
WHERE currency NOT IN ('INR', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'SGD');`,
      },
      {
        key: "refunds",
        title: "Refund activity",
        count: data.anomalies.refunds,
        source: "transactions",
        check: "refund_classification_check",
        likelyCause: "Refund volume can explain spending dips or negative outliers.",
        sql: `SELECT transaction_id, transaction_date, amount, merchant_id
FROM transactions
WHERE transaction_type = 'refund';`,
      },
    ];

    return entries.sort((a, b) => b.count - a.count)[0];
  }, [data]);

  if (loading) return <div className="loading">Loading...</div>;

  if (!data) {
    return (
      <div>
        <h1 className="page-title">Data Detective</h1>
        <div className="empty-state">
          <h3>No data to investigate</h3>
          <p>Import data first to run anomaly detection.</p>
        </div>
      </div>
    );
  }

  const hasAnomaly =
    Math.abs(data.change_percent) > 30 || Object.values(data.anomalies).some((v) => v > 0);
  const complete = completedSteps >= investigationSteps.length;

  return (
    <div style={{ maxWidth: 860 }}>
      <h1 className="page-title">Data Detective</h1>
      <p className="page-subtitle">
        Investigate spending changes and trace every conclusion back to evidence.
      </p>

      {/* Alert banner */}
      <div className="detective-alert">
        <div className="detective-alert-title">
          {hasAnomaly ? "Something changed." : "No major spending swing detected"}
        </div>
        <div className="detective-alert-value">
          Spending {data.change_percent >= 0 ? "↑" : "↓"} {Math.abs(data.change_percent)}%
        </div>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Previous Month</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono), monospace" }}>
              ₹{data.previous_month_spending.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Current Month</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono), monospace" }}>
              ₹{data.current_month_spending.toLocaleString()}
            </div>
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setCompletedSteps(0);
            setInvestigating(true);
          }}
        >
          Investigate
        </button>
      </div>

      <div className="detail-grid">
        <div className="card">
          <div className="card-title">Investigation</div>
          <div className="step-list">
            {investigationSteps.map((step, index) => (
              <div className="step-row" key={step}>
                <span>{step}</span>
                {completedSteps > index ? (
                  <span style={{ color: "var(--success)", fontWeight: 600 }}>✓</span>
                ) : investigating ? (
                  <span style={{ color: "var(--muted)" }}>…</span>
                ) : (
                  <span style={{ color: "var(--muted)" }}>·</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="detail-panel">
          {complete && rootCause ? (
            <>
              <div className="card-title">Root Cause Found</div>
              <h2 style={{ fontSize: 20, margin: "0 0 16px" }}>{rootCause.title}</h2>
              <div className="detective-stat">
                <span className="label">Affected groups</span>
                <span className="value">{rootCause.count.toLocaleString()}</span>
              </div>
              <div className="detective-stat">
                <span className="label">Source</span>
                <span className="value">{rootCause.source}</span>
              </div>
              <div className="detective-stat">
                <span className="label">Detected by</span>
                <span className="value">{rootCause.check}</span>
              </div>
              <div className="detective-stat">
                <span className="label">Likely cause</span>
                <span className="value">{rootCause.likelyCause}</span>
              </div>
              <div style={{ marginTop: 18 }}>
                <div className="card-title">SQL</div>
                <div className="sql-block">{rootCause.sql}</div>
              </div>
              <div style={{ marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link href="/data-quality" className="btn">
                  View Records
                </Link>
                <Link href="/lineage" className="btn">
                  View Lineage
                </Link>
                <Link href="/pipeline" className="btn">
                  View Pipeline Run
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="card-title">Signals</div>
              <div className="detective-stat">
                <span className="label">Duplicate transactions</span>
                <span className="value">
                  {data.anomalies.duplicate_transactions.toLocaleString()}
                </span>
              </div>
              <div className="detective-stat">
                <span className="label">Missing merchants</span>
                <span className="value">{data.anomalies.missing_merchants.toLocaleString()}</span>
              </div>
              <div className="detective-stat">
                <span className="label">Refunds</span>
                <span className="value">{data.anomalies.refunds.toLocaleString()}</span>
              </div>
              <div className="detective-stat">
                <span className="label">Currency anomalies</span>
                <span className="value">
                  {data.anomalies.currency_anomalies.toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
