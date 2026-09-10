import { logger } from '@/lib/logger';
import { APP_URL, FOUNDER_EMAIL } from '@/lib/constants';

/**
 * Immediate founder heads-up for inbound messages (2026-09-10). Until now a
 * contact-form submission produced only a DB row, a log line and a place in
 * the daily reachout sentinel; eleven real messages (billing, partnership)
 * sat unanswered from May to September. Fire-and-forget; never throws.
 */
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export async function notifyFounderOfContact(opts: { id: string; name: string; email: string; subject: string; message: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { logger.info('Founder contact notification skipped (no RESEND_API_KEY)'); return false; }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(key);
    const from = process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <noreply@spacenexus.us>';
    const subject = `Contact form (${opts.subject}): ${opts.name}`;
    const admin = `${APP_URL}/admin?tab=reachouts`;
    const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a"><h2 style="margin:0 0 12px">${esc(subject)}</h2><p><b>${esc(opts.name)}</b> &lt;${esc(opts.email)}&gt; · ${esc(opts.subject)}</p><p style="white-space:pre-wrap;border-left:3px solid #e2e8f0;padding-left:12px">${esc(opts.message)}</p><p><a href="mailto:${esc(opts.email)}?subject=${encodeURIComponent(`Re: your message to SpaceNexus`)}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Reply</a> &nbsp; <a href="${admin}">Open reachouts</a></p></div>`;
    const text = `${subject}\n\nFrom: ${opts.name} <${opts.email}>\nSubject: ${opts.subject}\n\n${opts.message}\n\nReply: ${opts.email}\nReachouts: ${admin}`;
    await resend.emails.send({ from, to: FOUNDER_EMAIL, replyTo: opts.email, subject, html, text });
    return true;
  } catch (error) {
    logger.warn('Founder contact notification failed', { id: opts.id, error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}
