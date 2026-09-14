"use client";

import { useEffect, useState } from "react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

interface Overview {
  total_spending: number;
  total_transactions: number;
  avg_transaction: number;
  prev_month_spending: number;
  change_percent: number;
  subscription_total: number;
}

interface SpendingMonth {
  month: string;
  spending: number;
}

interface CategoryItem {
  category: string;
  total: number;
  count: number;
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [spending, setSpending] = useState<SpendingMonth[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [ovRes, spRes, catRes] = await Promise.all([
          fetch("/api/v1/dashboard/overview"),
          fetch("/api/v1/dashboard/spending-over-time?months=12"),
          fetch("/api/v1/dashboard/top-categories?limit=8"),
        ]);
        if (ovRes.ok) setOverview(await ovRes.json());
        if (spRes.ok) {
          const d = await spRes.json();
          setSpending(d.data || []);
        }
        if (catRes.ok) {
          const d = await catRes.json();
          setCategories(d.data || []);
        }
      } catch {
        // API not available
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  if (!overview || overview.total_transactions === 0) {
    return (
      <div className="empty-state">
        <h3>No data yet</h3>
        <p>Import your financial data to see analytics.</p>
        <a href="/add-data" className="btn btn-primary">
          Add Data
        </a>
      </div>
    );
  }

  const maxCategory = categories.length > 0 ? categories[0].total : 1;

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">This month</p>

      <div className="metrics-grid">
        <div className="card">
          <div className="card-title">Total Spending</div>
          <div className="card-value">
            {formatCurrency(overview.total_spending)}
          </div>
          <div
            className={`card-change ${overview.change_percent >= 0 ? "positive" : "negative"}`}
          >
            {overview.change_percent >= 0 ? "+" : ""}
            {overview.change_percent}% vs last month
          </div>
          <button className="metric-link" onClick={() => setSelectedMetric("total")}>
            How calculated
          </button>
        </div>
        <div className="card">
          <div className="card-title">Avg Transaction</div>
          <div className="card-value">
            {formatCurrency(overview.avg_transaction)}
          </div>
          <button className="metric-link" onClick={() => setSelectedMetric("average")}>
            How calculated
          </button>
        </div>
        <div className="card">
          <div className="card-title">Transactions</div>
          <div className="card-value">
            {overview.total_transactions.toLocaleString()}
          </div>
          <button className="metric-link" onClick={() => setSelectedMetric("transactions")}>
            How calculated
          </button>
        </div>
        <div className="card">
          <div className="card-title">Subscriptions</div>
          <div className="card-value">
            {formatCurrency(overview.subscription_total)}
          </div>
          <div className="card-change">/month</div>
          <button className="metric-link" onClick={() => setSelectedMetric("subscriptions")}>
            How calculated
          </button>
        </div>
      </div>

      {selectedMetric && (
        <MetricDisclosure
          metricKey={selectedMetric}
          onClose={() => setSelectedMetric(null)}
        />
      )}

      <div className="two-col">
        <div className="card">
          <div className="card-title">Spending Over Time</div>
          <div style={{ height: 260, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spending}>
                <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [formatCurrency(Number(v)), "Spending"]}
                  contentStyle={{
                    fontSize: 12,
                    border: "1px solid #e0e0e0",
                    borderRadius: 4,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="spending"
                  stroke="#000"
                  strokeWidth={1.5}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Top Categories</div>
          <div style={{ marginTop: 12 }}>
            {categories.map((cat) => (
              <div
                key={cat.category}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "6px 0",
                }}
              >
                <span style={{ fontSize: 13, width: 120, flexShrink: 0 }}>
                  {cat.category}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    background: "#f0f0f0",
                    borderRadius: 3,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(cat.total / maxCategory) * 100}%`,
                      background: "#000",
                      borderRadius: 3,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: "var(--font-mono), monospace",
                    width: 80,
                    textAlign: "right",
                  }}
                >
                  {formatCurrency(cat.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCurrency(n: number): string {
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(0);
}

const metricDefinitions: Record<
  string,
  {
    title: string;
    source: string;
    model: string;
    filters: string;
    aggregation: string;
    sql: string;
  }
> = {
  total: {
    title: "Total Spending",
    source: "marts.monthly_spending",
    model: "monthly_spending.sql",
    filters: "status = 'completed', amount > 0, current month",
    aggregation: "SUM(amount)",
    sql: `SELECT COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS total_spending
FROM transactions
WHERE status = 'completed'
  AND transaction_date >= date_trunc('month', CURRENT_DATE);`,
  },
  average: {
    title: "Avg Transaction",
    source: "marts.monthly_spending",
    model: "monthly_spending.sql",
    filters: "status = 'completed', amount > 0, current month",
    aggregation: "AVG(amount)",
    sql: `SELECT COALESCE(AVG(CASE WHEN amount > 0 THEN amount END), 0) AS avg_transaction
FROM transactions
WHERE status = 'completed'
  AND transaction_date >= date_trunc('month', CURRENT_DATE);`,
  },
  transactions: {
    title: "Transactions",
    source: "staging.stg_transactions",
    model: "stg_transactions.sql",
    filters: "status = 'completed', current month",
    aggregation: "COUNT(*)",
    sql: `SELECT COUNT(*) AS total_transactions
FROM transactions
WHERE status = 'completed'
  AND transaction_date >= date_trunc('month', CURRENT_DATE);`,
  },
  subscriptions: {
    title: "Subscriptions",
    source: "marts.subscription_detection",
    model: "subscription_detection.sql",
    filters: "recurring merchants with similar amount and interval",
    aggregation: "SUM(monthly amount)",
    sql: `SELECT COALESCE(SUM(amount), 0) AS total
FROM subscriptions;`,
  },
};

function MetricDisclosure({
  metricKey,
  onClose,
}: {
  metricKey: string;
  onClose: () => void;
}) {
  const metric = metricDefinitions[metricKey];
  if (!metric) return null;

  return (
    <div className="modal-surface" style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div className="card-title">How This Metric Is Calculated</div>
          <h2 style={{ fontSize: 18, margin: "0 0 12px" }}>{metric.title}</h2>
        </div>
        <button className="btn" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="metrics-grid" style={{ marginBottom: 18 }}>
        <div>
          <div className="card-title">Source</div>
          <div style={{ fontSize: 13 }}>{metric.source}</div>
        </div>
        <div>
          <div className="card-title">SQL Model</div>
          <div style={{ fontSize: 13 }}>{metric.model}</div>
        </div>
        <div>
          <div className="card-title">Filters</div>
          <div style={{ fontSize: 13 }}>{metric.filters}</div>
        </div>
        <div>
          <div className="card-title">Aggregation</div>
          <div style={{ fontSize: 13 }}>{metric.aggregation}</div>
        </div>
      </div>
      <div className="sql-block">{metric.sql}</div>
    </div>
  );
}
