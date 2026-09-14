"use client";

import { useEffect, useState } from "react";

interface Check {
  check_name: string;
  status: string;
  details: string;
  affected_rows: number;
}

export default function DataQualityPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/data/quality");
        if (res.ok) {
          const data = await res.json();
          setChecks(data.checks || []);
        }
      } catch {
        // API not available
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  const passed = checks.filter((c) => c.status === "pass").length;
  const warned = checks.filter((c) => c.status === "warn").length;
  const failed = checks.filter((c) => c.status === "fail").length;

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 className="page-title">Data Quality</h1>

      <div className="metrics-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-title">Passed</div>
          <div className="card-value">{passed}</div>
        </div>
        <div className="card">
          <div className="card-title">Warnings</div>
          <div className="card-value">{warned}</div>
        </div>
        <div className="card">
          <div className="card-title">Failed</div>
          <div className="card-value">{failed}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Check Results</div>
        {checks.map((check, i) => (
          <div key={i} className="check-item">
            <span className={`check-icon ${check.status}`}>
              {check.status === "pass"
                ? "v"
                : check.status === "warn"
                  ? "!"
                  : check.status === "fail"
                    ? "x"
                    : "-"}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{check.check_name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                {check.details}
              </div>
            </div>
            {check.affected_rows > 0 && check.status !== "info" && (
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono), monospace",
                  color: "var(--muted)",
                }}
              >
                {check.affected_rows}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
