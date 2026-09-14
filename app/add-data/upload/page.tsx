"use client";

import { useState, useRef } from "react";
import Link from "next/link";

const CANONICAL_COLUMNS = [
  "transaction_date",
  "merchant",
  "amount",
  "currency",
  "status",
  "transaction_type",
  "description",
  "(skip)",
];

export default function UploadPage() {
  const [step, setStep] = useState<"upload" | "map" | "validate" | "done">("upload");
  const [csvContent, setCsvContent] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [sample, setSample] = useState<string[][]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState<{
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    errors: { type: string; message: string }[];
    warnings: { type: string; message: string }[];
    missing_optional_fields: string[];
    duplicate_count: number;
    issues: { type: string; message: string }[];
  } | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragover, setDragover] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/v1/data/upload-csv", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setCsvContent(await file.text());
        setHeaders(data.headers);
        setSample(data.sample);
        setTotalRows(data.total_rows);
        setMapping(data.suggested_mapping || {});
        setStep("map");
      }
    } catch {
      // handle error
    }
    setLoading(false);
  }

  async function handleValidate() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/data/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping, csv_content: csvContent }),
      });
      const data = await res.json();
      if (res.ok) {
        setValidationResult(data);
        setStep("validate");
      }
    } catch {
      // handle error
    }
    setLoading(false);
  }

  async function handleImport() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/data/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping, csv_content: csvContent, account_id: 1 }),
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult(`Imported ${data.inserted} rows. Skipped ${data.skipped}.`);
        setStep("done");
      }
    } catch {
      // handle error
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 className="page-title">Upload CSV</h1>

      {step === "upload" && (
        <>
          <div
            className={`upload-zone${dragover ? " dragover" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
            onDragLeave={() => setDragover(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragover(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <p style={{ fontSize: 14, marginBottom: 4 }}>
              {loading ? "Uploading..." : "Drop a CSV file here, or click to browse"}
            </p>
            <p style={{ fontSize: 12, color: "var(--muted)" }}>
              Supports .csv files
            </p>
          </div>
        </>
      )}

      {step === "map" && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13 }}>
              Detected {totalRows.toLocaleString()} rows with {headers.length} columns
            </p>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">Column Mapping</div>
            {headers.map((header) => (
              <div key={header} className="mapping-row">
                <span style={{ width: 160, fontSize: 13, fontFamily: "var(--font-mono), monospace" }}>
                  {header}
                </span>
                <span className="mapping-arrow">--&gt;</span>
                <select
                  value={mapping[header] || "(skip)"}
                  onChange={(e) =>
                    setMapping((m) => ({ ...m, [header]: e.target.value }))
                  }
                  style={{ flex: 1 }}
                >
                  {CANONICAL_COLUMNS.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {sample.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Sample Data (first 5 rows)</div>
              <div className="table-container" style={{ border: "none" }}>
                <table>
                  <thead>
                    <tr>
                      {headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sample.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} style={{ fontSize: 12 }}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button className="btn btn-primary" onClick={handleValidate} disabled={loading}>
            {loading ? "Validating..." : "Validate Mapping"}
          </button>
        </>
      )}

      {step === "validate" && validationResult && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">Validation Result</div>
            <div className="detective-stat">
              <span className="label">Total rows</span>
              <span className="value">{validationResult.total_rows.toLocaleString()}</span>
            </div>
            <div className="detective-stat">
              <span className="label">Valid rows</span>
              <span className="value" style={{ color: "var(--success, #22c55e)" }}>{validationResult.valid_rows.toLocaleString()}</span>
            </div>
            <div className="detective-stat">
              <span className="label">Invalid rows</span>
              <span className="value" style={{ color: validationResult.invalid_rows > 0 ? "var(--danger, #ef4444)" : "inherit" }}>
                {validationResult.invalid_rows.toLocaleString()}
              </span>
            </div>
            {validationResult.duplicate_count > 0 && (
              <div className="detective-stat">
                <span className="label">Potential duplicates</span>
                <span className="value">{validationResult.duplicate_count.toLocaleString()}</span>
              </div>
            )}
          </div>

          {validationResult.errors.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Errors (required fields)</div>
              {validationResult.errors.map((issue, i) => (
                <div key={i} className="check-item">
                  <span className="check-icon fail">✕</span>
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          )}

          {validationResult.warnings.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Warnings (optional fields)</div>
              {validationResult.warnings.map((issue, i) => (
                <div key={i} className="check-item">
                  <span className="check-icon warn">!</span>
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => setStep("map")}>
              Back
            </button>
            <button className="btn btn-primary" onClick={handleImport} disabled={loading}>
              {loading ? "Importing..." : "Import Data"}
            </button>
          </div>
        </>
      )}

      {step === "done" && (
        <div className="card">
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            {importResult}
          </p>
          <Link href="/dashboard" className="btn btn-primary">
            View Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
