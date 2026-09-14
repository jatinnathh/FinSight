"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type IncidentType =
  | "duplicates"
  | "missing_categories"
  | "invalid_currencies"
  | "future_dates"
  | "negative_amounts";

const INCIDENTS: { type: IncidentType; label: string; description: string }[] = [
  { type: "duplicates", label: "500 duplicate transactions", description: "Insert 500 exact-copy rows to trigger the duplicate check" },
  { type: "missing_categories", label: "Missing categories", description: "Set category_id to NULL on 300 merchant records" },
  { type: "invalid_currencies", label: "Invalid currencies", description: "Change 200 transactions to invalid currency codes (XYZ, ABC)" },
  { type: "future_dates", label: "Future dates", description: "Set 150 transaction dates to next year" },
  { type: "negative_amounts", label: "Negative non-refund amounts", description: "Make 100 debit transactions have negative amounts" },
];

type Phase = "select" | "injecting" | "pipeline" | "failed" | "investigating" | "fixing" | "fixed";

interface PipelineStep {
  name: string;
  status: "pending" | "running" | "ok" | "error" | "blocked";
  detail?: string;
}

export default function BreakPipelinePage() {
  const [selectedIncident, setSelectedIncident] = useState<IncidentType>("duplicates");
  const [phase, setPhase] = useState<Phase>("select");
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [pipelineIdx, setPipelineIdx] = useState(0);
  const [injectedCount, setInjectedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const incidentInfo = INCIDENTS.find((i) => i.type === selectedIncident)!;

  // Animate pipeline steps
  useEffect(() => {
    if (phase !== "pipeline" && phase !== "fixing") return;
    if (pipelineIdx >= pipelineSteps.length) {
      // Pipeline animation done
      if (phase === "pipeline") {
        setPhase("failed");
      } else if (phase === "fixing") {
        setPhase("fixed");
      }
      return;
    }

    const timer = setTimeout(() => {
      setPipelineSteps((prev) => {
        const next = [...prev];
        const step = next[pipelineIdx];
        if (phase === "fixing") {
          step.status = "ok";
          step.detail = undefined;
        } else {
          // During inject pipeline, quality step fails
          if (step.name === "Quality") {
            step.status = "error";
            step.detail = `${injectedCount} affected records`;
          } else if (step.name === "Analytics" && next.find((s) => s.status === "error")) {
            step.status = "blocked";
            step.detail = "BLOCKED — upstream failure";
          } else {
            step.status = "ok";
          }
        }
        return next;
      });
      setPipelineIdx((i) => i + 1);
    }, 500);

    return () => clearTimeout(timer);
  }, [phase, pipelineIdx, pipelineSteps.length, injectedCount]);

  async function handleInject() {
    setPhase("injecting");
    setError(null);
    try {
      const res = await fetch("/api/v1/data/inject-incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_type: selectedIncident }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Injection failed");
        setPhase("select");
        return;
      }
      setInjectedCount(data.injected || 0);

      // Start pipeline animation
      setPipelineSteps([
        { name: "Ingestion", status: "pending" },
        { name: "Staging", status: "pending" },
        { name: "Transformation", status: "pending" },
        { name: "Quality", status: "pending" },
        { name: "Analytics", status: "pending" },
      ]);
      setPipelineIdx(0);
      setPhase("pipeline");
    } catch {
      setError("Could not connect to backend");
      setPhase("select");
    }
  }

  async function handleFix() {
    setPhase("fixing");
    setError(null);
    try {
      const res = await fetch("/api/v1/data/fix-incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_type: selectedIncident }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Fix failed");
        setPhase("failed");
        return;
      }

      // Animate fix pipeline
      setPipelineSteps([
        { name: "Remove injected records", status: "pending" },
        { name: "Re-run quality checks", status: "pending" },
        { name: "Unlock analytics", status: "pending" },
      ]);
      setPipelineIdx(0);
    } catch {
      setError("Could not connect to backend");
      setPhase("failed");
    }
  }

  function handleReset() {
    setPhase("select");
    setPipelineSteps([]);
    setPipelineIdx(0);
    setInjectedCount(0);
    setError(null);
  }

  const statusIcon = (s: PipelineStep["status"]) => {
    switch (s) {
      case "ok": return <span className="pipeline-sim-icon ok">✓</span>;
      case "error": return <span className="pipeline-sim-icon error">✗</span>;
      case "blocked": return <span className="pipeline-sim-icon blocked">—</span>;
      case "running": return <span className="pipeline-sim-icon pending">…</span>;
      default: return <span className="pipeline-sim-icon pending">·</span>;
    }
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 className="page-title">Break the Pipeline</h1>
      <p className="page-subtitle">
        Inject a data incident, watch the pipeline fail, investigate the SQL
        problem, then fix it and verify.
      </p>

      {error && (
        <div className="card" style={{ marginBottom: 16, borderColor: "var(--danger)" }}>
          <p style={{ fontSize: 13, margin: 0, color: "var(--danger)" }}>{error}</p>
        </div>
      )}

      {/* Step 1: Select incident */}
      {phase === "select" && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">Simulate Data Incident</div>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
              Choose a problem to inject into the live database.
            </p>
            <div className="incident-grid">
              {INCIDENTS.map((inc) => (
                <label
                  key={inc.type}
                  className={`incident-option${selectedIncident === inc.type ? " selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="incident"
                    checked={selectedIncident === inc.type}
                    onChange={() => setSelectedIncident(inc.type)}
                  />
                  <div>
                    <div style={{ fontWeight: 500 }}>{inc.label}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                      {inc.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <button className="btn btn-danger" onClick={handleInject}>
              Inject Incident
            </button>
          </div>
        </>
      )}

      {/* Step 2: Injecting */}
      {phase === "injecting" && (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ fontSize: 14, fontWeight: 600 }}>Injecting {incidentInfo.label}...</p>
          <p style={{ fontSize: 12, color: "var(--muted)" }}>Writing bad records to the database</p>
        </div>
      )}

      {/* Step 3: Pipeline running */}
      {(phase === "pipeline" || phase === "failed") && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">
              {phase === "pipeline" ? "Pipeline Running..." : "Pipeline Failed"}
            </div>
            <div className="pipeline-sim">
              {pipelineSteps.map((step, i) => (
                <div key={step.name}>
                  <div className="pipeline-sim-step">
                    {statusIcon(step.status)}
                    <div>
                      <div style={{ fontWeight: 500 }}>{step.name}</div>
                      {step.detail && (
                        <div style={{
                          fontSize: 11,
                          color: step.status === "error" ? "var(--danger)" : "var(--muted)",
                          marginTop: 2,
                        }}>
                          {step.detail}
                        </div>
                      )}
                    </div>
                  </div>
                  {i < pipelineSteps.length - 1 && (
                    <div className="pipeline-sim-connector" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {phase === "failed" && (
            <div className="incident-result error-state" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                ✗ {incidentInfo.label}
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
                {injectedCount} records injected — analytics blocked
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <Link href="/data-quality" className="btn">
                  Investigate
                </Link>
                <button className="btn btn-success" onClick={handleFix}>
                  Fix &amp; Re-run
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Step 4: Investigating (links) */}
      {phase === "investigating" && (
        <div className="card">
          <div className="card-title">Investigation</div>
          <p>Check the Data Quality page to see affected records and SQL.</p>
          <Link href="/data-quality" className="btn btn-primary">
            Go to Data Quality
          </Link>
        </div>
      )}

      {/* Step 5: Fixing */}
      {phase === "fixing" && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">Fixing Pipeline...</div>
          <div className="pipeline-sim">
            {pipelineSteps.map((step, i) => (
              <div key={step.name}>
                <div className="pipeline-sim-step">
                  {statusIcon(step.status)}
                  <span style={{ fontWeight: 500 }}>{step.name}</span>
                </div>
                {i < pipelineSteps.length - 1 && (
                  <div className="pipeline-sim-connector" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 6: Fixed */}
      {phase === "fixed" && (
        <div className="incident-result success-state" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: "var(--success)" }}>
            ✓ Pipeline Restored
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
            Injected records removed. Quality checks passed. Analytics unlocked.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/data-quality" className="btn">
              View Quality
            </Link>
            <Link href="/dashboard" className="btn">
              View Dashboard
            </Link>
            <button className="btn btn-primary" onClick={handleReset}>
              Try Another Incident
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
