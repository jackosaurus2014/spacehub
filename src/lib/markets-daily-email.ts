// Space Markets Daily email — the sector's market close, weekdays after the
// US close (~21:35 UTC), sent to NewsletterSubscriber rows with
// marketsDaily=true. Clone of the Daily Brief composer discipline:
//
// - Owned data only: everything comes from getMarketsDaily() (which reads the
//   CompanyProfile quotes the stock-sync cron already wrote). No fetches here.
// - ONE compose shared by every recipient; the only per-recipient variation
//   is the {{UNSUBSCRIBE_TOKEN}} placeholder personalizeEmail() fills in.
// - Nothing to say (quote feed down, no movers) → null → the cron records the
//   day as skipped and sends nothing.
// - The provenance line quotes the feed's own asOf; we never invent a time.
import { escapeHtml, fmtUsd } from '@/lib/daily-brief';
import { getMarketsDaily, type MarketsDaily, type IndexMember } from '@/lib/markets-daily';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us';
const SUBJECT_MAX = 78;

export interface ProgramEmail {
  subject: string;
  html: string;
  plain: string;
}

const S = {
  kicker: 'color:#22d3ee;font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin:22px 0 8px;font-weight:600',
  item: 'font-size:14px;line-height:1.5;margin:0 0 8px;color:#e2e8f0',
  meta: 'color:#94a3b8;font-size:12px',
  link: 'color:#7dd3fc;text-decoration:none',
  up: 'color:#4ade80;font-weight:600',
  down: 'color:#f87171;font-weight:600',
};

/** "+1.3%" / "−0.8%" / "0.0%" with a real minus sign for the HTML side. */
export function fmtPct(value: number, opts: { ascii?: boolean } = {}): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) return `+${rounded.toFixed(1)}%`;
  if (rounded < 0) return `${opts.ascii ? '-' : '−'}${Math.abs(rounded).toFixed(1)}%`;
  return '0.0%';
}

/** "2026-09-01 21:35 UTC" from an ISO string; falls back to the raw value. */
export function fmtAsOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

/** The single largest absolute move of the day across both lists. */
export function biggestMover(data: Pick<MarketsDaily, 'topMovers' | 'bottomMovers'>): IndexMember | null {
  const all = [...data.topMovers, ...data.bottomMovers];
  if (all.length === 0) return null;
  return all.reduce((best, m) => (Math.abs(m.changePct) > Math.abs(best.changePct) ? m : best));
}

/**
 * "Space Markets Daily: Index +0.8% · Rocket Lab +5.2%" (≤ 78 chars). The
 * index clause is dropped when fewer than five pure-plays reported; the mover
 * name is trimmed, never the numbers.
 */
export function marketsSubject(data: MarketsDaily): string {
  const mover = biggestMover(data);
  const indexPart = data.index.value === null ? null : `Index ${fmtPct(data.index.value, { ascii: true })}`;
  const prefix = 'Space Markets Daily: ';
  if (!mover) return `${prefix}${indexPart ?? 'sector close'}`;
  const moverPct = fmtPct(mover.changePct, { ascii: true });
  const fixed = `${prefix}${indexPart ? `${indexPart} · ` : ''}`;
  const room = SUBJECT_MAX - fixed.length - moverPct.length - 1;
  const name = truncate(mover.name, Math.max(room, 8));
  return `${fixed}${name} ${moverPct}`;
}

function moverRow(m: IndexMember): { html: string; plain: string } {
  const up = m.changePct >= 0;
  const label = `${m.name} (${m.ticker})`;
  const nameHtml = m.slug
    ? `<a href="${APP_URL}/company-profiles/${escapeHtml(m.slug)}" style="${S.link}">${escapeHtml(label)}</a>`
    : escapeHtml(label);
  return {
    html: `<p style="${S.item}">${nameHtml} <span style="${up ? S.up : S.down}">${escapeHtml(fmtPct(m.changePct))}</span></p>`,
    plain: `- ${label} ${fmtPct(m.changePct, { ascii: true })}`,
  };
}

function section(title: string, rows: { html: string; plain: string }[]): { html: string; plain: string } {
  return {
    html: `<p style="${S.kicker}">${escapeHtml(title)}</p>${rows.map((r) => r.html).join('')}`,
    plain: `\n${title.toUpperCase()}\n${rows.map((r) => r.plain).join('\n')}\n`,
  };
}

/**
 * Compose the Space Markets Daily. Returns null when the market snapshot is
 * unavailable or reports no movers — the cron skips the day.
 */
export async function composeMarketsDaily(now: Date = new Date()): Promise<ProgramEmail | null> {
  const data = await getMarketsDaily();
  if (!data) return null;
  if (data.topMovers.length === 0 && data.bottomMovers.length === 0) return null;

  const subject = marketsSubject(data);
  const dateLine = now.toISOString().slice(0, 10);

  // Pure-Play Index line
  const idx = data.index;
  const indexLineText =
    idx.value === null
      ? `SpaceNexus Pure-Play Index: not computed (${idx.members} of the 5 pure-plays needed reported today)`
      : `SpaceNexus Pure-Play Index: ${fmtPct(idx.value, { ascii: true })} · ${idx.members} members · ${idx.gainers} up / ${idx.decliners} down`;
  const indexHtml =
    idx.value === null
      ? `<p style="${S.item}"><strong style="color:#fff">SpaceNexus Pure-Play Index</strong><br><span style="${S.meta}">Not computed — ${idx.members} of the 5 pure-plays needed reported today.</span></p>`
      : `<p style="${S.item}"><strong style="color:#fff">SpaceNexus Pure-Play Index</strong> <span style="${idx.value >= 0 ? S.up : S.down}">${escapeHtml(fmtPct(idx.value))}</span><br><span style="${S.meta}">${idx.members} members · ${idx.gainers} up / ${idx.decliners} down · equal-weighted mean of the day's moves</span></p>`;

  const parts: { html: string; plain: string }[] = [
    { html: `<p style="${S.kicker}">The close</p>${indexHtml}`, plain: `\nTHE CLOSE\n${indexLineText}\n` },
  ];

  if (data.topMovers.length > 0) parts.push(section('Top movers', data.topMovers.slice(0, 5).map(moverRow)));
  if (data.bottomMovers.length > 0) parts.push(section('Bottom movers', data.bottomMovers.slice(0, 5).map(moverRow)));

  if (data.deals.length > 0) {
    parts.push(
      section(
        'Deals',
        data.deals.map((d) => {
          const bits = [d.series, d.amount !== null ? fmtUsd(d.amount) : null].filter(Boolean).join(' · ');
          const nameHtml = d.slug
            ? `<a href="${APP_URL}/company-profiles/${escapeHtml(d.slug)}" style="${S.link}">${escapeHtml(d.company)}</a>`
            : `<strong style="color:#fff">${escapeHtml(d.company)}</strong>`;
          return {
            html: `<p style="${S.item}">${nameHtml}${bits ? ` <span style="color:#fbbf24;font-weight:600">${escapeHtml(bits)}</span>` : ''}</p>`,
            plain: `- ${d.company}${bits ? ` — ${bits}` : ''}`,
          };
        })
      )
    );
  }

  if (data.contracts.length > 0) {
    parts.push(
      section(
        'Contracts',
        data.contracts.map((c) => {
          const meta = [c.agency, truncate(c.title, 90)].filter(Boolean).join(' · ');
          return {
            html: `<p style="${S.item}"><strong style="color:#fff">${escapeHtml(c.company)}</strong>${c.value !== null ? ` <span style="color:#fbbf24;font-weight:600">${escapeHtml(fmtUsd(c.value))}</span>` : ''}<br><span style="${S.meta}">${escapeHtml(meta)}</span></p>`,
            plain: `- ${c.company}${c.value !== null ? ` ${fmtUsd(c.value)}` : ''} — ${meta}`,
          };
        })
      )
    );
  }

  const provenance = `Quotes: Yahoo Finance, as of ${fmtAsOf(data.asOf)}`;
  const unsubUrl = `${APP_URL}/api/newsletter/unsubscribe?token={{UNSUBSCRIBE_TOKEN}}&scope=markets`;
  const fullUnsubUrl = `${APP_URL}/api/newsletter/unsubscribe?token={{UNSUBSCRIBE_TOKEN}}`;

  const html = `<!doctype html><html><body style="margin:0;background:#000;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif"><div style="max-width:560px;margin:0 auto;padding:28px 20px"><p style="color:#22d3ee;font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 4px">Space Markets Daily</p><p style="color:#64748b;font-size:12px;margin:0 0 4px">${dateLine} · after the US close</p>${parts.map((p) => p.html).join('')}<p style="${S.meta};margin:22px 0 0">${escapeHtml(provenance)}</p><p style="margin:26px 0 0"><a href="${APP_URL}/markets-daily" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;font-size:14px">Full close on the site</a></p><p style="color:#6b6b6b;font-size:12px;margin:26px 0 0;line-height:1.6">You opted into Space Markets Daily on spacenexus.us. <a href="${APP_URL}/newsletter" style="color:#94a3b8">Manage preferences</a> · <a href="${unsubUrl}" style="color:#94a3b8">Stop Space Markets Daily</a> · <a href="${fullUnsubUrl}" style="color:#94a3b8">Unsubscribe from all email</a></p></div></body></html>`;

  const plain = `SPACE MARKETS DAILY — ${dateLine}
${parts.map((p) => p.plain).join('')}
${provenance}

Full close on the site: ${APP_URL}/markets-daily

Manage preferences: ${APP_URL}/newsletter
Stop Space Markets Daily: ${unsubUrl}
Unsubscribe from all email: ${fullUnsubUrl}`;

  return { subject, html, plain };
}
