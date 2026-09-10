import { logger } from '@/lib/logger';
import { APP_URL } from '@/lib/constants';

/**
 * Employer-facing transactional email (2026-09-10): new application, listing
 * expiring, listing expired. Same Resend + from-address convention as the
 * job-alert sender; silently skipped when RESEND_API_KEY is unset.
 */
async function send(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { logger.info('Employer email skipped (no RESEND_API_KEY)', { subject }); return false; }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(key);
    const from = process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <noreply@spacenexus.us>';
    await resend.emails.send({ from, to, subject, html, text });
    return true;
  } catch (error) {
    logger.warn('Employer email failed', { subject, error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const shell = (title: string, body: string) => `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a"><h2 style="margin:0 0 12px">${esc(title)}</h2>${body}<p style="margin-top:24px;font-size:12px;color:#64748b">SpaceNexus · <a href="${APP_URL}/hire/dashboard">Employer portal</a></p></div>`;

export async function sendNewApplicationEmail(opts: { to: string; jobId: string; jobTitle: string; applicant: { name: string; email: string; phone?: string | null; linkedinUrl?: string | null; resumeUrl?: string | null; message?: string | null } }) {
  const a = opts.applicant;
  const portal = `${APP_URL}/hire/dashboard#applicants-${opts.jobId}`;
  const rows = [
    ['Name', a.name], ['Email', a.email], ['Phone', a.phone || '—'], ['LinkedIn / portfolio', a.linkedinUrl || '—'], ['Résumé link', a.resumeUrl || '—'],
  ].map(([k, v]) => `<tr><td style="padding:4px 8px 4px 0;color:#64748b">${esc(k)}</td><td style="padding:4px 0">${esc(v)}</td></tr>`).join('');
  const html = shell(`New applicant: ${opts.jobTitle}`, `<table>${rows}</table>${a.message ? `<p style="white-space:pre-wrap;border-left:3px solid #e2e8f0;padding-left:12px">${esc(a.message)}</p>` : ''}<p><a href="${portal}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Review in the portal</a></p>`);
  const text = `New applicant for ${opts.jobTitle}\n\nName: ${a.name}\nEmail: ${a.email}\nPhone: ${a.phone || '—'}\nLinkedIn/portfolio: ${a.linkedinUrl || '—'}\nRésumé: ${a.resumeUrl || '—'}\n\n${a.message || ''}\n\nReview: ${portal}`;
  return send(opts.to, `New applicant: ${opts.jobTitle} — ${a.name}`, html, text);
}

export async function sendListingExpiryEmail(opts: { to: string; jobId: string; jobTitle: string; expiresAt: Date; expired: boolean; views: number; applyClicks: number; applicants: number }) {
  const when = opts.expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const portal = `${APP_URL}/hire/dashboard`;
  const title = opts.expired ? `Your listing has expired: ${opts.jobTitle}` : `Your listing expires ${when}: ${opts.jobTitle}`;
  const stats = `${opts.views.toLocaleString()} views · ${opts.applyClicks.toLocaleString()} apply clicks${opts.applicants ? ` · ${opts.applicants} applicants` : ''}`;
  const html = shell(title, `<p>${esc(stats)} so far.</p><p>${opts.expired ? 'It is off the board now. Renew it to put it back for another 30 or 45 days, or edit it first if the role has changed.' : 'Renew before it expires to keep it on the board without a gap — featured renewals are pinned above the 8,600+ synced roles.'}</p><p><a href="${portal}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">${opts.expired ? 'Renew the listing' : 'Renew or edit'}</a></p>`);
  const text = `${title}\n\n${stats} so far.\n\n${portal}`;
  return send(opts.to, title, html, text);
}
