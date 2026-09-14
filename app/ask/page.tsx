"use client";

import { useState } from "react";

interface AskResult {
  success: boolean;
  question?: string;
  sql?: string;
  results?: Record<string, unknown>[];
  total_rows?: number;
  explanation?: string;
  provider?: string;
  error?: string;
  validation?: {
    read_only: boolean;
    valid_tables: boolean;
    valid_columns: boolean;
    query_cost: string;
    bound_parameters: number;
  };
}

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ q: string; r: AskResult }[]>([]);
  const [showSql, setShowSql] = useState(true);

  async function handleAsk() {
    if (!question.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/v1/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data: AskResult = await res.json();
      setResult(data);
      if (data.success) {
        setHistory((h) => [{ q: question, r: data }, ...h]);
      }
    } catch {
      setResult({ success: false, error: "Could not connect to backend" });
    }
    setLoading(false);
  }

  return (
    <div className="chat-container">
      <h1 className="page-title">Ask FinSight</h1>
      <p className="page-subtitle">
        Ask a finance question and inspect the SQL guardrail path behind the answer.
      </p>

      <div className="chat-input-row">
        <input
          type="text"
          placeholder="Where did I spend the most last month?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
        />
        <button
          className="btn btn-primary"
          onClick={handleAsk}
          disabled={loading || !question.trim()}
        >
          {loading ? "..." : "Ask"}
        </button>
      </div>

      {result && (
        <div className="chat-result">
          <div className="chat-section">
            <div className="chat-section-title">User Question</div>
            <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6 }}>
              {result.question || question}
            </p>
          </div>

          {result.success ? (
            <>
              <div className="chat-section">
                <div className="chat-section-title">Understanding</div>
                <div className="step-list">
                  {inferUnderstanding(result.question || question).map((item) => (
                    <div className="step-row" key={item}>
                      <span>{item}</span>
                      <span className="badge pass">OK</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="chat-section">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div className="chat-section-title">Generated SQL</div>
                  <button className="metric-link" onClick={() => setShowSql((v) => !v)}>
                    {showSql ? "Hide SQL" : "Show SQL"}
                  </button>
                </div>
                {showSql && <div className="sql-block">{result.sql}</div>}
              </div>

              <div className="chat-section">
                <div className="chat-section-title">Validation</div>
                <div className="step-list">
                  <div className="step-row">
                    <span>Read-only SELECT or WITH query</span>
                    <span className="badge pass">
                      {result.validation?.read_only ? "PASS" : "FAIL"}
                    </span>
                  </div>
                  <div className="step-row">
                    <span>Valid tables</span>
                    <span className="badge pass">
                      {result.validation?.valid_tables ? "PASS" : "FAIL"}
                    </span>
                  </div>
                  <div className="step-row">
                    <span>Valid columns</span>
                    <span className="badge pass">
                      {result.validation?.valid_columns ? "PASS" : "FAIL"}
                    </span>
                  </div>
                  <div className="step-row">
                    <span>Query cost acceptable</span>
                    <span className="badge pass">
                      {result.validation?.query_cost?.toUpperCase() || "PASS"}
                    </span>
                  </div>
                </div>
              </div>

              {result.results && result.results.length > 0 && (
                <div className="chat-section">
                  <div className="chat-section-title">
                    Result ({result.total_rows} rows)
                  </div>
                  <div
                    className="table-container"
                    style={{ border: "none", maxHeight: 300, overflow: "auto" }}
                  >
                    <table>
                      <thead>
                        <tr>
                          {Object.keys(result.results[0]).map((key) => (
                            <th key={key}>{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.results.slice(0, 20).map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((val, j) => (
                              <td key={j} style={{ fontSize: 12 }}>
                                {val === null ? "-" : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="chat-section">
                <div className="chat-section-title">Explanation</div>
                <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                  {result.explanation}
                </p>
              </div>

              <div className="chat-section" style={{ fontSize: 11, color: "var(--muted)" }}>
                Provider: {result.provider} - Bound parameters:{" "}
                {result.validation?.bound_parameters || 0}
              </div>
            </>
          ) : (
            <div className="chat-section">
              <p style={{ fontSize: 13, margin: 0 }}>Error: {result.error}</p>
              {result.sql && (
                <>
                  <div className="chat-section-title" style={{ marginTop: 12 }}>
                    Generated SQL
                  </div>
                  <div className="sql-block">{result.sql}</div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {history.length > 1 && (
        <div style={{ marginTop: 32 }}>
          <div className="card-title">Previous Questions</div>
          {history.slice(1).map((h, i) => (
            <div
              key={i}
              style={{
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: 13,
              }}
            >
              <span style={{ color: "var(--muted)" }}>Q:</span> {h.q}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function inferUnderstanding(question: string): string[] {
  const lower = question.toLowerCase();
  const items = ["Identified metric: spending"];

  if (lower.includes("last month") || lower.includes("month")) {
    items.push("Identified time period: monthly");
  }
  if (lower.includes("category") || lower.includes("where") || lower.includes("most")) {
    items.push("Identified grouping: category or merchant");
  }
  if (lower.includes("trend") || lower.includes("over time")) {
    items.push("Identified trend analysis");
  }

  return items;
}
