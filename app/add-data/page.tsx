"use client";

import Link from "next/link";
import { useState } from "react";

export default function AddDataPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function loadDemo() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/v1/data/load-demo", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setResult(
          `Done. ${data.total_transactions?.toLocaleString()} transactions loaded.`
        );
      } else {
        setResult(`Error: ${data.detail || "Failed to load demo data"}`);
      }
    } catch {
      setResult("Error: Could not connect to backend");
    }
    setLoading(false);
  }

  return (
    <div>
      <h1 className="page-title">Add Data</h1>
      <p className="page-subtitle">Choose how to import your financial data</p>

      <div className="source-grid">
        <Link href="/add-data/upload" className="source-card">
          <h3>Upload CSV</h3>
          <p>Import transactions from a CSV file with column mapping</p>
        </Link>

        <div className="source-card" onClick={loading ? undefined : loadDemo}>
          <h3>Demo Data</h3>
          <p>
            {loading
              ? "Loading 100K transactions..."
              : "Load sample dataset with 100K messy transactions"}
          </p>
        </div>

        <div className="source-card" style={{ opacity: 0.4 }}>
          <h3>REST API</h3>
          <p>Connect via API endpoint (coming soon)</p>
        </div>

        <div className="source-card" style={{ opacity: 0.4 }}>
          <h3>Bank Export</h3>
          <p>Import from bank statement (coming soon)</p>
        </div>
      </div>

      {result && (
        <div className="card" style={{ marginTop: 24, maxWidth: 600 }}>
          <p style={{ fontSize: 13 }}>{result}</p>
          {result.startsWith("Done") && (
            <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: 12 }}>
              View Dashboard
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
