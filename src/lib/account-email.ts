import { logger } from '@/lib/logger';
import { APP_URL } from '@/lib/constants';

/** Account-security emails for the self-serve email change (2026-09-10). */
async function send(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { logger.warn('Account email skipped (no RESEND_API_KEY)', { subject }); return false; }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(key);
    const from = process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <noreply@spacenexus.us>';
    const { error } = await resend.emails.send({ from, to, subject, html, text });
    if (error) { logger.warn('Account email rejected', { subject, error: error.message }); return false; }
    return true;
  } catch (error) {
    logger.warn('Account email failed', { subject, error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const shell = (title: string, body: string) => `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a"><h2 style="margin:0 0 12px">${esc(title)}</h2>${body}<p style="margin-top:24px;font-size:12px;color:#64748b">SpaceNexus · <a href="${APP_URL}/account?section=security">Account security</a></p></div>`;
const hi = (name: string | null) => (name ? `Hi ${esc(name)},` : 'Hi,');

export async function sendEmailChangeVerification(opts: { to: string; name: string | null; token: string; expiresAt: Date }) {
  const url = `${APP_URL}/api/account/change-email/confirm?token=${encodeURIComponent(opts.token)}`;
  const mins = Math.max(1, Math.round((opts.expiresAt.getTime() - Date.now()) / 60_000));
  const html = shell('Confirm your new SpaceNexus email', `<p>${hi(opts.name)}</p><p>Open the link below to make <b>${esc(opts.to)}</b> the email on your SpaceNexus account. It expires in ${mins} minutes. If you did not ask for this, ignore it and nothing changes.</p><p><a href="${url}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Confirm new email</a></p><p style="font-size:12px;color:#64748b">${esc(url)}</p>`);
  const text = `Confirm your new SpaceNexus email\n\nOpen this link to make ${opts.to} the email on your account (expires in ${mins} minutes):\n${url}\n\nIf you did not ask for this, ignore it and nothing changes.`;
  return send(opts.to, 'Confirm your new SpaceNexus email', html, text);
}

export async function sendEmailChangeNotice(opts: { to: string; name: string | null; newEmail: string }) {
  const html = shell('Email change requested on your account', `<p>${hi(opts.name)}</p><p>Someone signed in to your SpaceNexus account and asked to change its email to <b>${esc(opts.newEmail)}</b>. Nothing changes until that address confirms.</p><p>If this was you, no action is needed. If it was not, <a href="${APP_URL}/account?section=security">change your password now</a> and the pending change is void.</p>`);
  const text = `Email change requested on your account\n\nSomeone signed in to your SpaceNexus account and asked to change its email to ${opts.newEmail}. Nothing changes until that address confirms.\n\nIf this was not you, change your password now: ${APP_URL}/account?section=security`;
  return send(opts.to, 'Email change requested on your SpaceNexus account', html, text);
}

export async function sendEmailChangedConfirmation(opts: { oldEmail: string; newEmail: string; name: string | null }) {
  const html = shell('Your SpaceNexus email has changed', `<p>${hi(opts.name)}</p><p>The email on your account is now <b>${esc(opts.newEmail)}</b> (it was ${esc(opts.oldEmail)}). Sign in with the new address from now on.</p><p>If you did not do this, reply to this email straight away.</p>`);
  const text = `Your SpaceNexus email has changed\n\nThe email on your account is now ${opts.newEmail} (it was ${opts.oldEmail}). Sign in with the new address from now on.\n\nIf you did not do this, reply to this email straight away.`;
  const [a, b] = await Promise.all([send(opts.newEmail, 'Your SpaceNexus email has changed', html, text), send(opts.oldEmail, 'Your SpaceNexus email has changed', html, text)]);
  return a && b;
}
