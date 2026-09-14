"use client";

import { useEffect, useState } from "react";

interface Transaction {
  id: number;
  date: string;
  merchant: string;
  category: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("transaction_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadTransactions() {
      const params = new URLSearchParams({
        page: String(page),
        per_page: "50",
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      try {
        const res = await fetch(`/api/v1/transactions?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          setTransactions(data.transactions || []);
          setTotal(data.total || 0);
          setTotalPages(data.total_pages || 1);
        }
      } catch {
        // API not available
      }
      if (!cancelled) setLoading(false);
    }

    loadTransactions();
    return () => {
      cancelled = true;
    };
  }, [page, search, statusFilter, sortBy, sortOrder]);

  function handleSort(col: string) {
    if (sortBy === col) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
    setPage(1);
  }

  return (
    <div>
      <h1 className="page-title">Transactions</h1>

      <div className="filters-row">
        <input
          type="search"
          placeholder="Search merchants..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ width: 220 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: "auto" }}>
          {total.toLocaleString()} transactions
        </span>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort("transaction_date")}>
                  Date {sortBy === "transaction_date" ? (sortOrder === "asc" ? "^" : "v") : ""}
                </th>
                <th onClick={() => handleSort("merchant")}>Merchant</th>
                <th>Category</th>
                <th onClick={() => handleSort("amount")} style={{ textAlign: "right" }}>
                  Amount {sortBy === "amount" ? (sortOrder === "asc" ? "^" : "v") : ""}
                </th>
                <th onClick={() => handleSort("status")}>Status</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td style={{ fontFamily: "var(--font-mono), monospace", fontSize: 12 }}>
                    {tx.date}
                  </td>
                  <td>{tx.merchant}</td>
                  <td style={{ color: "var(--muted)" }}>{tx.category}</td>
                  <td className={`amount${tx.amount < 0 ? " negative" : ""}`}>
                    {tx.currency === "INR" ? "" : tx.currency + " "}
                    {Math.abs(tx.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td>
                    <span className={`badge ${tx.status}`}>{tx.status}</span>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{tx.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="pagination-buttons">
              <button
                className="btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{ padding: "4px 10px", fontSize: 12 }}
              >
                Prev
              </button>
              <button
                className="btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{ padding: "4px 10px", fontSize: 12 }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
