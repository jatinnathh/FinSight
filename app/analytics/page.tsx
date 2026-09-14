"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface MerchantItem {
  merchant: string;
  total: number;
  count: number;
}

interface CategoryMonthly {
  month: string;
  category: string;
  total: number;
}

export default function AnalyticsPage() {
  const [merchants, setMerchants] = useState<MerchantItem[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryMonthly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [mRes, cRes] = await Promise.all([
          fetch("/api/v1/analytics/merchants?limit=15"),
          fetch("/api/v1/analytics/category-monthly"),
        ]);
        if (mRes.ok) {
          const d = await mRes.json();
          setMerchants(d.data || []);
        }
        if (cRes.ok) {
          const d = await cRes.json();
          setCategoryData(d.data || []);
        }
      } catch {
        // API not available
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  // Group category data by month for chart
  const months = [...new Set(categoryData.map((d) => d.month))].sort();
  const topCategories = [...new Set(categoryData.map((d) => d.category))].slice(0, 5);

  const chartData = months.map((month) => {
    const row: Record<string, string | number> = { month: month.slice(5) };
    topCategories.forEach((cat) => {
      const entry = categoryData.find((d) => d.month === month && d.category === cat);
      row[cat] = entry ? entry.total : 0;
    });
    return row;
  });

  return (
    <div>
      <h1 className="page-title">Analytics</h1>

      <div className="two-col">
        <div className="card">
          <div className="card-title">Top Merchants</div>
          <div style={{ height: 400, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={merchants} layout="vertical">
                <CartesianGrid stroke="#eee" strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
                  }
                />
                <YAxis
                  type="category"
                  dataKey="merchant"
                  tick={{ fontSize: 11 }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, border: "1px solid #e0e0e0", borderRadius: 4 }}
                />
                <Bar dataKey="total" fill="#000" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Category Spending Over Time</div>
          <div style={{ height: 400, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, border: "1px solid #e0e0e0", borderRadius: 4 }}
                />
                {topCategories.map((cat, i) => (
                  <Bar
                    key={cat}
                    dataKey={cat}
                    stackId="a"
                    fill={`hsl(0, 0%, ${20 + i * 15}%)`}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
