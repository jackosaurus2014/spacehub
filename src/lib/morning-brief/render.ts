// SpaceNexus AM — email renderer (2026-09-12). Same discipline as the Daily
// Brief composer: ONE render shared by every recipient, the only per-recipient
// variation is the {{UNSUBSCRIBE_TOKEN}} placeholder that personalizeEmail()
// fills inside the batch sender. Dark, compact, no images (the Daily Brief
// deliverability lesson), true-black ground with the cyan kicker.

import type { MorningBriefIssue, MorningBriefNextLaunch, MorningBriefNumber, MorningBriefStory } from './types';
import { SUBJECT_MAX } from './types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us';

// Local copy (daily-brief.ts exports one, but that module pulls in Prisma and
// this renderer must stay importable from pure tests and the archive page).
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface RenderedBrief {
  subject: string;
  preheader: string;
  html: string;
  plain: string;
}

const S = {
  kicker: 'color:#22d3ee;font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin:24px 0 10px;font-weight:600',
  head: 'font-size:16px;line-height:1.35;margin:0 0 4px;color:#fff;font-weight:600',
  why: 'font-size:14px;line-height:1.5;margin:0 0 6px;color:#cbd5e1',
  meta: 'color:#94a3b8;font-size:12px;line-height:1.5;margin:0 0 18px',
  link: 'color:#7dd3fc;text-decoration:none',
  num: 'font-size:30px;line-height:1.1;color:#fff;font-weight:700;margin:0 0 4px',
};

export function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

/** "AM: <lead headline>", never over 70 chars. */
export function subjectFor(leadHeadline: string): string {
  const prefix = 'AM: ';
  return `${prefix}${truncate(leadHeadline.trim(), SUBJECT_MAX - prefix.length)}`;
}

/** "Tue Sep 15 · 14:30 UTC (10:30 ET)"; coarse precisions say NET month. */
export function fmtNet(iso: string, precision: string | null): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (precision ?? '').toLowerCase();
  if (/^(month|quarter|half|year|decade)$/.test(p)) {
    return `NET ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`;
  }
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const utc = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
  const et = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
  if (p === 'day') return `${day} (time TBD)`;
  return `${day} · ${utc} UTC (${et} ET)`;
}

function storyHtml(s: MorningBriefStory, i: number): string {
  const internal = s.internalHref
    ? ` · <a href="${APP_URL}${escapeHtml(s.internalHref)}" style="${S.link}">${escapeHtml(s.internalLabel || 'On SpaceNexus')}</a>`
    : '';
  return `<p style="${S.head}">${i + 1}. <a href="${escapeHtml(s.url)}" style="color:#fff;text-decoration:none">${escapeHtml(s.headline)}</a></p><p style="${S.why}">${escapeHtml(s.whyItMatters)}</p><p style="${S.meta}"><a href="${escapeHtml(s.url)}" style="${S.link}">${escapeHtml(s.source)}</a>${internal}</p>`;
}

function storyPlain(s: MorningBriefStory, i: number): string {
  const internal = s.internalHref ? `\n   SpaceNexus: ${APP_URL}${s.internalHref}` : '';
  return `${i + 1}. ${s.headline}\n   ${s.whyItMatters}\n   ${s.source}: ${s.url}${internal}`;
}

function launchHtml(nl: MorningBriefNextLaunch): string {
  const meta = [nl.rocket, nl.site].filter(Boolean).map((x) => escapeHtml(x as string)).join(' · ');
  return `<p style="${S.kicker}">Next launch</p><p style="${S.head}"><a href="${APP_URL}${escapeHtml(nl.href)}" style="color:#fff;text-decoration:none">${escapeHtml(nl.name)}</a></p><p style="${S.why}">${escapeHtml(fmtNet(nl.netUtc, nl.precision))}</p><p style="${S.meta}">${meta}${meta ? ' · ' : ''}<a href="${APP_URL}${escapeHtml(nl.href)}" style="${S.link}">Launch page</a></p>`;
}

function launchPlain(nl: MorningBriefNextLaunch): string {
  const meta = [nl.rocket, nl.site].filter(Boolean).join(' / ');
  return `\nNEXT LAUNCH\n${nl.name}\n${fmtNet(nl.netUtc, nl.precision)}${meta ? `\n${meta}` : ''}\n${APP_URL}${nl.href}\n`;
}

function numberHtml(n: MorningBriefNumber): string {
  const link = n.href ? ` · <a href="${APP_URL}${escapeHtml(n.href)}" style="${S.link}">${escapeHtml(n.label)}</a>` : '';
  const nia = n.notInvestmentAdvice ? ' Not investment advice.' : '';
  return `<p style="${S.kicker}">One number</p><p style="${S.num}">${escapeHtml(n.value)}</p><p style="${S.why}">${escapeHtml(n.context)}</p><p style="${S.meta}">Source: ${escapeHtml(n.source)} · as of ${escapeHtml(n.asOf.slice(0, 10))}${link}.${nia}</p>`;
}

function numberPlain(n: MorningBriefNumber): string {
  const nia = n.notInvestmentAdvice ? ' Not investment advice.' : '';
  return `\nONE NUMBER\n${n.value} — ${n.context}\nSource: ${n.source}, as of ${n.asOf.slice(0, 10)}.${nia}${n.href ? `\n${APP_URL}${n.href}` : ''}\n`;
}

export function renderMorningBriefEmail(issue: MorningBriefIssue): RenderedBrief {
  const subject = issue.subject || subjectFor(issue.stories[0]?.headline ?? 'SpaceNexus AM');
  const preheader = issue.preheader || issue.stories[0]?.whyItMatters || '';
  const dateLabel = new Date(`${issue.date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
  const archiveUrl = `${APP_URL}/brief/am/${issue.date}`;
  const stopUrl = `${APP_URL}/api/newsletter/morning-brief?token={{UNSUBSCRIBE_TOKEN}}&action=disable`;
  const manageUrl = `${APP_URL}/newsletter`;
  const fullUnsubUrl = `${APP_URL}/api/newsletter/unsubscribe?token={{UNSUBSCRIBE_TOKEN}}`;

  const html = `<!doctype html><html><body style="margin:0;background:#000;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif"><span style="display:none;max-height:0;overflow:hidden;color:#000">${escapeHtml(preheader)}</span><div style="max-width:560px;margin:0 auto;padding:28px 20px"><p style="color:#22d3ee;font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 4px">SpaceNexus AM</p><p style="color:#64748b;font-size:12px;margin:0 0 6px">${escapeHtml(dateLabel)} · the weekday morning brief · <a href="${archiveUrl}" style="color:#94a3b8">read online</a></p><p style="${S.kicker}">Five stories</p>${issue.stories.map(storyHtml).join('')}${issue.nextLaunch ? launchHtml(issue.nextLaunch) : ''}${issue.oneNumber ? numberHtml(issue.oneNumber) : ''}<p style="margin:26px 0 0"><a href="${APP_URL}/mission-control" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;font-size:14px">Open Mission Control</a></p><p style="color:#6b6b6b;font-size:12px;margin:26px 0 0;line-height:1.6">SpaceNexus AM goes out weekdays at 08:00 ET to subscribers who opted in. <a href="${manageUrl}" style="color:#94a3b8">Manage</a> · <a href="${stopUrl}" style="color:#94a3b8">Stop the AM brief</a> · <a href="${fullUnsubUrl}" style="color:#94a3b8">Unsubscribe from all email</a></p></div></body></html>`;

  const plain = `SPACENEXUS AM — ${dateLabel}
Read online: ${archiveUrl}

FIVE STORIES
${issue.stories.map(storyPlain).join('\n\n')}
${issue.nextLaunch ? launchPlain(issue.nextLaunch) : ''}${issue.oneNumber ? numberPlain(issue.oneNumber) : ''}
Open Mission Control: ${APP_URL}/mission-control

Manage: ${manageUrl}
Stop the AM brief: ${stopUrl}
Unsubscribe from all email: ${fullUnsubUrl}`;

  return { subject, preheader, html, plain };
}
