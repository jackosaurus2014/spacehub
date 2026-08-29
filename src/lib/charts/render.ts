// Chart of the Week — pure-string SVG bar chart, no client library, no DOM.
// Dark theme matching the site (true-black card, cyan bars, slate text).
// The same SVG is rasterized to PNG for email by /api/chart/[slug].

import type { ChartDef } from './registry';

export interface ChartSeries {
  labels: string[];
  values: number[];
  /** Optional footnote, e.g. "Partial month" or the as-of date. */
  note?: string;
}

const W = 1200;
const H = 630;
const PAD = { top: 120, right: 56, bottom: 96, left: 96 };

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function formatValue(v: number, unit: ChartDef['unit']): string {
  if (unit === 'usd') {
    if (v >= 1e9) return `$${(v / 1e9).toFixed(v >= 1e10 ? 0 : 1)}B`;
    if (v >= 1e6) return `$${Math.round(v / 1e6)}M`;
    if (v >= 1e3) return `$${Math.round(v / 1e3)}k`;
    return `$${Math.round(v)}`;
  }
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e4) return `${(v / 1e3).toFixed(1)}k`;
  return String(Math.round(v));
}

/** A "nice" axis ceiling: 1, 2, 2.5, 5 × 10^n at or above max. */
export function niceCeiling(max: number): number {
  if (max <= 0) return 1;
  const exp = Math.floor(Math.log10(max));
  const base = Math.pow(10, exp);
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * base >= max) return m * base;
  }
  return 10 * base;
}

export function renderBarChartSvg(def: ChartDef, series: ChartSeries, opts: { asOf?: Date } = {}): string {
  const { labels, values } = series;
  const n = Math.max(labels.length, 1);
  const max = niceCeiling(Math.max(0, ...values));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / n;
  const barW = Math.max(6, Math.min(72, slot * 0.62));
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;

  const ticks = 4;
  const grid: string[] = [];
  for (let i = 0; i <= ticks; i++) {
    const v = (max / ticks) * i;
    const yy = y(v);
    grid.push(`<line x1="${PAD.left}" x2="${W - PAD.right}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="#1f2937" stroke-width="1"/>`);
    grid.push(`<text x="${PAD.left - 12}" y="${(yy + 5).toFixed(1)}" text-anchor="end" font-size="18" fill="#94a3b8">${esc(formatValue(v, def.unit))}</text>`);
  }

  const bars: string[] = [];
  const every = n > 14 ? Math.ceil(n / 12) : 1;
  labels.forEach((label, i) => {
    const v = values[i] ?? 0;
    const x = PAD.left + slot * i + (slot - barW) / 2;
    const top = y(v);
    const h = Math.max(0, PAD.top + plotH - top);
    bars.push(`<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="url(#bar)"/>`);
    if (v > 0 && n <= 16) {
      bars.push(`<text x="${(x + barW / 2).toFixed(1)}" y="${(top - 10).toFixed(1)}" text-anchor="middle" font-size="18" font-weight="600" fill="#e2e8f0">${esc(formatValue(v, def.unit))}</text>`);
    }
    if (i % every === 0 || i === n - 1) {
      const short = label.length > 14 ? label.slice(0, 13) + '…' : label;
      bars.push(`<text x="${(x + barW / 2).toFixed(1)}" y="${(PAD.top + plotH + 30).toFixed(1)}" text-anchor="middle" font-size="18" fill="#cbd5e1">${esc(short)}</text>`);
    }
  });

  const asOf = (opts.asOf ?? new Date()).toISOString().slice(0, 10);
  const footer = `${def.source} · as of ${asOf}${series.note ? ` · ${series.note}` : ''}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">
<title id="t">${esc(def.title)}</title>
<desc id="d">${esc(def.subtitle)}</desc>
<defs>
  <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#0e7490"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="#050508"/>
<text x="${PAD.left}" y="56" font-size="36" font-weight="700" fill="#ffffff" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif">${esc(def.title)}</text>
<text x="${W - PAD.right}" y="90" text-anchor="end" font-size="16" font-weight="600" fill="#22d3ee" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif">spacenexus.us/chart/${esc(def.slug)}</text>
<text x="${PAD.left}" y="90" font-size="20" fill="#94a3b8" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif">${esc(def.subtitle)}</text>
<g font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif">
${grid.join('\n')}
${bars.join('\n')}
</g>
<text x="${PAD.left}" y="${H - 28}" font-size="16" fill="#64748b" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif">${esc(footer)}</text>
</svg>`;
}
