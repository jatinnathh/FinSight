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
}

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ q: string; r: AskResult }[]>([]);

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
        Ask questions about your finances in plain English
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
          {result.success ? (
            <>
              <div className="chat-section">
                <div className="chat-section-title">Answer</div>
                <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                  {result.explanation}
                </p>
              </div>

              {result.results && result.results.length > 0 && (
                <div className="chat-section">
                  <div className="chat-section-title">
                    Results ({result.total_rows} rows)
                  </div>
                  <div className="table-container" style={{ border: "none", maxHeight: 300, overflow: "auto" }}>
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
                <div className="chat-section-title">Generated SQL</div>
                <div className="sql-block">{result.sql}</div>
              </div>

              <div className="chat-section" style={{ fontSize: 11, color: "var(--muted)" }}>
                Provider: {result.provider}
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
            <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
              <span style={{ color: "var(--muted)" }}>Q:</span> {h.q}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
