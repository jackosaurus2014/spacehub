// Daily Brief (G7) — compact, auto-compiled morning email sent ~07:00 UTC to
// subscribers who explicitly opted in (NewsletterSubscriber.dailyBrief).
// Complements — never replaces — the editorial M/Th Digest.
//
// Design rules:
// - Owned data only (our own tables; no external fetches at compose time).
// - ONE compose shared by every recipient; the only per-recipient variation is
//   the {{UNSUBSCRIBE_TOKEN}} placeholder that personalizeEmail() fills in.
// - Sections with no content are omitted entirely. If EVERY section is empty
//   the whole day is skipped (composeDailyBrief returns null; the cron logs it).
import prisma from '@/lib/db';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us';

export interface DailyBriefSection {
  title: string;
  html: string;
  plain: string;
  /** Headline candidate for the subject line (set by launches/news). */
  top?: string;
}

export interface DailyBrief {
  subject: string;
  topItem: string;
  html: string;
  plain: string;
  sectionCount: number;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** "T−5h 32m" style countdown from now to a launch date. */
export function tMinus(launchDate: Date, now: Date): string {
  const ms = launchDate.getTime() - now.getTime();
  if (ms <= 0) return 'T−0';
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `T−${m}m`;
  return `T−${h}h ${m}m`;
}

/** "$1.2B" / "$450M" / "$3.5M" / "$820K" compact USD. */
export function fmtUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1e3) return `$${Math.round(value / 1e3)}K`;
  return `$${Math.round(value)}`;
}

function fmtUtcTime(d: Date): string {
  return `${d.toISOString().slice(11, 16)} UTC`;
}

/** "Sep 1" style date used in the subject line. */
export function fmtSubjectDate(now: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[now.getUTCMonth()]} ${now.getUTCDate()}`;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

// ---------------------------------------------------------------------------
// Section builders (each returns null when it has nothing to say)
// ---------------------------------------------------------------------------

const S = {
  kicker: 'color:#22d3ee;font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin:22px 0 8px;font-weight:600',
  item: 'font-size:14px;line-height:1.5;margin:0 0 8px;color:#e2e8f0',
  meta: 'color:#94a3b8;font-size:12px',
  link: 'color:#7dd3fc;text-decoration:none',
};

function section(title: string, htmlItems: string[], plainItems: string[]): DailyBriefSection {
  return {
    title,
    html: `<p style="${S.kicker}">${escapeHtml(title)}</p>${htmlItems.join('')}`,
    plain: `\n${title.toUpperCase()}\n${plainItems.join('\n')}\n`,
  };
}

async function buildLaunchesNext24h(now: Date): Promise<DailyBriefSection | null> {
  const events = await prisma.spaceEvent.findMany({
    where: {
      type: 'launch',
      status: 'upcoming',
      launchDate: { gte: now, lte: new Date(now.getTime() + 24 * 3600 * 1000) },
    },
    orderBy: { launchDate: 'asc' },
    take: 5,
    select: { name: true, rocket: true, location: true, launchDate: true },
  });
  const withDate = events.filter((e) => e.launchDate);
  if (withDate.length === 0) return null;

  const htmlItems = withDate.map((e) => {
    const meta = [e.rocket, e.location].filter(Boolean).join(' · ');
    return `<p style="${S.item}"><strong style="color:#fff">${tMinus(e.launchDate as Date, now)}</strong> — ${escapeHtml(e.name)}<br><span style="${S.meta}">${escapeHtml(meta ? `${meta} · ` : '')}${fmtUtcTime(e.launchDate as Date)}</span></p>`;
  });
  const plainItems = withDate.map((e) => {
    const meta = [e.rocket, e.location].filter(Boolean).join(' / ');
    return `- ${tMinus(e.launchDate as Date, now)} ${e.name}${meta ? ` (${meta})` : ''} at ${fmtUtcTime(e.launchDate as Date)}`;
  });
  return { ...section('Launching in the next 24h', htmlItems, plainItems), top: withDate[0].name };
}

async function buildLaunchOutcomes(now: Date): Promise<DailyBriefSection | null> {
  const events = await prisma.spaceEvent.findMany({
    where: {
      type: 'launch',
      status: { in: ['completed', 'failed'] },
      launchDate: { gte: new Date(now.getTime() - 24 * 3600 * 1000), lte: now },
    },
    orderBy: { launchDate: 'desc' },
    take: 5,
    select: { name: true, rocket: true, status: true, launchDate: true },
  });
  if (events.length === 0) return null;

  const htmlItems = events.map((e) => {
    const ok = e.status === 'completed';
    const badge = ok
      ? '<span style="color:#4ade80;font-weight:600">Success</span>'
      : '<span style="color:#f87171;font-weight:600">Failure</span>';
    return `<p style="${S.item}">${badge} — ${escapeHtml(e.name)}${e.rocket ? ` <span style="${S.meta}">(${escapeHtml(e.rocket)})</span>` : ''}</p>`;
  });
  const plainItems = events.map(
    (e) => `- ${e.status === 'completed' ? 'SUCCESS' : 'FAILURE'}: ${e.name}${e.rocket ? ` (${e.rocket})` : ''}`
  );
  return section("Yesterday's launch outcomes", htmlItems, plainItems);
}

async function buildTopNews(now: Date): Promise<DailyBriefSection | null> {
  const articles = await prisma.newsArticle.findMany({
    where: { publishedAt: { gte: new Date(now.getTime() - 24 * 3600 * 1000), lte: now } },
    orderBy: { publishedAt: 'desc' },
    take: 25,
    select: { title: true, url: true, source: true },
  });
  if (articles.length === 0) return null;

  // Prefer distinct sources: first pass keeps one article per source, second
  // pass tops up to 5 with whatever is left (newest first).
  const seen = new Set<string>();
  const picked: typeof articles = [];
  for (const a of articles) {
    if (picked.length >= 5) break;
    if (seen.has(a.source)) continue;
    seen.add(a.source);
    picked.push(a);
  }
  for (const a of articles) {
    if (picked.length >= 5) break;
    if (!picked.includes(a)) picked.push(a);
  }

  const htmlItems = picked.map(
    (a) =>
      `<p style="${S.item}"><a href="${escapeHtml(a.url)}" style="${S.link}">${escapeHtml(a.title)}</a> <span style="${S.meta}">— ${escapeHtml(a.source)}</span></p>`
  );
  const plainItems = picked.map((a) => `- ${a.title} (${a.source})\n  ${a.url}`);
  return { ...section('Top stories', htmlItems, plainItems), top: picked[0].title };
}

async function buildStockMover(): Promise<DailyBriefSection | null> {
  const companies = await prisma.companyProfile.findMany({
    where: { isPublic: true, priceChange24h: { not: null } },
    select: { name: true, ticker: true, slug: true, stockPrice: true, priceChange24h: true },
  });
  const withChange = companies.filter(
    (c): c is typeof c & { priceChange24h: number } =>
      typeof c.priceChange24h === 'number' && Number.isFinite(c.priceChange24h) && c.priceChange24h !== 0
  );
  if (withChange.length === 0) return null;

  const mover = withChange.reduce((best, c) =>
    Math.abs(c.priceChange24h) > Math.abs(best.priceChange24h) ? c : best
  );
  const up = mover.priceChange24h > 0;
  const pct = `${up ? '+' : ''}${mover.priceChange24h.toFixed(1)}%`;
  const label = `${mover.name}${mover.ticker ? ` (${mover.ticker})` : ''}`;
  const price = typeof mover.stockPrice === 'number' ? ` to $${mover.stockPrice.toFixed(2)}` : '';

  const html = `<p style="${S.item}"><a href="${APP_URL}/companies/${escapeHtml(mover.slug)}" style="${S.link}">${escapeHtml(label)}</a> <span style="color:${up ? '#4ade80' : '#f87171'};font-weight:600">${pct}</span><span style="${S.meta}">${escapeHtml(price)} · biggest tracked mover</span></p>`;
  const plain = `- ${label} ${pct}${price} (biggest tracked mover)`;
  return section('Stock mover', [html], [plain]);
}

async function buildContractAwards(now: Date): Promise<DailyBriefSection | null> {
  const awards = await prisma.governmentContractAward.findMany({
    where: { createdAt: { gte: new Date(now.getTime() - 24 * 3600 * 1000) } },
    orderBy: [{ value: { sort: 'desc', nulls: 'last' } }],
    take: 3,
    select: { companyName: true, agency: true, title: true, value: true },
  });
  if (awards.length === 0) return null;

  const htmlItems = awards.map(
    (a) =>
      `<p style="${S.item}"><strong style="color:#fff">${escapeHtml(a.companyName)}</strong>${a.value ? ` <span style="color:#fbbf24;font-weight:600">${fmtUsd(a.value)}</span>` : ''}<br><span style="${S.meta}">${escapeHtml(a.agency)} · ${escapeHtml(truncate(a.title, 90))}</span></p>`
  );
  const plainItems = awards.map(
    (a) => `- ${a.companyName}${a.value ? ` ${fmtUsd(a.value)}` : ''} — ${a.agency}: ${truncate(a.title, 90)}`
  );
  return section('New government contracts', htmlItems, plainItems);
}

async function buildFundingRounds(now: Date): Promise<DailyBriefSection | null> {
  const rounds = await prisma.fundingRound.findMany({
    where: { createdAt: { gte: new Date(now.getTime() - 24 * 3600 * 1000) } },
    orderBy: [{ amount: { sort: 'desc', nulls: 'last' } }],
    take: 3,
    select: {
      amount: true,
      seriesLabel: true,
      leadInvestor: true,
      company: { select: { name: true, slug: true } },
    },
  });
  if (rounds.length === 0) return null;

  const htmlItems = rounds.map((r) => {
    const bits = [r.seriesLabel, r.leadInvestor ? `led by ${r.leadInvestor}` : null].filter(Boolean).join(' · ');
    return `<p style="${S.item}"><a href="${APP_URL}/companies/${escapeHtml(r.company.slug)}" style="${S.link}">${escapeHtml(r.company.name)}</a>${r.amount ? ` <span style="color:#fbbf24;font-weight:600">${fmtUsd(r.amount)}</span>` : ''}${bits ? `<br><span style="${S.meta}">${escapeHtml(bits)}</span>` : ''}</p>`;
  });
  const plainItems = rounds.map((r) => {
    const bits = [r.seriesLabel, r.leadInvestor ? `led by ${r.leadInvestor}` : null].filter(Boolean).join(', ');
    return `- ${r.company.name}${r.amount ? ` ${fmtUsd(r.amount)}` : ''}${bits ? ` (${bits})` : ''}`;
  });
  return section('New funding', htmlItems, plainItems);
}

// ---------------------------------------------------------------------------
// Compose
// ---------------------------------------------------------------------------

/**
 * Compose the Daily Brief for `now`. Returns null when every section is empty
 * (the cron skips the day and logs it). The returned html/plain contain the
 * {{UNSUBSCRIBE_TOKEN}} placeholder that personalizeEmail() fills per
 * recipient inside the existing batch sender.
 */
export async function composeDailyBrief(now: Date = new Date()): Promise<DailyBrief | null> {
  const [launches, outcomes, news, stock, contracts, funding] = await Promise.all([
    buildLaunchesNext24h(now),
    buildLaunchOutcomes(now),
    buildTopNews(now),
    buildStockMover(),
    buildContractAwards(now),
    buildFundingRounds(now),
  ]);

  const sections = [launches, outcomes, news, stock, contracts, funding].filter(
    (s): s is DailyBriefSection => s !== null
  );
  if (sections.length === 0) return null;

  // Subject top item: the first upcoming launch, else the top story, else the
  // headline of whatever section leads the brief.
  const topItem = truncate(launches?.top ?? news?.top ?? sections[0].title, 60);

  const subject = `☀ SpaceNexus Daily — ${topItem}, ${fmtSubjectDate(now)}`;

  const dateLine = now.toISOString().slice(0, 10);
  const unsubUrl = `${APP_URL}/api/newsletter/unsubscribe?token={{UNSUBSCRIBE_TOKEN}}&scope=daily`;
  const fullUnsubUrl = `${APP_URL}/api/newsletter/unsubscribe?token={{UNSUBSCRIBE_TOKEN}}`;

  const html = `<!doctype html><html><body style="margin:0;background:#000;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif"><div style="max-width:560px;margin:0 auto;padding:28px 20px"><p style="color:#22d3ee;font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 4px">SpaceNexus Daily Brief</p><p style="color:#64748b;font-size:12px;margin:0 0 4px">${dateLine} · compiled at 07:00 UTC</p>${sections.map((s) => s.html).join('')}<p style="margin:26px 0 0"><a href="${APP_URL}/desk" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;font-size:14px">Read on the site</a></p><p style="color:#6b6b6b;font-size:12px;margin:26px 0 0;line-height:1.6">You opted into the Daily Brief on spacenexus.us. <a href="${APP_URL}/newsletter" style="color:#94a3b8">Manage preferences</a> · <a href="${unsubUrl}" style="color:#94a3b8">Stop the Daily Brief</a> · <a href="${fullUnsubUrl}" style="color:#94a3b8">Unsubscribe from all email</a></p></div></body></html>`;

  const plain = `SPACENEXUS DAILY BRIEF — ${dateLine}
${sections.map((s) => s.plain).join('')}
Read on the site: ${APP_URL}/desk (account holders) or ${APP_URL}

Manage preferences: ${APP_URL}/newsletter
Stop the Daily Brief: ${unsubUrl}
Unsubscribe from all email: ${fullUnsubUrl}`;

  return { subject, topItem, html, plain, sectionCount: sections.length };
}
