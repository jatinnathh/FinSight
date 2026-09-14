"use client";

import { useEffect, useState } from "react";

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

export default function DataDetectivePage() {
  const [data, setData] = useState<DetectiveData | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="loading">Loading...</div>;

  if (!data) {
    return (
      <div>
        <h1 className="page-title">Data Detective</h1>
        <div className="empty-state">
          <h3>No data to investigate</h3>
          <p>Import data first to run anomaly detection</p>
        </div>
      </div>
    );
  }

  const hasAnomaly = Math.abs(data.change_percent) > 30;

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 className="page-title">Data Detective</h1>

      {hasAnomaly && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title">
            ! Spending {data.change_percent > 0 ? "increased" : "decreased"}{" "}
            {Math.abs(data.change_percent)}% this month
          </div>
          <div style={{ display: "flex", gap: 24, margin: "12px 0" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Previous Month</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono), monospace" }}>
                {data.previous_month_spending.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Current Month</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono), monospace" }}>
                {data.current_month_spending.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Investigating...</div>
        <div className="detective-stat">
          <span className="label">Duplicate transactions</span>
          <span className="value">{data.anomalies.duplicate_transactions.toLocaleString()}</span>
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
          <span className="value">{data.anomalies.currency_anomalies.toLocaleString()}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Root Cause Analysis</div>
        <div style={{ fontSize: 13, lineHeight: 1.7 }}>
          {data.anomalies.duplicate_transactions > 0 && (
            <p>
              {data.anomalies.duplicate_transactions.toLocaleString()} duplicate
              transaction groups detected during ingestion. These records share
              identical account, merchant, date, and amount values.
            </p>
          )}
          {data.anomalies.missing_merchants > 0 && (
            <p>
              {data.anomalies.missing_merchants.toLocaleString()} transactions
              have no associated merchant. These require manual categorization
              or merchant normalization.
            </p>
          )}
          {data.anomalies.currency_anomalies > 0 && (
            <p>
              {data.anomalies.currency_anomalies.toLocaleString()} transactions
              use unrecognized currency codes. These should be mapped to
              standard ISO 4217 codes.
            </p>
          )}
          {data.anomalies.duplicate_transactions === 0 &&
            data.anomalies.missing_merchants === 0 &&
            data.anomalies.currency_anomalies === 0 && (
              <p>No significant anomalies detected. Data quality is clean.</p>
            )}
        </div>
      </div>
    </div>
  );
}
