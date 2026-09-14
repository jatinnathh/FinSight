"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Check {
  check_name: string;
  status: string;
  details: string;
  affected_rows: number;
}

interface Detail {
  check_name: string;
  sql: string | null;
  records: Record<string, unknown>[];
}

export default function DataQualityPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [selected, setSelected] = useState<Check | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showRecords, setShowRecords] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/data/quality");
        if (res.ok) {
          const data = await res.json();
          const loadedChecks = data.checks || [];
          setChecks(loadedChecks);
          const firstActionable =
            loadedChecks.find((c: Check) => c.affected_rows > 0 && c.status !== "info") ||
            loadedChecks[0];
          if (firstActionable) {
            setSelected(firstActionable);
          }
        }
      } catch {
        // API not available
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!selected || selected.status === "info") {
      return;
    }
    const checkName = selected.check_name;
    setShowRecords(false);

    async function loadDetail() {
      setDetailLoading(true);
      try {
        const res = await fetch(
          `/api/v1/data/quality/detail?check_name=${encodeURIComponent(checkName)}`
        );
        if (res.ok) {
          setDetail(await res.json());
        }
      } catch {
        setDetail(null);
      }
      setDetailLoading(false);
    }

    loadDetail();
  }, [selected]);

  if (loading) return <div className="loading">Loading...</div>;

  const passed = checks.filter((c) => c.status === "pass").length;
  const warned = checks.filter((c) => c.status === "warn").length;
  const failed = checks.filter((c) => c.status === "fail").length;

  return (
    <div>
      <h1 className="page-title">Data Quality</h1>
      <p className="page-subtitle">
        Investigate data-quality failures. Click a check to see the SQL and
        affected records.
      </p>

      <div className="metrics-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-title">Passed</div>
          <div className="card-value" style={{ color: "var(--success)" }}>{passed}</div>
        </div>
        <div className="card">
          <div className="card-title">Warnings</div>
          <div className="card-value" style={{ color: "var(--warning)" }}>{warned}</div>
        </div>
        <div className="card">
          <div className="card-title">Failed</div>
          <div className="card-value" style={{ color: "var(--danger)" }}>{failed}</div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="card">
          <div className="card-title">Check Results</div>
          {checks.map((check) => (
            <button
              key={check.check_name}
              className="check-item"
              onClick={() => setSelected(check)}
              style={{
                width: "100%",
                background: selected?.check_name === check.check_name ? "var(--surface)" : "none",
                borderLeft: 0,
                borderRight: 0,
                borderTop: 0,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              <span className={`check-icon ${check.status}`}>
                {check.status === "pass"
                  ? "✓"
                  : check.status === "warn"
                    ? "⚠"
                    : check.status === "fail"
                      ? "✗"
                      : "·"}
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
                    fontSize: 12,
                    fontFamily: "var(--font-mono), monospace",
                    fontWeight: 600,
                    color: check.status === "fail" ? "var(--danger)" : "var(--warning)",
                  }}
                >
                  {check.affected_rows.toLocaleString()}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="detail-panel">
          <div className="card-title">{selected?.check_name || "Select Check"}</div>
          {selected ? (
            <>
              <div className="detective-stat">
                <span className="label">Status</span>
                <span className={`badge ${selected.status === "pass" ? "success-badge" : selected.status === "fail" ? "danger-badge" : selected.status === "warn" ? "warn-badge" : ""}`}>
                  {selected.status.toUpperCase()}
                </span>
              </div>
              <div className="detective-stat">
                <span className="label">Affected rows</span>
                <span className="value">{selected.affected_rows.toLocaleString()}</span>
              </div>

              {detailLoading && <div className="loading">Loading detail...</div>}

              {!detailLoading && selected.status !== "info" && detail && (
                <>
                  {/* SQL Section — always shown for investigation */}
                  {detail.sql && (
                    <div style={{ marginTop: 18 }}>
                      <div className="card-title">SQL Check</div>
                      <div className="sql-block">{detail.sql}</div>
                    </div>
                  )}

                  {/* Show Records toggle */}
                  {detail.records.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <button
                        className="btn"
                        onClick={() => setShowRecords(!showRecords)}
                      >
                        {showRecords
                          ? "Hide Records"
                          : `Show ${detail.records.length} Records`}
                      </button>
                    </div>
                  )}

                  {showRecords && detail.records.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div className="card-title">Affected Records</div>
                      <div className="data-table-mini">
                        <table>
                          <thead>
                            <tr>
                              {Object.keys(detail.records[0]).map((key) => (
                                <th key={key}>{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {detail.records.map((row, index) => (
                              <tr key={index}>
                                {Object.values(row).map((value, valueIndex) => (
                                  <td key={valueIndex} style={{ fontSize: 12 }}>
                                    {value === null ? "NULL" : String(value)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {detail.records.length === 0 && (
                    <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 14 }}>
                      No affected records found for this check.
                    </p>
                  )}

                  <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
                    <Link href="/lineage" className="btn">
                      View Lineage
                    </Link>
                    <Link href="/pipeline" className="btn">
                      View Pipeline
                    </Link>
                  </div>
                </>
              )}
            </>
          ) : (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>
              Run quality checks to inspect issues.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
