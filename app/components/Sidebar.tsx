"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const DATA_ITEMS = [
  { href: "/add-data", label: "Add Data" },
  { href: "/transactions", label: "Raw Data" },
];

const PIPELINE_ITEMS = [
  { href: "/pipeline", label: "Pipeline Runs" },
  { href: "/transformations", label: "Transformations" },
  { href: "/data-quality", label: "Data Quality" },
  { href: "/lineage", label: "Lineage" },
];

const ANALYTICS_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/sql-lab", label: "SQL Lab" },
  { href: "/data-detective", label: "Data Detective" },
  { href: "/break-pipeline", label: "Break Pipeline" },
];

const AI_ITEMS = [
  { href: "/ask", label: "Ask FinSight" },
];

const MORE_ITEMS = [
  { href: "/analytics", label: "Analytics" },
  { href: "/budgets", label: "Budgets" },
  { href: "/subscriptions", label: "Subscriptions" },
];

export default function Sidebar() {
  const pathname = usePathname();

  function renderLinks(items: { href: string; label: string }[]) {
    return items.map((item) => {
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
    });
  }

  return (
    <aside className="sidebar">
      <Link href="/" className="sidebar-logo" style={{ textDecoration: "none", color: "inherit" }}>
        FinSight
      </Link>
      <nav className="sidebar-nav">
        <div className="sidebar-section">Data</div>
        {renderLinks(DATA_ITEMS)}

        <div className="sidebar-section">Pipeline</div>
        {renderLinks(PIPELINE_ITEMS)}

        <div className="sidebar-section">Analytics</div>
        {renderLinks(ANALYTICS_ITEMS)}

        <div className="sidebar-section">AI</div>
        {renderLinks(AI_ITEMS)}

        <div className="sidebar-section">More</div>
        {renderLinks(MORE_ITEMS)}
      </nav>
    </aside>
  );
}
