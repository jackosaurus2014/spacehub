// Monthly reports — two emails on the 3rd of each month to NewsletterSubscriber
// rows with monthlyReports=true:
//
//   1. Monthly Hiring Index (program 'hiring-index', 14:00 UTC) — the most
//      recently completed month's edition from src/lib/hiring-index.ts.
//   2. Monthly Launch Slip Report (program 'slip-report', 15:00 UTC) — the
//      LaunchDateChange ledger summary from src/lib/launch-slips.ts.
//
// Same discipline as the Daily Brief: owned data only, one compose shared by
// every recipient ({{UNSUBSCRIBE_TOKEN}} is the only per-recipient variable),
// nothing to say → null → the cron records the period as skipped.
import { escapeHtml } from '@/lib/daily-brief';
import {
  getHiringIndex,
  latestEditionMonthKey,
  parseMonthParam,
  monthLabelOf,
  type HiringIndex,
} from '@/lib/hiring-index';
import { coverageChangesInWindow } from '@/lib/hiring-coverage';
import { getSlipData, PROVIDER_STATS_THRESHOLD, RECORDING_SINCE, type SlipData, type SlipRow } from '@/lib/launch-slips';
import type { ProgramEmail } from '@/lib/markets-daily-email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us';

const S = {
  kicker: 'color:#22d3ee;font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin:22px 0 8px;font-weight:600',
  item: 'font-size:14px;line-height:1.5;margin:0 0 8px;color:#e2e8f0',
  meta: 'color:#94a3b8;font-size:12px',
  link: 'color:#7dd3fc;text-decoration:none',
  up: 'color:#4ade80;font-weight:600',
  down: 'color:#f87171;font-weight:600',
  note: 'color:#fbbf24;font-size:12px;line-height:1.5;margin:14px 0 0;padding:10px 12px;border:1px solid rgba(251,191,36,.35);border-radius:6px',
};

const fmtInt = (n: number): string => n.toLocaleString('en-US');

/** "+312" / "−48" / "0" (ascii minus on request for subject lines). */
function fmtSigned(n: number, ascii = false): string {
  if (n > 0) return `+${fmtInt(n)}`;
  if (n < 0) return `${ascii ? '-' : '−'}${fmtInt(Math.abs(n))}`;
  return '0';
}

function fmtSignedPct(pct: number, ascii = false): string {
  const r = Math.round(pct * 10) / 10;
  if (r > 0) return `+${r.toFixed(1)}%`;
  if (r < 0) return `${ascii ? '-' : '−'}${Math.abs(r).toFixed(1)}%`;
  return '0.0%';
}

/** Human label for a raw category / seniority key ('c_suite' → 'C suite'). */
function humanizeKey(key: string): string {
  const s = key.replace(/[_-]+/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : key;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

function wrap(
  kickerLabel: string,
  dateLine: string,
  bodyHtml: string,
  bodyPlain: string,
  cta: { href: string; label: string },
  scope: 'monthly'
): Pick<ProgramEmail, 'html' | 'plain'> {
  const unsubUrl = `${APP_URL}/api/newsletter/unsubscribe?token={{UNSUBSCRIBE_TOKEN}}&scope=${scope}`;
  const fullUnsubUrl = `${APP_URL}/api/newsletter/unsubscribe?token={{UNSUBSCRIBE_TOKEN}}`;
  const html = `<!doctype html><html><body style="margin:0;background:#000;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif"><div style="max-width:560px;margin:0 auto;padding:28px 20px"><p style="color:#22d3ee;font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 4px">${escapeHtml(kickerLabel)}</p><p style="color:#64748b;font-size:12px;margin:0 0 4px">${escapeHtml(dateLine)}</p>${bodyHtml}<p style="margin:26px 0 0"><a href="${cta.href}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;font-size:14px">${escapeHtml(cta.label)}</a></p><p style="color:#6b6b6b;font-size:12px;margin:26px 0 0;line-height:1.6">You opted into SpaceNexus monthly reports on spacenexus.us. <a href="${APP_URL}/newsletter" style="color:#94a3b8">Manage preferences</a> · <a href="${unsubUrl}" style="color:#94a3b8">Stop monthly reports</a> · <a href="${fullUnsubUrl}" style="color:#94a3b8">Unsubscribe from all email</a></p></div></body></html>`;
  const plain = `${kickerLabel.toUpperCase()} — ${dateLine}
${bodyPlain}
${cta.label}: ${cta.href}

Manage preferences: ${APP_URL}/newsletter
Stop monthly reports: ${unsubUrl}
Unsubscribe from all email: ${fullUnsubUrl}`;
  return { html, plain };
}

// ---------------------------------------------------------------------------
// 1. Monthly Hiring Index
// ---------------------------------------------------------------------------

/** MoM percentage from the index's absolute change; null without a prior edition. */
export function momPercent(index: Pick<HiringIndex, 'momChange' | 'priorActiveAtMonthEnd'>): number | null {
  if (index.momChange === null || index.priorActiveAtMonthEnd === null || index.priorActiveAtMonthEnd === 0) return null;
  return (index.momChange / index.priorActiveAtMonthEnd) * 100;
}

/** "Space Hiring Index — August 2026: 6,512 open roles (+3.4%)". */
export function hiringIndexSubject(index: HiringIndex, openRoles: number): string {
  const pct = momPercent(index);
  const mom = pct === null ? '' : ` (${fmtSignedPct(pct, true)})`;
  return `Space Hiring Index — ${index.monthLabel}: ${fmtInt(openRoles)} open roles${mom}`;
}

/**
 * Compose the Monthly Hiring Index email for the latest completed edition
 * as of `now`. Returns null when the edition has no data (predates snapshot
 * history) or nothing was counted at all.
 */
export async function composeHiringIndexReport(now: Date = new Date()): Promise<ProgramEmail | null> {
  const key = latestEditionMonthKey(now);
  const parsed = parseMonthParam(key);
  if (!parsed) return null;
  const index = await getHiringIndex(parsed.year, parsed.month);
  if (!index) return null;

  const openRoles = index.activeAtMonthEnd ?? index.activeNow;
  if (openRoles === null && index.newPostings.total === 0) return null;
  const roles = openRoles ?? 0;

  const subject = hiringIndexSubject(index, roles);
  const editionUrl = `${APP_URL}/hiring-index/${key}`;
  const pct = momPercent(index);
  const parts: { html: string; plain: string }[] = [];

  // Headline
  const momText =
    index.momChange === null
      ? 'first edition — no prior month to compare'
      : `${fmtSigned(index.momChange)} vs ${index.priorActiveAtMonthEnd !== null ? fmtInt(index.priorActiveAtMonthEnd) : '—'} a month earlier${pct !== null ? ` (${fmtSignedPct(pct)})` : ''}`;
  const basis = index.activeAtMonthEnd !== null
    ? `as of ${index.activeAtMonthEndDate ?? 'month end'}`
    : 'live count — no month-end snapshot yet';
  parts.push({
    html: `<p style="${S.kicker}">Open roles at month end</p><p style="${S.item}"><strong style="color:#fff;font-size:22px">${fmtInt(roles)}</strong> <span style="${index.momChange !== null && index.momChange < 0 ? S.down : S.up}">${index.momChange === null ? '' : escapeHtml(fmtSigned(index.momChange))}</span><br><span style="${S.meta}">${escapeHtml(momText)} · ${escapeHtml(basis)}</span></p>`,
    plain: `\nOPEN ROLES AT MONTH END\n${fmtInt(roles)} (${momText}; ${basis})\n`,
  });

  // Coverage caveat — a board joining the tracker inflates totals without
  // reflecting market hiring. Same window the /hiring-index page uses.
  const monthStart = new Date(Date.UTC(parsed.year, parsed.month - 1, 1));
  const nextMonthStart = new Date(Date.UTC(parsed.year, parsed.month, 1));
  const coverage = coverageChangesInWindow(monthStart, nextMonthStart);
  if (coverage.length > 0) {
    parts.push({
      html: coverage
        .map((c) => `<p style="${S.note}"><strong>Coverage note (${escapeHtml(c.date)}):</strong> ${escapeHtml(c.note)}</p>`)
        .join(''),
      plain: `\n${coverage.map((c) => `COVERAGE NOTE (${c.date}): ${c.note}`).join('\n')}\n`,
    });
  }

  // New postings
  if (index.newPostings.total > 0) {
    const cats = index.newPostings.byCategory.slice(0, 5).map((c) => `${humanizeKey(c.key)} ${fmtInt(c.count)}`);
    const sen = index.newPostings.bySeniority.slice(0, 4).map((c) => `${humanizeKey(c.key)} ${fmtInt(c.count)}`);
    parts.push({
      html: `<p style="${S.kicker}">New postings in ${escapeHtml(index.monthLabel)}</p><p style="${S.item}"><strong style="color:#fff">${fmtInt(index.newPostings.total)}</strong> first seen this month${cats.length ? `<br><span style="${S.meta}">By category: ${escapeHtml(cats.join(' · '))}</span>` : ''}${sen.length ? `<br><span style="${S.meta}">By seniority: ${escapeHtml(sen.join(' · '))}</span>` : ''}</p>`,
      plain: `\nNEW POSTINGS IN ${index.monthLabel.toUpperCase()}\n${fmtInt(index.newPostings.total)} first seen this month${cats.length ? `\n  By category: ${cats.join(', ')}` : ''}${sen.length ? `\n  By seniority: ${sen.join(', ')}` : ''}\n`,
    });
  }

  // Top companies
  if (index.topCompanies.length > 0) {
    const rows = index.topCompanies.slice(0, 10);
    parts.push({
      html: `<p style="${S.kicker}">Largest hirers</p>${rows
        .map((r) => {
          const name = r.slug
            ? `<a href="${APP_URL}/company-profiles/${escapeHtml(r.slug)}" style="${S.link}">${escapeHtml(r.companyName)}</a>`
            : escapeHtml(r.companyName);
          return `<p style="${S.item}">${name} <span style="${S.meta}">${fmtInt(r.activeJobs)} open</span></p>`;
        })
        .join('')}`,
      plain: `\nLARGEST HIRERS\n${rows.map((r) => `- ${r.companyName}: ${fmtInt(r.activeJobs)} open`).join('\n')}\n`,
    });
  }

  // Movers
  const moverRow = (m: HiringIndex['movers']['gainers'][number]) => {
    const pctTxt = m.percentChange === null ? '' : ` (${fmtSignedPct(m.percentChange)})`;
    return {
      html: `<p style="${S.item}">${escapeHtml(m.companyName)} <span style="${m.change >= 0 ? S.up : S.down}">${escapeHtml(fmtSigned(m.change))}</span><span style="${S.meta}">${escapeHtml(pctTxt)} · ${fmtInt(m.first)} → ${fmtInt(m.last)}</span></p>`,
      plain: `- ${m.companyName} ${fmtSigned(m.change, true)}${pctTxt} (${fmtInt(m.first)} -> ${fmtInt(m.last)})`,
    };
  };
  if (index.movers.gainers.length > 0) {
    const rows = index.movers.gainers.slice(0, 5).map(moverRow);
    parts.push({
      html: `<p style="${S.kicker}">Biggest gainers</p>${rows.map((r) => r.html).join('')}`,
      plain: `\nBIGGEST GAINERS\n${rows.map((r) => r.plain).join('\n')}\n`,
    });
  }
  if (index.movers.decliners.length > 0) {
    const rows = index.movers.decliners.slice(0, 5).map(moverRow);
    parts.push({
      html: `<p style="${S.kicker}">Biggest decliners</p>${rows.map((r) => r.html).join('')}`,
      plain: `\nBIGGEST DECLINERS\n${rows.map((r) => r.plain).join('\n')}\n`,
    });
  }

  // Remote share + locations
  const geoBits: string[] = [];
  if (index.remoteShare.percent !== null) {
    geoBits.push(`Remote-eligible: ${index.remoteShare.percent.toFixed(1)}% (${fmtInt(index.remoteShare.remote)} of ${fmtInt(index.remoteShare.total)})`);
  }
  if (index.topLocations.length > 0) {
    geoBits.push(`Top locations: ${index.topLocations.slice(0, 5).map((l) => `${l.location} ${fmtInt(l.count)}`).join(' · ')}`);
  }
  if (geoBits.length > 0) {
    parts.push({
      html: `<p style="${S.kicker}">Where the roles are</p>${geoBits.map((b) => `<p style="${S.item}">${escapeHtml(b)}</p>`).join('')}`,
      plain: `\nWHERE THE ROLES ARE\n${geoBits.map((b) => `- ${b}`).join('\n')}\n`,
    });
  }

  const bodyHtml = `${parts.map((p) => p.html).join('')}<p style="${S.meta};margin:22px 0 0">Browse every open role: <a href="${APP_URL}/jobs" style="${S.link}">${APP_URL}/jobs</a></p>`;
  const bodyPlain = `${parts.map((p) => p.plain).join('')}\nBrowse every open role: ${APP_URL}/jobs\n`;

  const { html, plain } = wrap(
    'Space Hiring Index',
    `${index.monthLabel} edition`,
    bodyHtml,
    bodyPlain,
    { href: editionUrl, label: 'Read the full edition' },
    'monthly'
  );
  return { subject, html, plain };
}

// ---------------------------------------------------------------------------
// 2. Monthly Launch Slip Report
// ---------------------------------------------------------------------------

/** "Launch Slip Report — September 2026: 47 date changes across 31 launches". */
export function slipReportSubject(data: Pick<SlipData, 'totalChanges' | 'launchesTracked'>, now: Date): string {
  const label = monthLabelOf(now.getUTCFullYear(), now.getUTCMonth() + 1);
  return `Launch Slip Report — ${label}: ${fmtInt(data.totalChanges)} date change${data.totalChanges === 1 ? '' : 's'} across ${fmtInt(data.launchesTracked)} launch${data.launchesTracked === 1 ? '' : 'es'}`;
}

/** The ten largest recent moves by |Δdays|, biggest first. */
export function biggestSlips(rows: SlipRow[], limit = 10): SlipRow[] {
  return [...rows].sort((a, b) => Math.abs(b.deltaDays) - Math.abs(a.deltaDays)).slice(0, limit);
}

function fmtDelta(days: number, ascii = false): string {
  if (days > 0) return `+${days}d`;
  if (days < 0) return `${ascii ? '-' : '−'}${Math.abs(days)}d`;
  return '0d';
}

/**
 * Compose the Monthly Launch Slip Report. Returns null when the ledger is
 * unavailable or has recorded no changes yet (nothing to report).
 */
export async function composeSlipReport(now: Date = new Date()): Promise<ProgramEmail | null> {
  const data = await getSlipData();
  if (!data || data.totalChanges === 0) return null;

  const subject = slipReportSubject(data, now);
  const parts: { html: string; plain: string }[] = [];

  // Headline counts
  const headline = [
    `${fmtInt(data.totalChanges)} date changes recorded`,
    `${fmtInt(data.launchesTracked)} launches tracked`,
    data.biggestRecentSlipDays !== null ? `biggest recent slip ${fmtDelta(data.biggestRecentSlipDays, true)}` : null,
  ].filter((x): x is string => x !== null);
  parts.push({
    html: `<p style="${S.kicker}">The month in slips</p><p style="${S.item}">${headline.map((h) => escapeHtml(h)).join(' · ')}</p>`,
    plain: `\nTHE MONTH IN SLIPS\n${headline.join(' / ')}\n`,
  });

  // Ten biggest recent slips
  const biggest = biggestSlips(data.recent);
  if (biggest.length > 0) {
    parts.push({
      html: `<p style="${S.kicker}">Biggest recent slips</p>${biggest
        .map((r) => {
          const who = [r.provider, r.rocket].filter(Boolean).join(' · ');
          return `<p style="${S.item}"><strong style="color:#fff">${escapeHtml(truncate(r.mission, 70))}</strong> <span style="${r.deltaDays > 0 ? S.down : S.up}">${escapeHtml(fmtDelta(r.deltaDays))}</span><br><span style="${S.meta}">${who ? `${escapeHtml(who)} · ` : ''}${escapeHtml(r.fromDate)} → ${escapeHtml(r.toDate)}</span></p>`;
        })
        .join('')}`,
      plain: `\nBIGGEST RECENT SLIPS\n${biggest
        .map((r) => {
          const who = [r.provider, r.rocket].filter(Boolean).join(' / ');
          return `- ${truncate(r.mission, 70)} ${fmtDelta(r.deltaDays, true)}${who ? ` (${who})` : ''}: ${r.fromDate} -> ${r.toDate}`;
        })
        .join('\n')}\n`,
    });
  }

  // Provider scorecard — only once the ledger is a dataset.
  if (data.providerStatsUnlocked && data.providers.length > 0) {
    parts.push({
      html: `<p style="${S.kicker}">Provider scorecard</p>${data.providers
        .map(
          (p) =>
            `<p style="${S.item}"><strong style="color:#fff">${escapeHtml(p.provider)}</strong><br><span style="${S.meta}">${fmtInt(p.changes)} changes · avg ${escapeHtml(fmtDelta(Math.round(p.avgSlipDays)))} · net ${escapeHtml(fmtDelta(p.netDaysLost))}</span></p>`
        )
        .join('')}`,
      plain: `\nPROVIDER SCORECARD\n${data.providers
        .map((p) => `- ${p.provider}: ${fmtInt(p.changes)} changes, avg ${fmtDelta(Math.round(p.avgSlipDays), true)}, net ${fmtDelta(p.netDaysLost, true)}`)
        .join('\n')}\n`,
    });
  } else {
    const line = `Provider scorecard unlocks at ${PROVIDER_STATS_THRESHOLD} recorded changes; recording since ${RECORDING_SINCE}.`;
    parts.push({
      html: `<p style="${S.meta};margin:18px 0 0">${escapeHtml(line)}</p>`,
      plain: `\n${line}\n`,
    });
  }

  const provenance = `Ledger as of ${data.asOf}`;
  const bodyHtml = `${parts.map((p) => p.html).join('')}<p style="${S.meta};margin:22px 0 0">${escapeHtml(provenance)}</p>`;
  const bodyPlain = `${parts.map((p) => p.plain).join('')}\n${provenance}\n`;

  const { html, plain } = wrap(
    'Launch Slip Report',
    `${monthLabelOf(now.getUTCFullYear(), now.getUTCMonth() + 1)} edition`,
    bodyHtml,
    bodyPlain,
    { href: `${APP_URL}/launch-slips`, label: 'Explore every slip' },
    'monthly'
  );
  return { subject, html, plain };
}
