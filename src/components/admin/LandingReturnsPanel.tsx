'use client';

import { useEffect, useState } from 'react';

interface Row { landingPage: string; users: number; returningUsers: number; returnRatePct: number }

// "Which pages produce returning humans" — the week-3 reallocation table.
export default function LandingReturnsPanel() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/admin/analytics/landing-returns')
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`); return j.rows as Row[]; })
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  const sorted = rows ? [...rows].sort((a, b) => b.returningUsers - a.returningUsers) : [];
  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-white font-semibold text-lg">Landing pages → returning users (30d)</h2>
        <span className="text-xs text-slate-500">GA4 · landingPage × newVsReturning · pages with ≥10 users</span>
      </div>
      <p className="text-xs text-slate-400 mb-4">The reallocation number: not which page gets visits, but which page&apos;s visitors come back. Sorted by returning users.</p>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {!rows && !error && <p className="text-sm text-slate-500">Loading…</p>}
      {rows && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                <th className="py-2 pr-3">Landing page</th><th className="py-2 pr-3 text-right">Users</th><th className="py-2 pr-3 text-right">Returning</th><th className="py-2 text-right">Return rate</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.landingPage} className="border-b border-white/[0.04]">
                  <td className="py-1.5 pr-3 font-mono text-xs text-slate-300 truncate max-w-[280px]">{r.landingPage}</td>
                  <td className="py-1.5 pr-3 text-right text-white">{r.users}</td>
                  <td className="py-1.5 pr-3 text-right text-white">{r.returningUsers}</td>
                  <td className={`py-1.5 text-right font-semibold ${r.returnRatePct >= 25 ? 'text-emerald-300' : r.returnRatePct >= 10 ? 'text-amber-300' : 'text-slate-400'}`}>{r.returnRatePct}%</td>
                </tr>
              ))}
              {sorted.length === 0 && <tr><td colSpan={4} className="py-3 text-slate-500 text-sm">No landing pages with ≥10 users yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
