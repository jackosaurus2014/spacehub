// ─── Space Tycoon: weekly corporation report email (2026-09-01) ─────────────
// The game's first email. Per-player, opt-in via GameProfile.weeklyReportEmail
// (default OFF), sent Mondays by /api/cron/tycoon-weekly-report and recorded
// per (profile, ISO week) in TycoonWeeklySend so a re-run never double-sends.
//
// Everything in the email comes from server-owned rows — GameProfile,
// GameLedgerEntry (the One Wallet money ledger), TradeStatDaily,
// PlayerActivity and PublishedCorpReport — never from the client save, so a
// tampered local state cannot write itself into a mailbox. The unsubscribe
// link is an HMAC of the profile id signed with CRON_SECRET: no new table, no
// stored token, and a forged id fails verification.

import { createHmac, timingSafeEqual } from 'crypto';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { isoWeekKey } from '@/lib/company-brief';
import { sendVerificationEmail } from '@/lib/newsletter/email-service';
import { getTycoonWorldStats } from '@/lib/weekly-economy-report';
import { parseStoredCorpReport, formatQuarterLabel } from './corp-report-registry';
import { formatMoney } from './formulas';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us';
export const WEEK_MS = 7 * 24 * 3600_000;
/** A profile that has not synced in this long is dormant — no email. */
export const STALE_PROFILE_MS = 14 * 24 * 3600_000;
export const MAX_SENDS_PER_RUN = 300;
const MAX_CASH_FLOW_ROWS = 12;

// ── Unsubscribe token (HMAC of the profile id, keyed by CRON_SECRET) ────────

const TOKEN_SCOPE = 'tycoon-weekly-report';

function hmacFor(profileId: string, secret: string): string {
  return createHmac('sha256', secret).update(`${TOKEN_SCOPE}:${profileId}`).digest('hex');
}

/** `<profileId>.<hmac>` — null when no CRON_SECRET is configured (we never
 *  mint an unverifiable link). */
export function mintUnsubscribeToken(profileId: string, secret: string | undefined = process.env.CRON_SECRET): string | null {
  if (!secret || !/^[A-Za-z0-9_-]{1,64}$/.test(profileId)) return null;
  return `${profileId}.${hmacFor(profileId, secret)}`;
}

/** Timing-safe verification. Returns the profile id or null. */
export function verifyUnsubscribeToken(token: string, secret: string | undefined = process.env.CRON_SECRET): string | null {
  if (!secret || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const profileId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(profileId) || !/^[a-f0-9]{64}$/.test(sig)) return null;
  const expected = Buffer.from(hmacFor(profileId, secret), 'hex');
  const given = Buffer.from(sig, 'hex');
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return profileId;
}

// ── Pure aggregation ────────────────────────────────────────────────────────

export interface LedgerEntryLike { moneyDelta: number; reason: string }
export interface CashFlowRow { reason: string; income: number; spend: number }
export interface CashFlowTable { rows: CashFlowRow[]; income: number; spend: number; net: number }

/** Sum ledger deltas by reason. Positive deltas are income, negative are
 *  spend (stored as a positive magnitude). Rows sort by gross activity and
 *  are capped; the totals always cover every entry, not just the shown rows. */
export function buildCashFlowTable(entries: LedgerEntryLike[]): CashFlowTable {
  const byReason = new Map<string, CashFlowRow>();
  let income = 0; let spend = 0;
  for (const e of entries) {
    const d = Number.isFinite(e.moneyDelta) ? e.moneyDelta : 0;
    if (d === 0) continue;
    const reason = e.reason || 'other';
    const row = byReason.get(reason) ?? { reason, income: 0, spend: 0 };
    if (d > 0) { row.income += d; income += d; } else { row.spend += -d; spend += -d; }
    byReason.set(reason, row);
  }
  const rows = Array.from(byReason.values())
    .sort((a, b) => (b.income + b.spend) - (a.income + a.spend))
    .slice(0, MAX_CASH_FLOW_ROWS);
  return { rows, income, spend, net: income - spend };
}

export interface TradeStatLike { buyVol: number; sellVol: number; buyValue: number; sellValue: number }
export interface TradeSummary { buyVol: number; sellVol: number; buyValue: number; sellValue: number }

export function summarizeTrades(stats: TradeStatLike[]): TradeSummary {
  const out: TradeSummary = { buyVol: 0, sellVol: 0, buyValue: 0, sellValue: 0 };
  for (const s of stats) {
    out.buyVol += s.buyVol || 0; out.sellVol += s.sellVol || 0;
    out.buyValue += s.buyValue || 0; out.sellValue += s.sellValue || 0;
  }
  return out;
}

/** Net-worth change on a cash-flow basis: this week's ledger net against the
 *  net worth the corporation started the week with. The server keeps no
 *  net-worth history, so this is the honest server-side proxy — labelled as
 *  such in the email body. */
export function weeklyNetWorthPct(netWorth: number, ledgerNet: number): number {
  const start = netWorth - ledgerNet;
  if (!Number.isFinite(start) || Math.abs(start) < 1) return 0;
  return (ledgerNet / Math.abs(start)) * 100;
}

export function formatPct(pct: number): string {
  const clamped = Math.max(-999, Math.min(999, pct));
  return `${clamped >= 0 ? '+' : '−'}${Math.abs(clamped).toFixed(1)}%`;
}

function reasonLabel(reason: string): string {
  return reason.replace(/_/g, ' ');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Composer ────────────────────────────────────────────────────────────────

export interface WeeklyCorpReportEmail { subject: string; html: string; plain: string; to: string | null; unsubscribeToken: string }

export async function composeWeeklyCorpReport(profileId: string, now: Date = new Date()): Promise<WeeklyCorpReportEmail | null> {
  const unsubscribeToken = mintUnsubscribeToken(profileId);
  if (!unsubscribeToken) {
    logger.warn('weekly corp report: CRON_SECRET missing, cannot mint unsubscribe token');
    return null;
  }
  const profile = await prisma.gameProfile.findUnique({
    where: { id: profileId },
    select: {
      companyName: true, money: true, netWorth: true, peakNetWorth: true, buildingCount: true, researchCount: true,
      serviceCount: true, locationsUnlocked: true, gameYear: true, rivalWins: true, rivalLosses: true,
      dailyBonusStreak: true, bidReliability: true, lastSyncAt: true,
      user: { select: { email: true } },
    },
  });
  if (!profile) return null;
  if (now.getTime() - profile.lastSyncAt.getTime() > STALE_PROFILE_MS) return null;

  const since = new Date(now.getTime() - WEEK_MS);
  const [ledger, trades, activity, published, worldStats, aboveMe] = await Promise.all([
    prisma.gameLedgerEntry.findMany({ where: { profileId, createdAt: { gte: since } }, select: { moneyDelta: true, reason: true }, take: 5000 }),
    prisma.tradeStatDaily.findMany({ where: { profileId, day: { gte: since } }, select: { buyVol: true, sellVol: true, buyValue: true, sellValue: true } }),
    prisma.playerActivity.findMany({ where: { profileId, createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 8, select: { title: true, createdAt: true } }),
    prisma.publishedCorpReport.findFirst({ where: { corpId: profileId }, orderBy: { publishedAt: 'desc' }, select: { reportJson: true, publishedAt: true } }).catch(() => null),
    getTycoonWorldStats(),
    prisma.gameProfile.count({ where: { netWorth: { gt: profile.netWorth } } }),
  ]);

  const cash = buildCashFlowTable(ledger);
  const trade = summarizeTrades(trades);
  const pct = weeklyNetWorthPct(profile.netWorth, cash.net);
  const rank = aboveMe + 1;
  const total = Math.max(rank, worldStats?.totalCorporations ?? rank);
  const lastReport = published ? parseStoredCorpReport(published.reportJson) : null;
  const corp = profile.companyName;

  const subject = `Your week at ${corp}: net worth ${formatPct(pct)}, #${rank} of ${total}`;
  const gameUrl = `${APP_URL}/space-tycoon`;
  const registryUrl = `${APP_URL}/space-tycoon/registry`;
  const unsub = `${APP_URL}/api/space-tycoon/weekly-report/unsubscribe?token=${unsubscribeToken}`;

  const statLines: [string, string][] = [
    ['Net worth', formatMoney(profile.netWorth)],
    ['Cash', formatMoney(profile.money)],
    ['Peak net worth', formatMoney(profile.peakNetWorth)],
    ['Rank', `#${rank} of ${total} corporations`],
    ['Game year', String(profile.gameYear)],
    ['Facilities / services / research', `${profile.buildingCount} / ${profile.serviceCount} / ${profile.researchCount}`],
    ['Locations unlocked', String(profile.locationsUnlocked)],
    ['Rival record', `${profile.rivalWins}W – ${profile.rivalLosses}L`],
    ['Bid reliability', `${Math.round(profile.bidReliability * 100)}%`],
    ['Daily bonus streak', `${profile.dailyBonusStreak} day${profile.dailyBonusStreak === 1 ? '' : 's'}`],
  ];

  // Plain text
  const plainParts: string[] = [];
  plainParts.push(`${corp} — your week in the 22nd century\n`);
  plainParts.push(`Net worth ${formatPct(pct)} this week (cash-flow basis). #${rank} of ${total} corporations.\n`);
  for (const [k, v] of statLines) plainParts.push(`${k}: ${v}`);
  plainParts.push('');
  plainParts.push(`Cash flow, last 7 days — income ${formatMoney(cash.income)}, spend ${formatMoney(cash.spend)}, net ${cash.net >= 0 ? '+' : '−'}${formatMoney(Math.abs(cash.net))}`);
  if (cash.rows.length === 0) plainParts.push('  (no ledger activity this week)');
  for (const r of cash.rows) plainParts.push(`  ${reasonLabel(r.reason)}: +${formatMoney(r.income)} / −${formatMoney(r.spend)}`);
  plainParts.push('');
  plainParts.push(`Market: bought ${trade.buyVol.toLocaleString()} units (${formatMoney(trade.buyValue)}), sold ${trade.sellVol.toLocaleString()} units (${formatMoney(trade.sellValue)})`);
  if (activity.length > 0) {
    plainParts.push('', 'Notable this week:');
    for (const a of activity) plainParts.push(`  - ${a.title}`);
  }
  if (lastReport) plainParts.push('', `Latest published quarterly: ${formatQuarterLabel(lastReport)} — ${registryUrl}`);
  if (worldStats?.topCorp) plainParts.push('', `World: ${worldStats.totalCorporations} corporations, ${worldStats.allianceCount} alliances. Top corporation: ${worldStats.topCorp.companyName} (${formatMoney(worldStats.topCorp.netWorth)}).`);
  plainParts.push('', `Open your command center: ${gameUrl}`, '', `Stop these weekly reports: ${unsub}`);
  const plain = plainParts.join('\n') + '\n';

  // HTML
  const row = (k: string, v: string) => `<tr><td style="padding:4px 8px 4px 0;color:#94a3b8">${escapeHtml(k)}</td><td style="padding:4px 0;color:#fff;text-align:right;font-variant-numeric:tabular-nums">${escapeHtml(v)}</td></tr>`;
  const cashRows = cash.rows.length === 0
    ? `<tr><td colspan="3" style="padding:6px 0;color:#64748b">No ledger activity this week.</td></tr>`
    : cash.rows.map(r => `<tr><td style="padding:4px 8px 4px 0;color:#cbd5e1;text-transform:capitalize">${escapeHtml(reasonLabel(r.reason))}</td><td style="padding:4px 8px;text-align:right;color:#34d399">${r.income > 0 ? '+' + escapeHtml(formatMoney(r.income)) : '—'}</td><td style="padding:4px 0;text-align:right;color:#f87171">${r.spend > 0 ? '−' + escapeHtml(formatMoney(r.spend)) : '—'}</td></tr>`).join('');
  const activityHtml = activity.length > 0
    ? `<h2 style="font-size:14px;color:#22d3ee;margin:24px 0 8px;letter-spacing:.08em;text-transform:uppercase">Notable this week</h2><ul style="margin:0;padding-left:18px;color:#e2e8f0;font-size:14px;line-height:1.6">${activity.map(a => `<li>${escapeHtml(a.title)}</li>`).join('')}</ul>`
    : '';
  const reportHtml = lastReport
    ? `<p style="font-size:14px;margin:20px 0 0;color:#e2e8f0">Latest published quarterly: <strong>${escapeHtml(formatQuarterLabel(lastReport))}</strong> — <a href="${registryUrl}" style="color:#22d3ee">see it on the Corporate Registry</a>.</p>`
    : '';
  const worldHtml = worldStats?.topCorp
    ? `<p style="font-size:13px;margin:20px 0 0;color:#94a3b8">World: ${worldStats.totalCorporations} corporations, ${worldStats.allianceCount} alliances. Top corporation: ${escapeHtml(worldStats.topCorp.companyName)} (${escapeHtml(formatMoney(worldStats.topCorp.netWorth))}).</p>`
    : '';
  const html = `<!doctype html><html><body style="margin:0;background:#000;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif"><div style="max-width:560px;margin:0 auto;padding:28px 20px">
<p style="color:#22d3ee;font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 8px">Space Tycoon weekly report</p>
<h1 style="font-size:22px;margin:0 0 6px;color:#fff">${escapeHtml(corp)}</h1>
<p style="font-size:15px;line-height:1.5;margin:0 0 18px">Net worth <strong style="color:${pct >= 0 ? '#34d399' : '#f87171'}">${formatPct(pct)}</strong> this week (cash-flow basis) · <strong style="color:#fff">#${rank} of ${total}</strong> corporations.</p>
<table style="border-collapse:collapse;width:100%;font-size:14px">${statLines.map(([k, v]) => row(k, v)).join('')}</table>
<h2 style="font-size:14px;color:#22d3ee;margin:24px 0 8px;letter-spacing:.08em;text-transform:uppercase">Cash flow, last 7 days</h2>
<table style="border-collapse:collapse;width:100%;font-size:13px"><thead><tr><th style="text-align:left;color:#64748b;font-weight:500;padding:0 0 6px">Reason</th><th style="text-align:right;color:#64748b;font-weight:500;padding:0 8px 6px">Income</th><th style="text-align:right;color:#64748b;font-weight:500;padding:0 0 6px">Spend</th></tr></thead><tbody>${cashRows}<tr><td style="padding:8px 8px 0 0;color:#fff;font-weight:600;border-top:1px solid #1e293b">Total</td><td style="padding:8px 8px 0;text-align:right;color:#34d399;border-top:1px solid #1e293b">+${escapeHtml(formatMoney(cash.income))}</td><td style="padding:8px 0 0;text-align:right;color:#f87171;border-top:1px solid #1e293b">−${escapeHtml(formatMoney(cash.spend))}</td></tr></tbody></table>
<p style="font-size:13px;margin:12px 0 0;color:#94a3b8">Net: <strong style="color:${cash.net >= 0 ? '#34d399' : '#f87171'}">${cash.net >= 0 ? '+' : '−'}${escapeHtml(formatMoney(Math.abs(cash.net)))}</strong> · Market: bought ${trade.buyVol.toLocaleString()} units (${escapeHtml(formatMoney(trade.buyValue))}), sold ${trade.sellVol.toLocaleString()} units (${escapeHtml(formatMoney(trade.sellValue))}).</p>
${activityHtml}${reportHtml}${worldHtml}
<p style="margin:28px 0 0"><a href="${gameUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:600">Open your command center</a></p>
<p style="color:#6b6b6b;font-size:12px;margin:28px 0 0">You turned this on in Space Tycoon's Reports tab. <a href="${unsub}" style="color:#94a3b8">Stop these weekly reports</a>.</p>
</div></body></html>`;

  return { subject, html, plain, to: profile.user?.email ?? null, unsubscribeToken };
}

// ── Cron body ───────────────────────────────────────────────────────────────

export type WeeklySendImpl = (to: string, subject: string, html: string, plain: string) => Promise<boolean>;

/** One email per opted-in profile with a user email, claimed in
 *  TycoonWeeklySend (profileId, ISO week) BEFORE the send so a crashed or
 *  re-run job cannot double-send. A provider rejection releases the claim so
 *  the next run retries; a null composition (dormant profile) keeps it. */
export async function runTycoonWeeklyReportDeliveries(now: Date = new Date(), sendImpl?: WeeklySendImpl, maxSends = MAX_SENDS_PER_RUN): Promise<{ profiles: number; sent: number; skipped: number; claimed: number; dormant: number }> {
  const send = sendImpl ?? (async (to, subject, html, plain) => (await sendVerificationEmail(to, html, plain, subject)).success);
  const periodKey = isoWeekKey(now);
  const profiles = await prisma.gameProfile.findMany({
    where: { weeklyReportEmail: true, lastSyncAt: { gte: new Date(now.getTime() - STALE_PROFILE_MS) } },
    select: { id: true, user: { select: { email: true } } },
    orderBy: { netWorth: 'desc' },
  });
  let sent = 0; let skipped = 0; let claimed = 0; let dormant = 0;
  for (const p of profiles) {
    if (!p.user?.email) { skipped++; continue; }
    if (sent >= maxSends) { skipped++; continue; }
    try {
      await prisma.tycoonWeeklySend.create({ data: { profileId: p.id, periodKey } });
    } catch {
      claimed++; // unique violation — already sent (or in flight) this week
      continue;
    }
    let ok = false;
    try {
      const mail = await composeWeeklyCorpReport(p.id, now);
      if (!mail) { dormant++; continue; }
      ok = await send(p.user.email, mail.subject, mail.html, mail.plain);
    } catch (err) {
      logger.error('tycoon weekly report compose/send failed', { profileId: p.id, error: err instanceof Error ? err.message : String(err) });
    }
    if (ok) {
      sent++;
    } else {
      skipped++;
      await prisma.tycoonWeeklySend.deleteMany({ where: { profileId: p.id, periodKey } }).catch(() => {});
    }
  }
  return { profiles: profiles.length, sent, skipped, claimed, dormant };
}
