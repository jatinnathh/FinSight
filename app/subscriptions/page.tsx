"use client";

import { useEffect, useState } from "react";

interface Subscription {
  merchant: string;
  amount: number;
  frequency: string;
  occurrences: number;
  first_seen: string;
  last_seen: string;
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [yearlyTotal, setYearlyTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/subscriptions");
        if (res.ok) {
          const data = await res.json();
          setSubs(data.subscriptions || []);
          setMonthlyTotal(data.monthly_total || 0);
          setYearlyTotal(data.yearly_total || 0);
        }
      } catch {
        // API not available
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <h1 className="page-title">Subscriptions</h1>
      <p className="page-subtitle">Automatically detected recurring payments</p>

      <div className="metrics-grid" style={{ maxWidth: 400, marginBottom: 24 }}>
        <div className="card">
          <div className="card-title">Monthly</div>
          <div className="card-value">{monthlyTotal.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="card-title">Yearly</div>
          <div className="card-value">{yearlyTotal.toLocaleString()}</div>
        </div>
      </div>

      {subs.length > 0 ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Merchant</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th>Frequency</th>
                <th style={{ textAlign: "right" }}>Occurrences</th>
                <th>First Seen</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.merchant}>
                  <td style={{ fontWeight: 500 }}>{s.merchant}</td>
                  <td className="amount">{s.amount.toLocaleString()}</td>
                  <td>
                    <span className="badge">{s.frequency}</span>
                  </td>
                  <td className="amount">{s.occurrences}</td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{s.first_seen}</td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{s.last_seen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <h3>No subscriptions detected</h3>
          <p>Import transaction data to detect recurring payments</p>
        </div>
      )}
    </div>
  );
}
