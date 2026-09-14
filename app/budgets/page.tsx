"use client";

import { useEffect, useState } from "react";

interface Budget {
  budget_id: number;
  category: string;
  monthly_limit: number;
  current_spending: number;
  percent_used: number;
}

interface Category {
  category_id: number;
  category_name: string;
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadBudgets() {
    setLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([
        fetch("/api/v1/budgets"),
        fetch("/api/v1/categories"),
      ]);
      if (bRes.ok) {
        const d = await bRes.json();
        setBudgets(d.budgets || []);
      }
      if (cRes.ok) {
        const d = await cRes.json();
        setCategories(d.categories || []);
      }
    } catch {
      // API not available
    }
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialBudgets() {
      try {
        const [bRes, cRes] = await Promise.all([
          fetch("/api/v1/budgets"),
          fetch("/api/v1/categories"),
        ]);
        if (cancelled) return;
        if (bRes.ok) {
          const d = await bRes.json();
          setBudgets(d.budgets || []);
        }
        if (cRes.ok) {
          const d = await cRes.json();
          setCategories(d.categories || []);
        }
      } catch {
        // API not available
      }
      if (!cancelled) setLoading(false);
    }

    loadInitialBudgets();
    return () => {
      cancelled = true;
    };
  }, []);

  async function addBudget() {
    if (!newCategoryId || !newLimit) return;
    try {
      await fetch("/api/v1/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: parseInt(newCategoryId),
          monthly_limit: parseFloat(newLimit),
        }),
      });
      setNewCategoryId("");
      setNewLimit("");
      loadBudgets();
    } catch {
      // handle error
    }
  }

  async function deleteBudget(id: number) {
    try {
      await fetch(`/api/v1/budgets/${id}`, { method: "DELETE" });
      loadBudgets();
    } catch {
      // handle error
    }
  }

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 className="page-title">Budgets</h1>
      <p className="page-subtitle">Set monthly spending limits by category</p>

      {budgets.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          {budgets.map((b) => (
            <div key={b.budget_id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{b.category}</span>
                <span style={{ fontSize: 12, fontFamily: "var(--font-mono), monospace" }}>
                  {b.current_spending.toLocaleString()} / {b.monthly_limit.toLocaleString()}
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill${b.percent_used > 90 ? " danger" : b.percent_used > 70 ? " warning" : ""}`}
                  style={{ width: `${Math.min(100, b.percent_used)}%` }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>
                  {b.percent_used}% used
                  {b.percent_used > 90 ? " -- approaching limit" : ""}
                </span>
                <button
                  onClick={() => deleteBudget(b.budget_id)}
                  style={{ fontSize: 11, color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}
                >
                  remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-title">Add Budget</div>
        <div style={{ display: "flex", gap: 8, alignItems: "end", marginTop: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Category</label>
            <select
              value={newCategoryId}
              onChange={(e) => setNewCategoryId(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">Select...</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Monthly Limit</label>
            <input
              type="number"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              placeholder="10000"
              style={{ width: 120 }}
            />
          </div>
          <button className="btn btn-primary" onClick={addBudget}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
