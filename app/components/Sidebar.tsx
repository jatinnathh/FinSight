"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { section: "Overview" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/analytics", label: "Analytics" },
  { section: "Manage" },
  { href: "/add-data", label: "Add Data" },
  { href: "/budgets", label: "Budgets" },
  { href: "/subscriptions", label: "Subscriptions" },
  { section: "Intelligence" },
  { href: "/ask", label: "Ask FinSight" },
  { href: "/data-detective", label: "Data Detective" },
  { section: "System" },
  { href: "/data-quality", label: "Data Quality" },
  { href: "/pipeline", label: "Pipeline" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">FinSight</div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item, i) => {
          if ("section" in item && item.section) {
            return (
              <div key={i} className="sidebar-section">
                {item.section}
              </div>
            );
          }
          const isActive =
            pathname === item.href ||
            (item.href && item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href || "/"}
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
