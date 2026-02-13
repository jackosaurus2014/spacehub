/**
 * Email and notification templates for the Smart Alert System.
 * Uses dark-themed, inline CSS consistent with existing SpaceNexus email templates.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// Single Alert Email
// ============================================================

export function generateAlertEmail(
  title: string,
  message: string,
  data: Record<string, unknown> | null,
  userName?: string
): { html: string; text: string } {
  const greeting = userName ? `Hi ${escapeHtml(userName)},` : 'Hi there,';
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);

  // Build optional context section from data
  let contextHtml = '';
  let contextText = '';
  if (data) {
    const priority = data.priority as string | undefined;
    const triggerType = data.triggerType as string | undefined;

    if (priority && priority !== 'normal') {
      const priorityColor =
        priority === 'critical' ? '#ef4444' : priority === 'high' ? '#f97316' : '#94a3b8';
      contextHtml += `<span style="display:inline-block;padding:3px 10px;background-color:${priorityColor};color:#ffffff;font-size:11px;font-weight:600;text-transform:uppercase;border-radius:4px;margin-bottom:12px;">${escapeHtml(priority)} Priority</span><br>`;
      contextText += `Priority: ${priority}\n`;
    }

    if (triggerType) {
      contextText += `Trigger: ${triggerType}\n`;
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#1e293b;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:24px 40px;text-align:center;border-bottom:1px solid #334155;">
          <h1 style="margin:0;color:#06b6d4;font-size:22px;">SpaceNexus Alerts</h1>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 16px;color:#94a3b8;font-size:14px;">${greeting}</p>
          ${contextHtml}
          <h2 style="margin:0 0 12px;color:#f1f5f9;font-size:18px;font-weight:600;">${safeTitle}</h2>
          <p style="margin:0 0 24px;color:#cbd5e1;font-size:15px;line-height:1.6;">${safeMessage}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
            <tr><td style="background-color:#06b6d4;border-radius:8px;padding:12px 28px;">
              <a href="${APP_URL}/alerts" style="color:#0f172a;text-decoration:none;font-weight:bold;font-size:14px;">View Alerts Dashboard</a>
            </td></tr>
          </table>
          <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;border-top:1px solid #334155;padding-top:16px;">
            You are receiving this because you set up an alert on SpaceNexus.
            <a href="${APP_URL}/alerts" style="color:#06b6d4;">Manage your alerts</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `${greeting}

${title}

${message}

${contextText}
View your alerts: ${APP_URL}/alerts

---
SpaceNexus - Your gateway to the space industry
Manage alerts: ${APP_URL}/alerts`;

  return { html, text };
}

// ============================================================
// Digest Email (Daily or Weekly)
// ============================================================

export function generateDigestEmail(
  alerts: Array<{ title: string; message: string; createdAt: Date }>,
  userName?: string,
  frequency: 'daily' | 'weekly' = 'daily'
): { html: string; text: string } {
  const greeting = userName ? `Hi ${escapeHtml(userName)},` : 'Hi there,';
  const periodLabel = frequency === 'weekly' ? 'This Week' : 'Today';
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Build alert rows
  let alertRowsHtml = '';
  let alertRowsText = '';

  for (const alert of alerts) {
    const time = alert.createdAt.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    alertRowsHtml += `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #334155;">
          <p style="margin:0 0 4px;color:#f1f5f9;font-size:14px;font-weight:500;">${escapeHtml(alert.title)}</p>
          <p style="margin:0 0 4px;color:#94a3b8;font-size:13px;line-height:1.5;">${escapeHtml(alert.message)}</p>
          <p style="margin:0;color:#64748b;font-size:11px;">${time}</p>
        </td>
      </tr>`;

    alertRowsText += `- ${alert.title}\n  ${alert.message}\n  ${time}\n\n`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SpaceNexus Alert Digest</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#1e293b;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:24px 40px;text-align:center;border-bottom:1px solid #334155;">
          <h1 style="margin:0;color:#06b6d4;font-size:22px;">SpaceNexus Alert Digest</h1>
          <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">${dateStr}</p>
        </td></tr>
        <!-- Summary -->
        <tr><td style="padding:24px 40px;">
          <p style="margin:0 0 8px;color:#94a3b8;font-size:14px;">${greeting}</p>
          <p style="margin:0 0 20px;color:#cbd5e1;font-size:15px;line-height:1.6;">
            You have <strong style="color:#06b6d4;">${alerts.length}</strong> alert${alerts.length === 1 ? '' : 's'} from ${periodLabel.toLowerCase()}.
          </p>
          <!-- Alert list -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${alertRowsHtml}
          </table>
        </td></tr>
        <!-- CTA -->
        <tr><td style="padding:0 40px 32px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="background-color:#06b6d4;border-radius:8px;padding:12px 28px;">
              <a href="${APP_URL}/alerts" style="color:#0f172a;text-decoration:none;font-weight:bold;font-size:14px;">View All Alerts</a>
            </td></tr>
          </table>
          <p style="margin:16px 0 0;color:#64748b;font-size:12px;">
            <a href="${APP_URL}/alerts" style="color:#06b6d4;">Manage your alert preferences</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `SpaceNexus Alert Digest - ${dateStr}

${greeting}

You have ${alerts.length} alert${alerts.length === 1 ? '' : 's'} from ${periodLabel.toLowerCase()}:

${alertRowsText}

View all alerts: ${APP_URL}/alerts
Manage preferences: ${APP_URL}/alerts

---
SpaceNexus - Your gateway to the space industry`;

  return { html, text };
}

// ============================================================
// Watchlist Digest Email
// ============================================================

export function generateWatchlistDigestEmail(
  alerts: Array<{ title: string; message: string; data: Record<string, unknown> | null; createdAt: Date }>,
  userName?: string
): { html: string; text: string } {
  const greeting = userName ? `Hi ${escapeHtml(userName)},` : 'Hi there,';
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Group alerts by company
  const byCompany = new Map<string, typeof alerts>();
  for (const alert of alerts) {
    const companyName = (alert.data?.companyName as string) || 'Unknown Company';
    const existing = byCompany.get(companyName) || [];
    existing.push(alert);
    byCompany.set(companyName, existing);
  }

  // Build company sections
  let companySectionsHtml = '';
  let companySectionsText = '';

  for (const [company, companyAlerts] of Array.from(byCompany.entries())) {
    const companySlug = (companyAlerts[0]?.data?.companySlug as string) || '';

    companySectionsHtml += `
      <tr><td style="padding:16px 0;border-bottom:1px solid #334155;">
        <h3 style="margin:0 0 8px;color:#06b6d4;font-size:15px;font-weight:600;">
          <a href="${APP_URL}/company-profiles/${escapeHtml(companySlug)}" style="color:#06b6d4;text-decoration:none;">${escapeHtml(company)}</a>
        </h3>`;

    companySectionsText += `\n${company}\n${'─'.repeat(company.length)}\n`;

    for (const alert of companyAlerts) {
      companySectionsHtml += `
        <p style="margin:4px 0;color:#f1f5f9;font-size:13px;">• ${escapeHtml(alert.title)}</p>
        <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;line-height:1.5;">${escapeHtml(alert.message)}</p>`;

      companySectionsText += `  • ${alert.title}\n    ${alert.message}\n`;
    }

    companySectionsHtml += `</td></tr>`;
    companySectionsText += '\n';
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SpaceNexus Watchlist Update</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#1e293b;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:24px 40px;text-align:center;border-bottom:1px solid #334155;">
          <h1 style="margin:0;color:#06b6d4;font-size:22px;">Watchlist Update</h1>
          <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">${dateStr}</p>
        </td></tr>
        <tr><td style="padding:24px 40px;">
          <p style="margin:0 0 8px;color:#94a3b8;font-size:14px;">${greeting}</p>
          <p style="margin:0 0 20px;color:#cbd5e1;font-size:15px;line-height:1.6;">
            You have <strong style="color:#06b6d4;">${alerts.length}</strong> update${alerts.length === 1 ? '' : 's'} from your watched companies.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${companySectionsHtml}
          </table>
        </td></tr>
        <tr><td style="padding:0 40px 32px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="background-color:#06b6d4;border-radius:8px;padding:12px 28px;">
              <a href="${APP_URL}/my-watchlists" style="color:#0f172a;text-decoration:none;font-weight:bold;font-size:14px;">View My Watchlists</a>
            </td></tr>
          </table>
          <p style="margin:16px 0 0;color:#64748b;font-size:12px;">
            <a href="${APP_URL}/my-watchlists" style="color:#06b6d4;">Manage your watchlist preferences</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `SpaceNexus Watchlist Update - ${dateStr}

${greeting}

You have ${alerts.length} update${alerts.length === 1 ? '' : 's'} from your watched companies:
${companySectionsText}

View your watchlists: ${APP_URL}/my-watchlists
Manage preferences: ${APP_URL}/my-watchlists

---
SpaceNexus - Your gateway to the space industry`;

  return { html, text };
}
