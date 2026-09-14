import Link from "next/link";

const pipelineFlow = [
  "Messy Data",
  "Inspect",
  "Pipeline",
  "SQL Transforms",
  "Quality Checks",
  "Lineage",
  "Analytics",
];

const tech = [
  "PostgreSQL",
  "dbt-style SQL",
  "Python",
  "FastAPI",
  "Next.js",
  "Recharts",
  "Docker-ready",
];

export default function Home() {
  return (
    <>
      <section className="hero-shell">
        <div className="hero-inner">
          <div className="hero-brand">FinSight</div>
          <h1 className="hero-title">
            Messy data → trusted data → explainable insights
          </h1>
          <p className="hero-copy">
            A data engineering portfolio project. Load 100K messy financial
            transactions, run SQL transformations, trace lineage, investigate
            anomalies, break the pipeline, and fix it — all with real
            PostgreSQL queries.
          </p>
          <div className="hero-actions">
            <Link href="/add-data" className="btn btn-primary">
              Try Demo Dataset
            </Link>
            <Link href="/add-data/upload" className="btn">
              Upload CSV
            </Link>
            <Link href="/break-pipeline" className="btn">
              Break the Pipeline
            </Link>
          </div>
          <div className="pipeline-strip" aria-label="FinSight pipeline">
            {pipelineFlow.map((stage, index) => (
              <span key={stage} style={{ display: "contents" }}>
                <span className="pipeline-chip">{stage}</span>
                {index < pipelineFlow.length - 1 && (
                  <span className="pipeline-arrow">→</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dataset Stats ── */}
      <section className="landing-section">
        <div className="section-heading">Demo Dataset</div>
        <div className="dataset-hero">
          <div className="dataset-stats">
            <div className="dataset-stat">
              <div className="dataset-stat-value">100,000</div>
              <div className="dataset-stat-label">transactions</div>
            </div>
            <div className="dataset-stat">
              <div className="dataset-stat-value">50</div>
              <div className="dataset-stat-label">users</div>
            </div>
            <div className="dataset-stat">
              <div className="dataset-stat-value">80</div>
              <div className="dataset-stat-label">accounts</div>
            </div>
            <div className="dataset-stat">
              <div className="dataset-stat-value">20</div>
              <div className="dataset-stat-label">months</div>
            </div>
            <div className="dataset-stat">
              <div className="dataset-stat-value">4</div>
              <div className="dataset-stat-label">valid currencies</div>
            </div>
            <div className="dataset-stat">
              <div className="dataset-stat-value" style={{ color: "var(--danger)" }}>3</div>
              <div className="dataset-stat-label">invalid codes</div>
            </div>
          </div>
          <div className="dataset-problem">
            <div className="dataset-problem-title">
              But there&rsquo;s a problem&hellip;
            </div>
            <div className="dataset-problem-body">
              This dataset contains <strong>deliberately broken records</strong>.
              <br />
              Duplicate transactions, missing merchants, invalid currencies,
              inconsistent date formats, and messy merchant names.
            </div>
            <div>
              <Link href="/add-data" className="btn btn-primary">
                Load Data &amp; Investigate →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── What You Can Do ── */}
      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="section-heading">What You Can Do</div>
        <div className="flow-grid">
          <Link href="/pipeline" className="flow-card" style={{ textDecoration: "none", color: "inherit" }}>
            <h3>Run the Pipeline</h3>
            <p>Watch 100K rows flow through ingestion, staging, transformation, quality checks, and analytics.</p>
          </Link>
          <Link href="/break-pipeline" className="flow-card" style={{ textDecoration: "none", color: "inherit" }}>
            <h3>Break It</h3>
            <p>Inject duplicates, invalid currencies, or missing categories — then watch the quality step fail.</p>
          </Link>
          <Link href="/data-quality" className="flow-card" style={{ textDecoration: "none", color: "inherit" }}>
            <h3>Investigate</h3>
            <p>Click failed checks, read the SQL, inspect affected records, and trace the root cause.</p>
          </Link>
          <Link href="/lineage" className="flow-card" style={{ textDecoration: "none", color: "inherit" }}>
            <h3>Trace Lineage</h3>
            <p>Follow any dashboard number back through the SQL DAG to raw source data.</p>
          </Link>
        </div>
      </section>

      {/* ── Tech ── */}
      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="section-heading">Built With</div>
        <div className="tech-list">
          {tech.map((item) => (
            <span className="tech-pill" key={item}>
              {item}
            </span>
          ))}
        </div>
      </section>
    </>
  );
}
