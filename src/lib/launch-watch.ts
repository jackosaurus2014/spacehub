// ─── Launch alerts without an account ────────────────────────────────────────
// A LaunchWatch is an email + a scope (one launch, a rocket, or a site).
// Double opt-in. Three messages per matching launch: T-24h, T-1h, outcome —
// plus a fourth, 'debrief', once a MissionDebrief for the flown launch is
// published (2026-09-01: "your launch flew — here is what happened and why").
// Delivery is recorded per (watch, event, kind) so nothing repeats.
//
// Why (2026-08-29 roadmap, Tier 2 #9): AlertRule requires a signed-in user,
// so the site's largest traffic source — launch pages found through search —
// could never be reached a second time. This is the one change that turns a
// one-shot visitor into a returning one; launches happen several times a week.

import { randomBytes } from 'crypto';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { sendVerificationEmail } from '@/lib/newsletter/email-service';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us';
export const T24_MS = 24 * 3600_000;
export const T1_MS = 3600_000;
export const OUTCOME_WINDOW_MS = 12 * 3600_000;
/** A published debrief for a launch flown within this window is mailed to its watchers. */
export const DEBRIEF_WINDOW_MS = 7 * 24 * 3600_000;
export const MAX_WATCHES_PER_EMAIL = 25;

export type WatchKind = 't24' | 't1' | 'outcome' | 'debrief';

export interface WatchScope {
  eventId?: string | null;
  rocket?: string | null;
  site?: string | null;
}

function token(): string {
  return randomBytes(24).toString('hex');
}

// Confirmation-email cooldown per address (2026-09-01, M4): an unverified
// row used to re-send on every POST, which made the endpoint an email bomb.
// In-memory, per instance — the IP bucket in middleware is the other half.
export const RESEND_COOLDOWN_MS = 10 * 60 * 1000;
const lastConfirmationAt = new Map<string, number>();
export function confirmationCooldownRemaining(email: string, now = Date.now()): number {
  const t = lastConfirmationAt.get(email) ?? 0;
  return Math.max(0, t + RESEND_COOLDOWN_MS - now);
}
/** Test hook. */
export function _resetConfirmationCooldown(): void {
  lastConfirmationAt.clear();
}
export function markConfirmationSent(email: string, now = Date.now()): void {
  if (lastConfirmationAt.size > 5000) {
    lastConfirmationAt.forEach((t, k) => { if (t + RESEND_COOLDOWN_MS < now) lastConfirmationAt.delete(k); });
  }
  lastConfirmationAt.set(email, now);
}

export function scopeLabel(w: WatchScope & { eventName?: string | null }): string {
  if (w.eventId) return w.eventName ? `the ${w.eventName} launch` : 'this launch';
  if (w.rocket) return `every ${w.rocket} launch`;
  if (w.site) return `every launch from ${w.site}`;
  return 'launches';
}

/** Create (or re-send verification for) a watch. Never reveals whether an email exists elsewhere. */
export async function createLaunchWatch(email: string, scope: WatchScope, source: string): Promise<{ ok: boolean; status: 'sent' | 'already-verified' | 'limit' | 'cooldown' | 'error' }> {
  const normalized = email.trim().toLowerCase();
  const where = { email: normalized, eventId: scope.eventId ?? null, rocket: scope.rocket ?? null, site: scope.site ?? null, unsubscribedAt: null };
  try {
    const existing = await prisma.launchWatch.findFirst({ where, select: { id: true, verified: true, verificationToken: true } });
    if (existing?.verified) return { ok: true, status: 'already-verified' };
    // Reported as success to the caller (enumeration-safe), but no email goes out.
    if (confirmationCooldownRemaining(normalized) > 0) return { ok: true, status: 'cooldown' };
    const count = await prisma.launchWatch.count({ where: { email: normalized, unsubscribedAt: null } });
    if (!existing && count >= MAX_WATCHES_PER_EMAIL) return { ok: false, status: 'limit' };
    const watch = existing
      ? existing
      : await prisma.launchWatch.create({ data: { email: normalized, eventId: scope.eventId ?? null, rocket: scope.rocket ?? null, site: scope.site ?? null, verificationToken: token(), unsubscribeToken: token(), source }, select: { id: true, verified: true, verificationToken: true } });
    const eventName = scope.eventId ? (await prisma.spaceEvent.findUnique({ where: { id: scope.eventId }, select: { name: true } }))?.name : null;
    const label = scopeLabel({ ...scope, eventName });
    const verifyUrl = `${APP_URL}/api/launch-watch/verify?token=${watch.verificationToken}`;
    const { html, text } = verificationEmail(label, verifyUrl);
    const sent = await sendVerificationEmail(normalized, html, text, `Confirm launch alerts for ${label}`);
    if (sent.success) markConfirmationSent(normalized);
    return { ok: sent.success, status: sent.success ? 'sent' : 'error' };
  } catch (err) {
    logger.error('createLaunchWatch failed', { error: err instanceof Error ? err.message : String(err) });
    return { ok: false, status: 'error' };
  }
}

export async function verifyLaunchWatch(verificationToken: string): Promise<{ ok: boolean; label?: string }> {
  const w = await prisma.launchWatch.findUnique({ where: { verificationToken }, select: { id: true, verified: true, eventId: true, rocket: true, site: true } });
  if (!w) return { ok: false };
  if (!w.verified) await prisma.launchWatch.update({ where: { id: w.id }, data: { verified: true, verifiedAt: new Date() } });
  const eventName = w.eventId ? (await prisma.spaceEvent.findUnique({ where: { id: w.eventId }, select: { name: true } }))?.name : null;
  return { ok: true, label: scopeLabel({ ...w, eventName }) };
}

export async function unsubscribeLaunchWatch(unsubscribeToken: string, all = false): Promise<{ ok: boolean; count: number }> {
  const w = await prisma.launchWatch.findUnique({ where: { unsubscribeToken }, select: { id: true, email: true } });
  if (!w) return { ok: false, count: 0 };
  const r = all
    ? await prisma.launchWatch.updateMany({ where: { email: w.email, unsubscribedAt: null }, data: { unsubscribedAt: new Date() } })
    : await prisma.launchWatch.updateMany({ where: { id: w.id }, data: { unsubscribedAt: new Date() } });
  return { ok: true, count: r.count };
}

// ── Matching ───────────────────────────────────────────────────────────────

export interface WatchLike { id: string; email: string; eventId: string | null; rocket: string | null; site: string | null; unsubscribeToken: string }
export interface EventLike { id: string; name: string; rocket: string | null; location: string | null; agency: string | null; launchDate: Date | null; status: string; mission: string | null }

export function watchMatchesEvent(w: WatchLike, e: EventLike): boolean {
  if (w.eventId) return w.eventId === e.id;
  if (w.rocket) return !!e.rocket && e.rocket.toLowerCase().includes(w.rocket.toLowerCase());
  if (w.site) return !!e.location && e.location.toLowerCase().includes(w.site.toLowerCase());
  return false;
}

/** Which messages are due for an event right now, given its date and status.
 *  Pure: whether a published debrief exists is looked up by the caller and
 *  passed in as `debriefAvailable` (a flown launch within DEBRIEF_WINDOW_MS
 *  with a published debrief is due a 'debrief' message). */
export function dueKinds(e: EventLike, now: Date, opts: { debriefAvailable?: boolean } = {}): WatchKind[] {
  const out: WatchKind[] = [];
  if (!e.launchDate) return out;
  const dt = e.launchDate.getTime() - now.getTime();
  const flown = e.status === 'completed' || e.status === 'failed';
  if (flown && dt > -OUTCOME_WINDOW_MS) out.push('outcome');
  if (flown && dt <= 0 && dt > -DEBRIEF_WINDOW_MS && opts.debriefAvailable) out.push('debrief');
  if (!flown && dt > 0 && dt <= T1_MS) out.push('t1');
  if (!flown && dt > T1_MS && dt <= T24_MS) out.push('t24');
  return out;
}

export interface DebriefLike { slug: string; missionName: string; executiveSummary: string; keyTakeaways: string[] }

// ── Sending ────────────────────────────────────────────────────────────────

function fmtUtc(d: Date | null): string {
  return d ? d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) + ' UTC' : 'TBD';
}

export function alertEmail(kind: WatchKind, e: EventLike, unsubscribeToken: string): { subject: string; html: string; text: string } {
  const title = e.name.includes(' | ') ? e.name.split(' | ').slice(1).join(' | ') : e.name;
  const url = `${APP_URL}/launch/${e.id}`;
  const unsub = `${APP_URL}/api/launch-watch/unsubscribe?token=${unsubscribeToken}`;
  const meta = [e.rocket, e.agency, e.location].filter(Boolean).join(' · ');
  let subject: string; let lead: string;
  if (kind === 't24') { subject = `Tomorrow: ${title} (${fmtUtc(e.launchDate)})`; lead = `Launches in about a day — ${fmtUtc(e.launchDate)}.`; }
  // G14 (2026-09-01): the T-1h alert is the moment an alert-clicker becomes
  // a community member — the launch page's live chat is one tap away.
  else if (kind === 't1') { subject = `T-1 hour: ${title}`; lead = `Liftoff is scheduled for ${fmtUtc(e.launchDate)}. Streams are usually live 20-30 minutes before — and the live chat on the launch page is already going.`; }
  else if (e.status === 'completed') { subject = `Launched: ${title}`; lead = `${title} launched successfully at ${fmtUtc(e.launchDate)}.`; }
  else { subject = `Launch failure: ${title}`; lead = `${title} failed during its launch attempt at ${fmtUtc(e.launchDate)}. Details as they come in.`; }
  const chatLine = kind === 't1' ? `Join the live chat: ${url}#chat\n\n` : '';
  const text = `${lead}\n\n${meta}\n\nWatch / details: ${url}\n${chatLine ? '\n' + chatLine : '\n'}Stop these alerts: ${unsub}\n`;
  const html = `<!doctype html><html><body style="margin:0;background:#000;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif"><div style="max-width:560px;margin:0 auto;padding:28px 20px"><p style="color:#22d3ee;font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 8px">SpaceNexus launch alert</p><h1 style="font-size:22px;margin:0 0 12px;color:#fff">${escapeHtml(title)}</h1><p style="font-size:15px;line-height:1.5;margin:0 0 8px">${escapeHtml(lead)}</p><p style="color:#94a3b8;font-size:13px;margin:0 0 20px">${escapeHtml(meta)}</p><a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:600">Watch &amp; details</a>${kind === 't1' ? `<p style="font-size:13px;margin:14px 0 0"><a href="${url}#chat" style="color:#22d3ee;text-decoration:none">💬 Join the live launch chat →</a></p>` : ''}<p style="color:#6b6b6b;font-size:12px;margin:28px 0 0">You asked for these on spacenexus.us. <a href="${unsub}" style="color:#94a3b8">Stop these alerts</a>.</p></div></body></html>`;
  return { subject, html, text };
}

/** The 'debrief' message: the published MissionDebrief's executive summary
 *  and up to three key takeaways, linking to /mission-debriefs/<slug>. */
export function debriefEmail(e: EventLike, d: DebriefLike, unsubscribeToken: string): { subject: string; html: string; text: string } {
  const mission = d.missionName || (e.name.includes(' | ') ? e.name.split(' | ').slice(1).join(' | ') : e.name);
  const url = `${APP_URL}/mission-debriefs/${encodeURIComponent(d.slug)}`;
  const unsub = `${APP_URL}/api/launch-watch/unsubscribe?token=${unsubscribeToken}`;
  const takeaways = (d.keyTakeaways || []).filter(Boolean).slice(0, 3);
  const subject = `Debrief: ${mission} — what happened and why`;
  const text = `${d.executiveSummary.trim()}\n\n${takeaways.length ? 'Key takeaways:\n' + takeaways.map(t => `- ${t}`).join('\n') + '\n\n' : ''}Full debrief: ${url}\n\nStop these alerts: ${unsub}\n`;
  const html = `<!doctype html><html><body style="margin:0;background:#000;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif"><div style="max-width:560px;margin:0 auto;padding:28px 20px"><p style="color:#22d3ee;font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 8px">SpaceNexus mission debrief</p><h1 style="font-size:22px;margin:0 0 12px;color:#fff">${escapeHtml(mission)}</h1><p style="font-size:15px;line-height:1.5;margin:0 0 16px">${escapeHtml(d.executiveSummary.trim())}</p>${takeaways.length ? `<p style="color:#94a3b8;font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 6px">Key takeaways</p><ul style="margin:0 0 20px;padding-left:18px;font-size:14px;line-height:1.55">${takeaways.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>` : ''}<a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:600">Read the full debrief</a><p style="color:#6b6b6b;font-size:12px;margin:28px 0 0">You asked for launch alerts on spacenexus.us. <a href="${unsub}" style="color:#94a3b8">Stop these alerts</a>.</p></div></body></html>`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function verificationEmail(label: string, verifyUrl: string): { html: string; text: string } {
  const text = `Confirm your launch alerts for ${label}:\n${verifyUrl}\n\nYou'll get an email a day before, an hour before, and when it flies. If you didn't ask for this, ignore it.\n`;
  const html = `<!doctype html><html><body style="margin:0;background:#000;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif"><div style="max-width:560px;margin:0 auto;padding:28px 20px"><p style="color:#22d3ee;font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 8px">SpaceNexus</p><h1 style="font-size:22px;margin:0 0 12px;color:#fff">Confirm launch alerts for ${escapeHtml(label)}</h1><p style="font-size:15px;line-height:1.5;margin:0 0 20px">One email a day before, one an hour before, and one when it flies. No account, no newsletter unless you ask.</p><a href="${verifyUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:600">Confirm alerts</a><p style="color:#6b6b6b;font-size:12px;margin:28px 0 0">If you didn't ask for this, ignore it — nothing is sent without confirmation.</p></div></body></html>`;
  return { html, text };
}

/**
 * Cron body: for every verified watch, find matching events with a due
 * message not yet delivered, and send. Returns counts. Sends via Resend
 * directly (same path the newsletter uses) with per-run caps.
 */
export async function runLaunchWatchDeliveries(now: Date = new Date(), sendImpl?: (to: string, subject: string, html: string, text: string) => Promise<boolean>, maxSends = 300): Promise<{ watches: number; events: number; sent: number; skipped: number }> {
  const send = sendImpl ?? (async (to, subject, html, text) => (await sendVerificationEmail(to, html, text, subject)).success);
  const watches = await prisma.launchWatch.findMany({ where: { verified: true, unsubscribedAt: null }, select: { id: true, email: true, eventId: true, rocket: true, site: true, unsubscribeToken: true } });
  if (watches.length === 0) return { watches: 0, events: 0, sent: 0, skipped: 0 };
  // Window widened to DEBRIEF_WINDOW_MS behind us: a flown launch stays in
  // scope for a week so its published debrief can follow the outcome mail.
  const events = await prisma.spaceEvent.findMany({
    where: { rocket: { not: null }, launchDate: { gte: new Date(now.getTime() - DEBRIEF_WINDOW_MS), lte: new Date(now.getTime() + T24_MS) } },
    select: { id: true, name: true, rocket: true, location: true, agency: true, launchDate: true, status: true, mission: true },
  });
  // Published debriefs for the flown events in scope, keyed by eventId.
  const flownIds = events.filter(e => e.status === 'completed' || e.status === 'failed').map(e => e.id);
  const debriefs = new Map<string, DebriefLike>();
  if (flownIds.length > 0) {
    const rows = (await prisma.missionDebrief.findMany({
      where: { eventId: { in: flownIds }, publishedAt: { not: null } },
      select: { eventId: true, slug: true, missionName: true, executiveSummary: true, keyTakeaways: true },
    })) ?? [];
    for (const d of rows) if (d.eventId && !debriefs.has(d.eventId)) debriefs.set(d.eventId, d);
  }
  let sent = 0; let skipped = 0;
  for (const e of events) {
    const debrief = debriefs.get(e.id);
    const kinds = dueKinds(e, now, { debriefAvailable: !!debrief });
    if (kinds.length === 0) continue;
    for (const w of watches) {
      if (!watchMatchesEvent(w, e)) continue;
      for (const kind of kinds) {
        if (sent >= maxSends) { skipped++; continue; }
        const already = await prisma.launchWatchDelivery.findUnique({ where: { watchId_eventId_kind: { watchId: w.id, eventId: e.id, kind } }, select: { id: true } });
        if (already) continue;
        const mail = kind === 'debrief' && debrief ? debriefEmail(e, debrief, w.unsubscribeToken) : alertEmail(kind, e, w.unsubscribeToken);
        const ok = await send(w.email, mail.subject, mail.html, mail.text);
        if (ok) {
          await prisma.launchWatchDelivery.create({ data: { watchId: w.id, eventId: e.id, kind } }).catch(() => {});
          sent++;
        } else {
          skipped++;
        }
      }
    }
  }
  return { watches: watches.length, events: events.length, sent, skipped };
}
