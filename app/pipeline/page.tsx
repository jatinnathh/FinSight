"use client";

import { useEffect, useMemo, useState } from "react";

interface PipelineStep {
  id?: string;
  name: string;
  technology?: string;
  status: string;
  time?: string;
  rows_in?: number;
  rows_out?: number;
  duration_seconds?: number;
  timing_label?: string;
  model?: string;
  input?: string;
  output?: string;
  transformations?: string[];
  passed?: number;
  warnings?: number;
  failed?: number;
}

interface PipelineStatus {
  status: string;
  run_id?: number;
  started_at?: string;
  finished_at?: string;
  rows_processed?: number;
  rows_rejected?: number;
  error_message?: string;
  execution_time?: string;
  steps?: PipelineStep[];
  message?: string;
}

export default function PipelinePage() {
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/pipeline/status");
        if (res.ok) {
          const data: PipelineStatus = await res.json();
          setPipeline(data);
          setSelectedId(data.steps?.[3]?.id || data.steps?.[0]?.id || "");
        }
      } catch {
        // API not available
      }
      setLoading(false);
    }
    load();
  }, []);

  const steps = useMemo(() => pipeline?.steps || [], [pipeline]);
  const selected = steps.find((step) => step.id === selectedId) || steps[0];

  if (loading) return <div className="loading">Loading...</div>;

  if (!pipeline || pipeline.status === "no_runs") {
    return (
      <div>
        <h1 className="page-title">Pipeline Runs</h1>
        <div className="empty-state">
          <h3>No pipeline runs yet</h3>
          <p>Load demo data or upload a CSV to create a traceable run.</p>
          <a href="/add-data" className="btn btn-primary">
            Add Data
          </a>
        </div>
      </div>
    );
  }

  const isHealthy = ["completed", "success"].includes(pipeline.status);

  return (
    <div>
      <h1 className="page-title">Pipeline Runs</h1>
      <p className="page-subtitle">
        Run #{pipeline.run_id} - {pipeline.execution_time || "latest run"} -{" "}
        {pipeline.status.toUpperCase()}
      </p>

      <div className="metrics-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-title">Rows Processed</div>
          <div className="card-value">
            {(pipeline.rows_processed || 0).toLocaleString()}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Rows Rejected</div>
          <div className="card-value">
            {(pipeline.rows_rejected || 0).toLocaleString()}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Status</div>
          <div className="card-value" style={{ fontSize: 20 }}>
            {isHealthy ? "SUCCESS" : pipeline.status.toUpperCase()}
          </div>
        </div>
      </div>

      {pipeline.error_message && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title">Error</div>
          <div className="sql-block">{pipeline.error_message}</div>
        </div>
      )}

      <div className="detail-grid">
        <div className="visual-pipeline">
          {steps.map((step, index) => (
            <div key={step.id || step.name} style={{ display: "contents" }}>
              <button
                className={`pipeline-node${selected?.id === step.id ? " active" : ""}`}
                onClick={() => setSelectedId(step.id || step.name)}
              >
                <div className="pipeline-node-title">{step.name}</div>
                <div className="pipeline-node-meta">
                  {step.technology || step.status}
                </div>
                <div className="pipeline-node-meta">
                  {formatRows(step.rows_out ?? pipeline.rows_processed)}
                  {step.name.toLowerCase() === "quality" &&
                    ` - ${step.passed || 0} pass / ${step.warnings || 0} warn / ${
                      step.failed || 0
                    } fail`}
                </div>
              </button>
              {index < steps.length - 1 && (
                <div className="pipeline-connector">|</div>
              )}
            </div>
          ))}
        </div>

        {selected && (
          <div className="detail-panel">
            <div className="card-title">{selected.name}</div>
            <div className="detective-stat">
              <span className="label">Model</span>
              <span className="value">{selected.model || "-"}</span>
            </div>
            <div className="detective-stat">
              <span className="label">Input</span>
              <span className="value">{selected.input || "-"}</span>
            </div>
            <div className="detective-stat">
              <span className="label">Output</span>
              <span className="value">{selected.output || "-"}</span>
            </div>
            <div className="detective-stat">
              <span className="label">Rows</span>
              <span className="value">
                {formatRows(selected.rows_in)} -&gt; {formatRows(selected.rows_out)}
              </span>
            </div>
            <div className="detective-stat">
              <span className="label">Execution</span>
              <span className="value">
                {selected.duration_seconds
                  ? `${selected.duration_seconds.toFixed(2)}s`
                  : selected.time || "-"}
                {selected.timing_label === "simulated" && (
                  <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 11 }}> (simulated)</span>
                )}
              </span>
            </div>

            {selected.transformations && selected.transformations.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div className="card-title">Transformations</div>
                <div className="step-list">
                  {selected.transformations.map((item) => (
                    <div className="step-row" key={item}>
                      <span>{item}</span>
                      <span className="badge pass">DONE</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatRows(value?: number): string {
  if (value === undefined || value === null) return "-";
  return `${value.toLocaleString()} rows`;
}
