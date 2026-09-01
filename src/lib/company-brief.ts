// ─── Weekly company briefs without an account ────────────────────────────────
// A CompanyWatch is an email + one company profile. Double opt-in. Every
// Monday the cron composes a brief per company from data we already own —
// new job postings, contract awards, funding rounds, SEC filings, tagged
// news — and sends it to each verified watch once per ISO week. If a
// company had a quiet week the send is skipped but the delivery row is
// still recorded: quiet weeks stay quiet, and a re-run never double-sends.
//
// Cloned from src/lib/launch-watch.ts (2026-08-29): same token shapes,
// enumeration-safe signup, per-email cap, and delivery-ledger idempotency.

import { randomBytes } from 'crypto';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { sendVerificationEmail } from '@/lib/newsletter/email-service';
import { confirmationCooldownRemaining, markConfirmationSent } from '@/lib/launch-watch';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us';
export const MAX_WATCHES_PER_EMAIL = 25;
export const BRIEF_WINDOW_MS = 7 * 24 * 3600_000;

function token(): string {
  return randomBytes(24).toString('hex');
}

/** ISO-8601 week key for an instant (UTC), e.g. '2026-W36'. The delivery ledger keys on this. */
export function isoWeekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7; // Mon=1..Sun=7
  t.setUTCDate(t.getUTCDate() + 4 - day); // Thursday decides the ISO year
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((t.getTime() - yearStart) / 86400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Create (or re-send verification for) a watch. Never reveals whether an email exists elsewhere. */
export async function createCompanyWatch(email: string, ref: { companyProfileId?: string | null; slug?: string | null }, source: string): Promise<{ ok: boolean; status: 'sent' | 'already-verified' | 'limit' | 'not-found' | 'cooldown' | 'error' }> {
  const normalized = email.trim().toLowerCase();
  try {
    const company = await prisma.companyProfile.findUnique({
      where: ref.companyProfileId ? { id: ref.companyProfileId } : { slug: ref.slug ?? '' },
      select: { id: true, name: true },
    });
    if (!company) return { ok: false, status: 'not-found' };
    const existing = await prisma.companyWatch.findUnique({ where: { email_companyProfileId: { email: normalized, companyProfileId: company.id } }, select: { id: true, verified: true, verificationToken: true, unsubscribedAt: true } });
    if (existing?.verified && !existing.unsubscribedAt) return { ok: true, status: 'already-verified' };
    // Shared cooldown with launch alerts (M4): one confirmation per address per 10 min.
    if (confirmationCooldownRemaining(normalized) > 0) return { ok: true, status: 'cooldown' };
    const count = await prisma.companyWatch.count({ where: { email: normalized, unsubscribedAt: null } });
    if (!existing && count >= MAX_WATCHES_PER_EMAIL) return { ok: false, status: 'limit' };
    const watch = existing
      ? existing.unsubscribedAt
        // A previously unsubscribed row blocks the @@unique — revive it, but make it re-confirm.
        ? await prisma.companyWatch.update({ where: { id: existing.id }, data: { unsubscribedAt: null, verified: false, verifiedAt: null }, select: { id: true, verified: true, verificationToken: true } })
        : existing
      : await prisma.companyWatch.create({ data: { email: normalized, companyProfileId: company.id, verificationToken: token(), unsubscribeToken: token(), source }, select: { id: true, verified: true, verificationToken: true } });
    const verifyUrl = `${APP_URL}/api/company-brief/verify?token=${watch.verificationToken}`;
    const { html, text } = verificationEmail(company.name, verifyUrl);
    const sent = await sendVerificationEmail(normalized, html, text, `Confirm your weekly ${company.name} brief`);
    if (sent.success) markConfirmationSent(normalized);
    return { ok: sent.success, status: sent.success ? 'sent' : 'error' };
  } catch (err) {
    logger.error('createCompanyWatch failed', { error: err instanceof Error ? err.message : String(err) });
    return { ok: false, status: 'error' };
  }
}

export async function verifyCompanyWatch(verificationToken: string): Promise<{ ok: boolean; companyName?: string }> {
  const w = await prisma.companyWatch.findUnique({ where: { verificationToken }, select: { id: true, verified: true, companyProfile: { select: { name: true } } } });
  if (!w) return { ok: false };
  if (!w.verified) await prisma.companyWatch.update({ where: { id: w.id }, data: { verified: true, verifiedAt: new Date() } });
  return { ok: true, companyName: w.companyProfile.name };
}

export async function unsubscribeCompanyWatch(unsubscribeToken: string, all = false): Promise<{ ok: boolean; count: number }> {
  const w = await prisma.companyWatch.findUnique({ where: { unsubscribeToken }, select: { id: true, email: true } });
  if (!w) return { ok: false, count: 0 };
  const r = all
    ? await prisma.companyWatch.updateMany({ where: { email: w.email, unsubscribedAt: null }, data: { unsubscribedAt: new Date() } })
    : await prisma.companyWatch.updateMany({ where: { id: w.id }, data: { unsubscribedAt: new Date() } });
  return { ok: true, count: r.count };
}

// ── Brief composition ──────────────────────────────────────────────────────

export interface CompanyBriefData {
  jobs: { count: number; titles: string[] };
  contracts: { title: string; agency: string; value: number | null; awardDate: Date | null }[];
  funding: { seriesLabel: string | null; amount: number | null; date: Date; leadInvestor: string | null }[];
  filings: { filingType: string; filingDate: Date; edgarUrl: string | null }[];
  news: { title: string; publishedAt: Date }[];
}

export function briefIsEmpty(d: CompanyBriefData): boolean {
  return d.jobs.count === 0 && d.contracts.length === 0 && d.funding.length === 0 && d.filings.length === 0 && d.news.length === 0;
}

/** Everything we know first-hand about a company's last 7 days. Owned data only — no AI, no external calls. */
export async function collectCompanyBrief(companyProfileId: string, since: Date): Promise<CompanyBriefData> {
  const [jobCount, jobTitles, contracts, funding, filings, news] = await Promise.all([
    prisma.spaceJobPosting.count({ where: { companyProfileId, isActive: true, postedDate: { gte: since } } }),
    prisma.spaceJobPosting.findMany({ where: { companyProfileId, isActive: true, postedDate: { gte: since } }, orderBy: { postedDate: 'desc' }, take: 5, select: { title: true } }),
    prisma.governmentContractAward.findMany({ where: { companyId: companyProfileId, awardDate: { gte: since } }, orderBy: { awardDate: 'desc' }, take: 5, select: { title: true, agency: true, value: true, awardDate: true } }),
    prisma.fundingRound.findMany({ where: { companyId: companyProfileId, date: { gte: since } }, orderBy: { date: 'desc' }, take: 5, select: { seriesLabel: true, amount: true, date: true, leadInvestor: true } }),
    prisma.sECFiling.findMany({ where: { companyId: companyProfileId, filingDate: { gte: since } }, orderBy: { filingDate: 'desc' }, take: 5, select: { filingType: true, filingDate: true, edgarUrl: true } }),
    prisma.newsArticle.findMany({ where: { publishedAt: { gte: since }, companyTags: { some: { id: companyProfileId } } }, orderBy: { publishedAt: 'desc' }, take: 5, select: { title: true, publishedAt: true } }),
  ]);
  return {
    jobs: { count: jobCount, titles: jobTitles.map((j) => j.title) },
    contracts,
    funding,
    filings,
    news,
  };
}

function fmtMoney(v: number | null): string {
  if (v == null || !isFinite(v) || v <= 0) return '';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

function fmtDate(d: Date | null): string {
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '';
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface BriefSection { heading: string; lines: { text: string; href?: string }[] }

function briefSections(d: CompanyBriefData): BriefSection[] {
  const sections: BriefSection[] = [];
  if (d.jobs.count > 0) {
    sections.push({
      heading: 'Hiring',
      lines: [
        { text: `${d.jobs.count} new job posting${d.jobs.count === 1 ? '' : 's'} this week${d.jobs.titles.length ? ', including:' : ''}` },
        ...d.jobs.titles.map((t) => ({ text: t })),
      ],
    });
  }
  if (d.contracts.length > 0) {
    sections.push({
      heading: 'Government contracts',
      lines: d.contracts.map((c) => ({ text: [c.title, c.agency, fmtMoney(c.value)].filter(Boolean).join(' — ') })),
    });
  }
  if (d.funding.length > 0) {
    sections.push({
      heading: 'Funding',
      lines: d.funding.map((f) => ({ text: [`${f.seriesLabel || 'Funding round'} closed ${fmtDate(f.date)}`, fmtMoney(f.amount), f.leadInvestor ? `led by ${f.leadInvestor}` : ''].filter(Boolean).join(' — ') })),
    });
  }
  if (d.filings.length > 0) {
    sections.push({
      heading: 'SEC filings',
      lines: d.filings.map((f) => ({ text: `${f.filingType} filed ${fmtDate(f.filingDate)}`, href: f.edgarUrl || undefined })),
    });
  }
  if (d.news.length > 0) {
    sections.push({
      heading: 'In the news',
      lines: d.news.map((n) => ({ text: `${n.title} (${fmtDate(n.publishedAt)})`, href: `${APP_URL}/news` })),
    });
  }
  return sections;
}

export function briefEmail(company: { name: string; slug: string }, d: CompanyBriefData, unsubscribeToken: string): { subject: string; html: string; text: string } {
  const subject = `${company.name} this week — SpaceNexus`;
  const companyUrl = `${APP_URL}/company-profiles/${company.slug}`;
  const unsub = `${APP_URL}/api/company-brief/unsubscribe?token=${unsubscribeToken}`;
  const sections = briefSections(d);
  const text = [
    `What happened at ${company.name} this week, from SpaceNexus's own tracking.`,
    '',
    ...sections.flatMap((s) => [s.heading, ...s.lines.map((l) => `- ${l.text}${l.href ? `: ${l.href}` : ''}`), '']),
    `Full company page: ${companyUrl}`,
    '',
    `Stop these briefs: ${unsub}`,
    '',
  ].join('\n');
  const sectionsHtml = sections
    .map((s) => `<h2 style="font-size:14px;color:#22d3ee;letter-spacing:.08em;text-transform:uppercase;margin:20px 0 6px">${escapeHtml(s.heading)}</h2><ul style="margin:0;padding:0 0 0 18px">${s.lines.map((l) => `<li style="font-size:14px;line-height:1.6;margin:0 0 2px">${l.href ? `<a href="${escapeHtml(l.href)}" style="color:#e2e8f0">${escapeHtml(l.text)}</a>` : escapeHtml(l.text)}</li>`).join('')}</ul>`)
    .join('');
  const html = `<!doctype html><html><body style="margin:0;background:#000;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif"><div style="max-width:560px;margin:0 auto;padding:28px 20px"><p style="color:#22d3ee;font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 8px">SpaceNexus company brief</p><h1 style="font-size:22px;margin:0 0 4px;color:#fff">${escapeHtml(company.name)} this week</h1><p style="color:#94a3b8;font-size:13px;margin:0 0 8px">From SpaceNexus's own tracking — jobs, contracts, funding, filings and news.</p>${sectionsHtml}<a href="${companyUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:600;margin-top:24px">Full company page</a><p style="color:#6b6b6b;font-size:12px;margin:28px 0 0">You asked for these on spacenexus.us. <a href="${unsub}" style="color:#94a3b8">Stop these briefs</a>.</p></div></body></html>`;
  return { subject, html, text };
}

function verificationEmail(companyName: string, verifyUrl: string): { html: string; text: string } {
  const text = `Confirm your weekly ${companyName} brief:\n${verifyUrl}\n\nOne email every Monday with the week's jobs, contracts, funding, filings and news — only when something actually happened. If you didn't ask for this, ignore it.\n`;
  const html = `<!doctype html><html><body style="margin:0;background:#000;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif"><div style="max-width:560px;margin:0 auto;padding:28px 20px"><p style="color:#22d3ee;font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 8px">SpaceNexus</p><h1 style="font-size:22px;margin:0 0 12px;color:#fff">Confirm your weekly ${escapeHtml(companyName)} brief</h1><p style="font-size:15px;line-height:1.5;margin:0 0 20px">One email every Monday with the week's jobs, contracts, funding, filings and news — and only when something actually happened. No account, no newsletter unless you ask.</p><a href="${verifyUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:600">Confirm the brief</a><p style="color:#6b6b6b;font-size:12px;margin:28px 0 0">If you didn't ask for this, ignore it — nothing is sent without confirmation.</p></div></body></html>`;
  return { html, text };
}

/**
 * Cron body (Mondays): for every verified watch without a delivery for the
 * current ISO week, compose its company's brief and send. Briefs are built
 * once per company and reused across watches. A quiet week (every section
 * empty) records the delivery without sending. Returns counts.
 */
export async function runCompanyBriefDeliveries(now: Date = new Date(), sendImpl?: (to: string, subject: string, html: string, text: string) => Promise<boolean>, maxSends = 300): Promise<{ watches: number; companies: number; sent: number; quiet: number; skipped: number }> {
  const send = sendImpl ?? (async (to, subject, html, text) => (await sendVerificationEmail(to, html, text, subject)).success);
  const periodKey = isoWeekKey(now);
  const since = new Date(now.getTime() - BRIEF_WINDOW_MS);
  const watches = await prisma.companyWatch.findMany({ where: { verified: true, unsubscribedAt: null }, select: { id: true, email: true, unsubscribeToken: true, companyProfileId: true, companyProfile: { select: { name: true, slug: true } } } });
  if (watches.length === 0) return { watches: 0, companies: 0, sent: 0, quiet: 0, skipped: 0 };
  const briefs = new Map<string, { company: { name: string; slug: string }; data: CompanyBriefData }>();
  let sent = 0; let quiet = 0; let skipped = 0;
  for (const w of watches) {
    const already = await prisma.companyBriefDelivery.findUnique({ where: { watchId_periodKey: { watchId: w.id, periodKey } }, select: { id: true } });
    if (already) continue;
    let brief = briefs.get(w.companyProfileId);
    if (!brief) {
      brief = { company: w.companyProfile, data: await collectCompanyBrief(w.companyProfileId, since) };
      briefs.set(w.companyProfileId, brief);
    }
    if (briefIsEmpty(brief.data)) {
      // Quiet week: no email, but record the period so nothing retries or repeats.
      await prisma.companyBriefDelivery.create({ data: { watchId: w.id, periodKey } }).catch(() => {});
      quiet++;
      continue;
    }
    if (sent >= maxSends) { skipped++; continue; }
    const mail = briefEmail(brief.company, brief.data, w.unsubscribeToken);
    const ok = await send(w.email, mail.subject, mail.html, mail.text);
    if (ok) {
      await prisma.companyBriefDelivery.create({ data: { watchId: w.id, periodKey } }).catch(() => {});
      sent++;
    } else {
      skipped++;
    }
  }
  return { watches: watches.length, companies: briefs.size, sent, quiet, skipped };
}
