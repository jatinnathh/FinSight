"use client";

import { useEffect, useState } from "react";

interface PipelineStatus {
  status: string;
  run_id?: number;
  started_at?: string;
  finished_at?: string;
  rows_processed?: number;
  rows_rejected?: number;
  error_message?: string;
  execution_time?: string;
  steps?: { name: string; status: string; time: string }[];
  message?: string;
}

export default function PipelinePage() {
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/pipeline/status");
        if (res.ok) {
          setPipeline(await res.json());
        }
      } catch {
        // API not available
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  if (!pipeline || pipeline.status === "no_runs") {
    return (
      <div>
        <h1 className="page-title">Pipeline</h1>
        <div className="empty-state">
          <h3>No pipeline runs yet</h3>
          <p>Pipeline status will appear here after data processing</p>
        </div>
      </div>
    );
  }

  const isHealthy = pipeline.status === "completed" || pipeline.status === "success";

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 className="page-title">Pipeline</h1>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="card-title" style={{ margin: 0 }}>
            Status
          </div>
          <span className={`badge ${isHealthy ? "pass" : "fail"}`}>
            {pipeline.status?.toUpperCase()}
          </span>
        </div>

        <div className="detective-stat">
          <span className="label">Run ID</span>
          <span className="value">{pipeline.run_id}</span>
        </div>
        <div className="detective-stat">
          <span className="label">Started</span>
          <span className="value">
            {pipeline.started_at ? new Date(pipeline.started_at).toLocaleString() : "-"}
          </span>
        </div>
        <div className="detective-stat">
          <span className="label">Finished</span>
          <span className="value">
            {pipeline.finished_at ? new Date(pipeline.finished_at).toLocaleString() : "-"}
          </span>
        </div>
        <div className="detective-stat">
          <span className="label">Execution Time</span>
          <span className="value">{pipeline.execution_time || "-"}</span>
        </div>
        <div className="detective-stat">
          <span className="label">Rows Processed</span>
          <span className="value">{pipeline.rows_processed?.toLocaleString() || 0}</span>
        </div>
        <div className="detective-stat">
          <span className="label">Rows Rejected</span>
          <span className="value">{pipeline.rows_rejected?.toLocaleString() || 0}</span>
        </div>
      </div>

      {pipeline.error_message && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title">Error</div>
          <div className="sql-block">{pipeline.error_message}</div>
        </div>
      )}

      {pipeline.steps && Array.isArray(pipeline.steps) && pipeline.steps.length > 0 && (
        <div className="card">
          <div className="card-title">Steps</div>
          {pipeline.steps.map((step, i) => (
            <div key={i} className="pipeline-step">
              <span className="time">{step.time}</span>
              <span className="icon">
                {step.status === "completed" ? "v" : step.status === "failed" ? "x" : "..."}
              </span>
              <span>{step.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
