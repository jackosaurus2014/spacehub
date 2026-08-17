/**
 * Email template for per-user regulatory alerts (Regulatory Wave C).
 * Dark-themed inline CSS consistent with src/lib/alerts/alert-templates.ts.
 * Pure — safe to unit test without a DOM or network.
 */

import { APP_URL } from '@/lib/constants';
import { escapeHtml } from '@/lib/errors';
import type { RegulatoryAlertItem } from '@/lib/regulatory-alerts';

export interface RegulatoryAlertEmailOptions {
  userName?: string | null;
  /** Number of qualifying actions beyond the per-email cap (0 = no overflow). */
  overflowCount: number;
  /** RegulatoryAlertPreference.unsubscribeToken for the one-click link. */
  unsubscribeToken: string;
}

export function regulatoryAlertUnsubscribeUrl(token: string): string {
  return `${APP_URL}/api/regulatory-alerts/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function generateRegulatoryAlertEmail(
  items: RegulatoryAlertItem[],
  options: RegulatoryAlertEmailOptions
): { html: string; text: string } {
  const greeting = options.userName ? `Hi ${escapeHtml(options.userName)},` : 'Hi there,';
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const unsubscribeUrl = regulatoryAlertUnsubscribeUrl(options.unsubscribeToken);

  let itemsHtml = '';
  let itemsText = '';

  for (const item of items) {
    const detailUrl = `${APP_URL}/regulatory-radar/action/${item.id}`;
    const agencyLine = item.agency ? ` &middot; ${escapeHtml(item.agency)}` : '';

    itemsHtml += `
      <tr><td style="padding:16px 0;border-bottom:1px solid #334155;">
        <p style="margin:0 0 6px;">
          <span style="display:inline-block;padding:2px 8px;background-color:#164e63;color:#67e8f9;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-radius:4px;">${escapeHtml(item.categoryLabel)}</span>
          <span style="color:#64748b;font-size:11px;">${agencyLine}</span>
        </p>
        <p style="margin:0 0 6px;color:#f1f5f9;font-size:14px;font-weight:600;line-height:1.4;">
          <a href="${detailUrl}" style="color:#f1f5f9;text-decoration:none;">${escapeHtml(item.title)}</a>
        </p>
        <p style="margin:0 0 4px;color:#67e8f9;font-size:12px;font-weight:500;">${escapeHtml(item.whatHappened)} &middot; ${escapeHtml(item.dateLine)}</p>
        <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;line-height:1.5;">${escapeHtml(item.whyItMatters)}</p>
        <p style="margin:0;font-size:12px;">
          <a href="${detailUrl}" style="color:#06b6d4;text-decoration:none;">View on the Radar</a>
          <span style="color:#475569;"> &middot; </span>
          <a href="${escapeHtml(item.url)}" style="color:#06b6d4;text-decoration:none;">Official source</a>
        </p>
      </td></tr>`;

    itemsText += `- [${item.categoryLabel}] ${item.title}\n`;
    itemsText += `  ${item.whatHappened} — ${item.dateLine}\n`;
    itemsText += `  ${item.whyItMatters}\n`;
    itemsText += `  Radar: ${detailUrl}\n`;
    itemsText += `  Source: ${item.url}\n\n`;
  }

  const overflowHtml =
    options.overflowCount > 0
      ? `<p style="margin:16px 0 0;color:#94a3b8;font-size:13px;">
           + ${options.overflowCount} more qualifying action${options.overflowCount === 1 ? '' : 's'} — see the full
           <a href="${APP_URL}/regulatory-radar" style="color:#06b6d4;">Regulatory Radar</a>.
         </p>`
      : '';
  const overflowText =
    options.overflowCount > 0
      ? `\n+ ${options.overflowCount} more qualifying action${options.overflowCount === 1 ? '' : 's'} on the Radar: ${APP_URL}/regulatory-radar\n`
      : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SpaceNexus Regulatory Alert</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#1e293b;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:24px 40px;text-align:center;border-bottom:1px solid #334155;">
          <h1 style="margin:0;color:#06b6d4;font-size:22px;">Regulatory Alert</h1>
          <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">${dateStr}</p>
        </td></tr>
        <tr><td style="padding:24px 40px;">
          <p style="margin:0 0 8px;color:#94a3b8;font-size:14px;">${greeting}</p>
          <p style="margin:0 0 16px;color:#cbd5e1;font-size:15px;line-height:1.6;">
            <strong style="color:#06b6d4;">${items.length}</strong> significant regulatory action${items.length === 1 ? '' : 's'} in the categories you watch:
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${itemsHtml}
          </table>
          ${overflowHtml}
        </td></tr>
        <tr><td style="padding:0 40px 32px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="background-color:#06b6d4;border-radius:8px;padding:12px 28px;">
              <a href="${APP_URL}/regulatory-radar" style="color:#0f172a;text-decoration:none;font-weight:bold;font-size:14px;">Open the Regulatory Radar</a>
            </td></tr>
          </table>
          <p style="margin:20px 0 0;color:#64748b;font-size:11px;line-height:1.6;border-top:1px solid #334155;padding-top:16px;text-align:left;">
            Regulatory information for awareness and research purposes only — not legal advice.
            Sources: congress.gov, federalregister.gov, and agency public records.<br>
            You are receiving this because you enabled regulatory alerts on SpaceNexus.
            <a href="${APP_URL}/account?tab=notifications" style="color:#06b6d4;">Manage preferences</a>
            &middot;
            <a href="${unsubscribeUrl}" style="color:#06b6d4;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `SpaceNexus Regulatory Alert - ${dateStr}

${greeting}

${items.length} significant regulatory action${items.length === 1 ? '' : 's'} in the categories you watch:

${itemsText}${overflowText}
Open the Regulatory Radar: ${APP_URL}/regulatory-radar

---
Regulatory information for awareness and research purposes only — not legal advice.
Sources: congress.gov, federalregister.gov, and agency public records.
Manage preferences: ${APP_URL}/account?tab=notifications
Unsubscribe: ${unsubscribeUrl}`;

  return { html, text };
}
