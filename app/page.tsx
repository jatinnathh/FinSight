import Link from "next/link";

const stages = ["Upload", "Clean", "Transform", "Validate", "Analyze"];
const flow = [
  {
    title: "Ingest",
    body: "Python parses CSV exports, detects columns, and loads canonical records into PostgreSQL.",
  },
  {
    title: "Transform",
    body: "SQL models normalize merchants, timestamps, statuses, currencies, and transaction shape.",
  },
  {
    title: "Validate",
    body: "Quality checks surface duplicates, missing categories, invalid currencies, and broken records.",
  },
  {
    title: "Analyze",
    body: "Dashboard metrics, AI answers, and SQL lab results trace back to the modeled data.",
  },
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
          <h1 className="hero-title">From messy financial data to trusted insights</h1>
          <p className="hero-copy">
            Turn inconsistent bank exports, merchant variations, duplicate rows,
            and validation failures into traceable analytics that explain where
            every number came from.
          </p>
          <div className="hero-actions">
            <Link href="/add-data" className="btn btn-primary">
              Try Demo Data
            </Link>
            <Link href="/add-data/upload" className="btn">
              Upload CSV
            </Link>
            <Link href="/pipeline" className="btn">
              Explore Pipeline
            </Link>
          </div>
          <div className="pipeline-strip" aria-label="FinSight workflow">
            {stages.map((stage, index) => (
              <span key={stage} style={{ display: "contents" }}>
                <span className="pipeline-chip">{stage}</span>
                {index < stages.length - 1 && (
                  <span className="pipeline-arrow">-&gt;</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">How It Works</div>
        <div className="flow-grid">
          {flow.map((item) => (
            <div className="flow-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

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
