import Link from "next/link";

const journeySteps = [
  { step: 1, title: "Add Data", desc: "Load 100K messy transactions", href: "/add-data" },
  { step: 2, title: "Inspect", desc: "See raw dirty records", href: "/transactions" },
  { step: 3, title: "Validate", desc: "Run SQL quality checks", href: "/data-quality" },
  { step: 4, title: "Transform", desc: "Clean it with SQL models", href: "/transformations" },
  { step: 5, title: "Trace", desc: "Follow data through lineage", href: "/lineage" },
  { step: 6, title: "Analyze", desc: "View traceable dashboard", href: "/dashboard" },
  { step: 7, title: "Investigate", desc: "Diagnose anomalies", href: "/data-detective" },
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
            From messy financial data to trusted insights
          </h1>
          <p className="hero-copy">
            &ldquo;I have messy financial data. Can FinSight make it trustworthy?&rdquo;
            <br />
            <br />
            Follow a guided journey through ingestion, validation, SQL
            transformation, lineage tracking, and analytics — then break the
            pipeline and fix it.
          </p>
          <div className="hero-actions">
            <Link href="/add-data" className="btn btn-primary">
              Start Data Investigation →
            </Link>
            <Link href="/add-data/upload" className="btn">
              Upload CSV
            </Link>
          </div>
        </div>
      </section>

      {/* ── Dataset Hero ── */}
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
              <div className="dataset-stat-label">invalid currency codes</div>
            </div>
          </div>
          <div className="dataset-problem">
            <div className="dataset-problem-title">
              But there&rsquo;s a problem&hellip;
            </div>
            <div className="dataset-problem-body">
              This dataset contains <strong>deliberately broken records</strong>.<br />
              Duplicate transactions, missing merchants, invalid currencies,
              inconsistent date formats, and messy merchant names.
            </div>
            <div>
              <Link href="/add-data" className="btn btn-primary">
                Start Data Investigation →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Journey Steps ── */}
      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="section-heading">The Journey</div>
        <div className="journey-steps">
          {journeySteps.map((s, i) => (
            <div key={s.step}>
              <Link href={s.href} className="journey-step" style={{ textDecoration: "none", color: "inherit" }}>
                <div className="journey-step-num">{s.step}</div>
                <div className="journey-step-content">
                  <div className="journey-step-title">{s.title}</div>
                  <div className="journey-step-desc">{s.desc}</div>
                </div>
              </Link>
              {i < journeySteps.length - 1 && (
                <div className="journey-connector" />
              )}
            </div>
          ))}
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
