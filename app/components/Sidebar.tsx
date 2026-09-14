"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const JOURNEY_STEPS = [
  { href: "/add-data", label: "Add Data", step: 1 },
  { href: "/transactions", label: "Inspect", step: 2 },
  { href: "/data-quality", label: "Validate", step: 3 },
  { href: "/transformations", label: "Transform", step: 4 },
  { href: "/lineage", label: "Trace", step: 5 },
  { href: "/dashboard", label: "Analyze", step: 6 },
  { href: "/data-detective", label: "Investigate", step: 7 },
];

const TOOLS = [
  { href: "/sql-lab", label: "SQL Lab" },
  { href: "/break-pipeline", label: "Break Pipeline" },
  { href: "/ask", label: "Ask FinSight" },
  { href: "/pipeline", label: "Pipeline Runs" },
];

const EXTRAS = [
  { href: "/analytics", label: "Analytics" },
  { href: "/budgets", label: "Budgets" },
  { href: "/subscriptions", label: "Subscriptions" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <Link href="/" className="sidebar-logo" style={{ textDecoration: "none", color: "inherit" }}>
        FinSight
      </Link>
      <nav className="sidebar-nav">
        <div className="sidebar-section">Journey</div>
        {JOURNEY_STEPS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link${isActive ? " active" : ""}`}
            >
              <span className="sidebar-step-num">{item.step}</span>
              {item.label}
            </Link>
          );
        })}

        <div className="sidebar-section">Tools</div>
        {TOOLS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link${isActive ? " active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}

        <div className="sidebar-section">More</div>
        {EXTRAS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link${isActive ? " active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
