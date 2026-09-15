/**
 * SpaceNexus Research — transactional email (seat invites, screen alerts).
 *
 * Same shape as account-email.ts: a single private send(), a no-key short
 * circuit that warns rather than throwing, and HTML that escapes everything it
 * interpolates. Screen alerts carry only data the recipient's own screen
 * matched, and are sent only when the result set actually changed.
 */

import { logger } from '@/lib/logger';
import { APP_URL } from '@/lib/constants';

async function send(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    logger.warn('Research email skipped (no RESEND_API_KEY)', { subject });
    return false;
  }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(key);
    const from = process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <noreply@spacenexus.us>';
    const { error } = await resend.emails.send({ from, to, subject, html, text });
    if (error) {
      logger.warn('Research email rejected', { subject, error: error.message });
      return false;
    }
    return true;
  } catch (error) {
    logger.warn('Research email failed', {
      subject,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

const esc = (s: string) =>
  s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string
  );

const shell = (title: string, body: string) =>
  `<div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a"><h2 style="margin:0 0 12px">${esc(
    title
  )}</h2>${body}<p style="margin-top:24px;font-size:12px;color:#64748b">SpaceNexus Research &middot; <a href="${APP_URL}/research">spacenexus.us/research</a></p></div>`;

const usd = (n: number | null | undefined) =>
  typeof n === 'number' && n > 0
    ? n >= 1_000_000_000
      ? `$${(n / 1_000_000_000).toFixed(2)}B`
      : `$${Math.round(n / 1_000_000)}M`
    : 'undisclosed';

/**
 * Seat invite. The link carries a single-use token; accepting it requires
 * signing in with an account whose verified email matches the invited address,
 * which is checked server-side at accept time.
 */
export async function sendResearchSeatInvite(opts: {
  to: string;
  token: string;
  inviterName: string | null;
  expiresAt: Date;
}): Promise<boolean> {
  const url = `${APP_URL}/research/accept-seat?token=${encodeURIComponent(opts.token)}`;
  const days = Math.max(1, Math.round((opts.expiresAt.getTime() - Date.now()) / 86_400_000));
  const who = opts.inviterName ? esc(opts.inviterName) : 'A colleague';
  const html = shell(
    'You have a SpaceNexus Research seat',
    `<p>${who} added you to their SpaceNexus Research subscription.</p>
     <p>A seat gives you the Research workspace: full-history data exports, portfolio supply-chain exposure, saved screens with change alerts, Space Score history and the quarterly sector report.</p>
     <p><a href="${url}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Accept your seat</a></p>
     <p style="font-size:12px;color:#64748b">This invite expires in ${days} day${days === 1 ? '' : 's'} and can be used once. Sign in with <b>${esc(
       opts.to
     )}</b> to accept it &mdash; it will not work on another account.</p>
     <p style="font-size:12px;color:#64748b">${esc(url)}</p>`
  );
  const text = `${opts.inviterName ?? 'A colleague'} added you to their SpaceNexus Research subscription.\n\nAccept your seat (expires in ${days} day${
    days === 1 ? '' : 's'
  }, single use, must be accepted while signed in as ${opts.to}):\n${url}\n`;
  return send(opts.to, 'Your SpaceNexus Research seat', html, text);
}

export async function sendResearchSeatRevoked(opts: {
  to: string;
  ownerName: string | null;
}): Promise<boolean> {
  const who = opts.ownerName ? esc(opts.ownerName) : 'The account owner';
  const html = shell(
    'Your SpaceNexus Research seat was removed',
    `<p>${who} removed your seat on their SpaceNexus Research subscription. Your own SpaceNexus account and everything on the free and Professional plans are unaffected.</p>`
  );
  const text = `${
    opts.ownerName ?? 'The account owner'
  } removed your seat on their SpaceNexus Research subscription. Your own SpaceNexus account is unaffected.\n`;
  return send(opts.to, 'Your SpaceNexus Research seat was removed', html, text);
}

export interface ScreenAlertRow {
  companyName: string;
  seriesLabel: string | null;
  amountUsd: number | null;
  date: string;
  leadInvestor: string | null;
}

/**
 * Weekly screen alert. Sent ONLY when new rows appeared — a screen that has
 * not changed sends nothing, which is the difference between an alert and a
 * newsletter.
 */
export async function sendResearchScreenAlert(opts: {
  to: string;
  screenName: string;
  criteriaSummary: string;
  newRows: ScreenAlertRow[];
  totalCount: number;
}): Promise<boolean> {
  const rows = opts.newRows
    .slice(0, 15)
    .map(
      (r) =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${esc(
          r.companyName
        )}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${esc(
          r.seriesLabel ?? '—'
        )}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${esc(
          usd(r.amountUsd)
        )}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${esc(
          r.date
        )}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${esc(
          r.leadInvestor ?? '—'
        )}</td></tr>`
    )
    .join('');

  const more =
    opts.newRows.length > 15
      ? `<p style="font-size:12px;color:#64748b">and ${opts.newRows.length - 15} more.</p>`
      : '';

  const html = shell(
    `${opts.screenName}: ${opts.newRows.length} new match${opts.newRows.length === 1 ? '' : 'es'}`,
    `<p style="color:#475569">${esc(opts.criteriaSummary)} &middot; ${
      opts.totalCount
    } total matches</p>
     <table style="border-collapse:collapse;width:100%;font-size:14px"><thead><tr>
       <th align="left" style="padding:6px 10px;border-bottom:2px solid #0f172a">Company</th>
       <th align="left" style="padding:6px 10px;border-bottom:2px solid #0f172a">Round</th>
       <th align="left" style="padding:6px 10px;border-bottom:2px solid #0f172a">Amount</th>
       <th align="left" style="padding:6px 10px;border-bottom:2px solid #0f172a">Date</th>
       <th align="left" style="padding:6px 10px;border-bottom:2px solid #0f172a">Lead</th>
     </tr></thead><tbody>${rows}</tbody></table>
     ${more}
     <p style="margin-top:16px"><a href="${APP_URL}/research/workspace" style="display:inline-block;background:#0ea5e9;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open the screen</a></p>
     <p style="font-size:12px;color:#64748b">You are getting this because you set this screen to weekly alerts. Change the cadence to "none" in the Research workspace to stop it.</p>`
  );

  const text = `${opts.screenName}: ${opts.newRows.length} new match${
    opts.newRows.length === 1 ? '' : 'es'
  }\n${opts.criteriaSummary} · ${opts.totalCount} total matches\n\n${opts.newRows
    .slice(0, 15)
    .map((r) => `- ${r.companyName} · ${r.seriesLabel ?? '—'} · ${usd(r.amountUsd)} · ${r.date}`)
    .join('\n')}\n\n${APP_URL}/research/workspace\n`;

  return send(
    opts.to,
    `${opts.screenName}: ${opts.newRows.length} new match${opts.newRows.length === 1 ? '' : 'es'}`,
    html,
    text
  );
}

/**
 * A recurring release did not land.
 *
 * Goes to the ALERT inbox, not the correspondence one: a missed release is a
 * broken thing, and the whole point of the publication ledger is that nobody
 * finds out from a reader. One email per run, listing every overdue franchise,
 * so a week where three of them break does not send three separate pages.
 */
export async function sendReleaseOverdueAlert(opts: {
  to: string;
  overdue: {
    title: string;
    periodLabel: string;
    dueAt: string;
    daysLate: number;
    href: string;
    reason?: string;
  }[];
}): Promise<boolean> {
  if (opts.overdue.length === 0) return false;

  const rows = opts.overdue
    .map(
      (o) =>
        `<tr>
           <td style="padding:8px 10px;border-bottom:1px solid #1e293b">${esc(o.title)}</td>
           <td style="padding:8px 10px;border-bottom:1px solid #1e293b">${esc(o.periodLabel)}</td>
           <td style="padding:8px 10px;border-bottom:1px solid #1e293b">${esc(o.dueAt)}</td>
           <td style="padding:8px 10px;border-bottom:1px solid #1e293b">${o.daysLate} day${o.daysLate === 1 ? '' : 's'}</td>
           <td style="padding:8px 10px;border-bottom:1px solid #1e293b">${esc(o.reason ?? 'Not computed')}</td>
         </tr>`
    )
    .join('');

  const html = shell(
    'A recurring release is overdue',
    `<p>${opts.overdue.length} recurring release${
      opts.overdue.length === 1 ? ' is' : 's are'
    } past due. Each one has a fixed calendar and a reader who expects it.</p>
     <table style="width:100%;border-collapse:collapse;font-size:14px">
       <thead><tr>
         <th align="left" style="padding:8px 10px;border-bottom:1px solid #334155">Release</th>
         <th align="left" style="padding:8px 10px;border-bottom:1px solid #334155">Edition</th>
         <th align="left" style="padding:8px 10px;border-bottom:1px solid #334155">Due</th>
         <th align="left" style="padding:8px 10px;border-bottom:1px solid #334155">Late by</th>
         <th align="left" style="padding:8px 10px;border-bottom:1px solid #334155">Why</th>
       </tr></thead>
       <tbody>${rows}</tbody>
     </table>
     <p style="margin-top:16px"><a href="${APP_URL}/releases" style="display:inline-block;background:#0ea5e9;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open the release calendar</a></p>
     <p style="font-size:12px;color:#64748b">Re-run the publication job at /api/cron/research-releases once the underlying data is in place.</p>`
  );

  const text = `${opts.overdue.length} recurring release(s) overdue\n\n${opts.overdue
    .map(
      (o) =>
        `- ${o.title} — ${o.periodLabel}, due ${o.dueAt}, ${o.daysLate} day(s) late. ${o.reason ?? 'Not computed'}\n  ${APP_URL}${o.href}`
    )
    .join('\n')}\n`;

  return send(
    opts.to,
    `[SpaceNexus] ${opts.overdue.length} recurring release${
      opts.overdue.length === 1 ? '' : 's'
    } overdue`,
    html,
    text
  );
}
