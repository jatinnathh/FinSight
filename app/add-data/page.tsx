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
      <p className="page-subtitle">
        Start with a bank export or the intentionally messy demo dataset.
      </p>

      <div className="source-grid">
        <Link href="/add-data/upload" className="source-card">
          <h3>Upload CSV</h3>
          <p>Import a bank or wallet transaction export.</p>
          <ol>
            <li>Detect your columns</li>
            <li>Map them to the FinSight schema</li>
            <li>Validate records before import</li>
            <li>Detect duplicates and anomalies</li>
            <li>Load clean data into PostgreSQL</li>
          </ol>
          <span className="btn btn-primary">Upload CSV</span>
        </Link>

        <div className="source-card" onClick={loading ? undefined : loadDemo}>
          <h3>Try Demo Dataset</h3>
          <p>
            {loading
              ? "Loading 100K transactions..."
              : "100,000 synthetic transactions with deliberate data-quality issues."}
          </p>
          <ul>
            <li>Duplicate records</li>
            <li>Merchant-name variations</li>
            <li>Missing merchants and categories</li>
            <li>Multiple and invalid currencies</li>
            <li>Failed, refunded, debit, and credit transactions</li>
          </ul>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Loading..." : "Load Demo Data"}
          </button>
        </div>

        <div className="source-card" style={{ opacity: 0.4 }}>
          <h3>REST API</h3>
          <p>
            Stream transactions into the same ingestion, validation, and
            transformation pipeline. Coming soon.
          </p>
        </div>

        <div className="source-card" style={{ opacity: 0.4 }}>
          <h3>Bank Export</h3>
          <p>
            Parse statement formats from specific institutions and route them
            through column mapping. Coming soon.
          </p>
        </div>
      </div>

      {result && (
        <div className="card" style={{ marginTop: 24, maxWidth: 600 }}>
          <p style={{ fontSize: 13 }}>{result}</p>
          {result.startsWith("Done") && (
            <Link href="/pipeline" className="btn btn-primary" style={{ marginTop: 12 }}>
              View Pipeline Run
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
