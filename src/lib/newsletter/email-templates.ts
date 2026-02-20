// Email templates for newsletter system
// Dark-themed, inline CSS, table-based for Outlook compatibility, 600px max width

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface FeatureArticle {
  title: string;
  content: string;
}

interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
}

interface CategorizedNews {
  [category: string]: NewsItem[];
}

interface VerificationEmailResult {
  html: string;
  plain: string;
  subject: string;
}

interface DigestEmailResult {
  html: string;
  plain: string;
  subject: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us';

// Common styles
const styles = {
  bgDark: '#0a0a1a',
  bgCard: '#12122a',
  bgCardHover: '#1a1a3a',
  textWhite: '#ffffff',
  textLight: '#a0a0c0',
  textMuted: '#707090',
  accentNebula: '#7c3aed',
  accentNebulaLight: '#a78bfa',
  borderColor: '#2a2a4a',
};

function getBaseEmailStyles(): string {
  return `
    body, table, td, div, p, span, a { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    body { margin: 0; padding: 0; background-color: ${styles.bgDark}; color: ${styles.textWhite}; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse; }
    a { color: ${styles.accentNebulaLight}; text-decoration: none; }
    a:hover { text-decoration: underline; }
  `;
}

function wrapInEmailTemplate(content: string, preheader: string = ''): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>SpaceNexus</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">${getBaseEmailStyles()}</style>
</head>
<body style="margin: 0; padding: 0; background-color: ${styles.bgDark};">
  ${preheader ? `<div style="display:none;font-size:1px;color:${styles.bgDark};line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${styles.bgDark};">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getHeader(title?: string): string {
  return `
    <tr>
      <td align="center" style="padding: 30px 20px; background: linear-gradient(135deg, ${styles.bgCard} 0%, ${styles.bgDark} 100%); border-radius: 12px 12px 0 0;">
        <img src="${APP_URL}/spacenexus-logo.png" alt="SpaceNexus logo" width="180" style="display: block; margin-bottom: 10px;">
        ${title ? `<h1 style="margin: 10px 0 0 0; font-size: 24px; font-weight: 600; color: ${styles.textWhite};">${title}</h1>` : ''}
      </td>
    </tr>`;
}

function getFooter(unsubscribeUrl: string): string {
  return `
    <tr>
      <td style="padding: 30px 20px; background-color: ${styles.bgCard}; border-radius: 0 0 12px 12px; border-top: 1px solid ${styles.borderColor};">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td align="center">
              <img src="${APP_URL}/spacenexus-logo.png" alt="SpaceNexus logo" width="120" style="display: block; opacity: 0.7; margin-bottom: 15px;">
              <p style="margin: 0 0 10px 0; font-size: 13px; color: ${styles.textMuted};">
                Your gateway to the space industry
              </p>
              <p style="margin: 0; font-size: 12px; color: ${styles.textMuted};">
                <a href="${unsubscribeUrl}" style="color: ${styles.textMuted}; text-decoration: underline;">Unsubscribe</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="${APP_URL}" style="color: ${styles.textMuted}; text-decoration: underline;">Visit SpaceNexus</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function renderVerificationEmail(verificationUrl: string, name?: string): VerificationEmailResult {
  const greeting = name ? `Hi ${name},` : 'Hi there,';

  const html = wrapInEmailTemplate(`
    ${getHeader('Email Verification')}
    <tr>
      <td style="padding: 40px 30px; background-color: ${styles.bgCard};">
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${styles.textLight};">
          ${greeting}
        </p>
        <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: ${styles.textLight};">
          Thank you for subscribing to the SpaceNexus newsletter! Please verify your email address to start receiving our daily digest of space industry news and insights.
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, ${styles.accentNebula} 0%, #5b21b6 100%);">
              <a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; font-weight: 600; color: ${styles.textWhite}; text-decoration: none;">
                Verify Email Address
              </a>
            </td>
          </tr>
        </table>
        <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: ${styles.textMuted};">
          If you didn't sign up for SpaceNexus, you can safely ignore this email.
        </p>
        <p style="margin: 20px 0 0 0; font-size: 12px; line-height: 1.6; color: ${styles.textMuted};">
          Button not working? Copy and paste this link:<br>
          <a href="${verificationUrl}" style="color: ${styles.accentNebulaLight}; word-break: break-all;">${verificationUrl}</a>
        </p>
      </td>
    </tr>
    ${getFooter(`${APP_URL}/api/newsletter/unsubscribe?token={{UNSUBSCRIBE_TOKEN}}`)}
  `, 'Please verify your email to receive the SpaceNexus newsletter');

  const plain = `${greeting}

Thank you for subscribing to the SpaceNexus newsletter!

Please verify your email address to start receiving our daily digest of space industry news and insights.

Click here to verify: ${verificationUrl}

If you didn't sign up for SpaceNexus, you can safely ignore this email.

---
SpaceNexus - Your gateway to the space industry
${APP_URL}`;

  return {
    html,
    plain,
    subject: 'Verify your SpaceNexus newsletter subscription',
  };
}

export function renderDigestEmail(
  date: Date,
  featureArticles: FeatureArticle[],
  categorizedNews: CategorizedNews,
  unsubscribeUrl: string = '{{UNSUBSCRIBE_URL}}'
): DigestEmailResult {
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const totalArticles = Object.values(categorizedNews).flat().length;
  const categoryNames = Object.keys(categorizedNews);

  // Build feature article sections
  let featureArticlesHtml = '';
  let featureArticlesPlain = '';

  featureArticles.forEach((article, index) => {
    featureArticlesHtml += `
      <tr>
        <td style="padding: 25px 30px; background-color: ${index === 0 ? styles.bgCardHover : styles.bgCard}; ${index === 0 ? 'border-radius: 8px; margin: 20px 0;' : ''}">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td>
                <span style="display: inline-block; padding: 4px 12px; background-color: ${styles.accentNebula}; color: ${styles.textWhite}; font-size: 11px; font-weight: 600; text-transform: uppercase; border-radius: 4px; margin-bottom: 12px;">
                  Featured Analysis
                </span>
                <h2 style="margin: 12px 0; font-size: 20px; font-weight: 600; color: ${styles.textWhite}; line-height: 1.3;">
                  ${escapeHtml(article.title)}
                </h2>
                <p style="margin: 0; font-size: 15px; line-height: 1.7; color: ${styles.textLight};">
                  ${escapeHtml(article.content)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;

    featureArticlesPlain += `
=== FEATURED ANALYSIS ===
${article.title}

${article.content}

`;
  });

  // Build news sections by category
  let newsHtml = '';
  let newsPlain = '';

  for (const [category, articles] of Object.entries(categorizedNews)) {
    if (articles.length === 0) continue;

    const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');

    newsHtml += `
      <tr>
        <td style="padding: 25px 30px 10px 30px; background-color: ${styles.bgCard};">
          <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: ${styles.accentNebulaLight}; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid ${styles.borderColor}; padding-bottom: 10px;">
            ${categoryTitle}
          </h3>
        </td>
      </tr>`;

    newsPlain += `
--- ${categoryTitle.toUpperCase()} ---
`;

    articles.forEach((article) => {
      newsHtml += `
        <tr>
          <td style="padding: 10px 30px; background-color: ${styles.bgCard};">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid ${styles.borderColor};">
                  <a href="${escapeHtml(article.url)}" style="font-size: 15px; font-weight: 500; color: ${styles.textWhite}; text-decoration: none; line-height: 1.4;">
                    ${escapeHtml(article.title)}
                  </a>
                  <p style="margin: 8px 0 0 0; font-size: 13px; color: ${styles.textMuted};">
                    ${escapeHtml(article.source)}
                  </p>
                  ${article.summary ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: ${styles.textLight}; line-height: 1.5;">${escapeHtml(article.summary)}</p>` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>`;

      newsPlain += `
* ${article.title}
  Source: ${article.source}
  ${article.summary ? `Summary: ${article.summary}` : ''}
  Read more: ${article.url}
`;
    });
  }

  const html = wrapInEmailTemplate(`
    ${getHeader()}
    <tr>
      <td style="padding: 25px 30px; background-color: ${styles.bgCard}; text-align: center;">
        <p style="margin: 0 0 5px 0; font-size: 14px; color: ${styles.textMuted}; text-transform: uppercase; letter-spacing: 1px;">
          Daily Space Digest
        </p>
        <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: ${styles.textWhite};">
          ${formattedDate}
        </h1>
        <p style="margin: 15px 0 0 0; font-size: 14px; color: ${styles.textLight};">
          ${totalArticles} articles across ${categoryNames.length} categories
        </p>
      </td>
    </tr>
    ${featureArticles.length > 0 ? featureArticlesHtml.split('</tr>')[0] + '</tr>' : ''}
    ${newsHtml}
    ${featureArticles.length > 1 ? featureArticlesHtml.split('</tr>').slice(1).join('</tr>') : ''}
    <tr>
      <td style="padding: 30px; background-color: ${styles.bgCard}; text-align: center;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
          <tr>
            <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, ${styles.accentNebula} 0%, #5b21b6 100%);">
              <a href="${APP_URL}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: ${styles.textWhite}; text-decoration: none;">
                Visit SpaceNexus Dashboard
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${getFooter(unsubscribeUrl)}
  `, `Your daily space industry digest for ${formattedDate} - ${totalArticles} articles`);

  const plain = `SPACENEXUS DAILY DIGEST
${formattedDate}
${totalArticles} articles across ${categoryNames.length} categories

${featureArticlesPlain}
${newsPlain}

---
Visit SpaceNexus: ${APP_URL}
Unsubscribe: ${unsubscribeUrl}`;

  return {
    html,
    plain,
    subject: `SpaceNexus Daily Digest - ${formattedDate}`,
  };
}

// Helper to replace unsubscribe placeholder with actual token
export function personalizeEmail(html: string, unsubscribeToken: string): string {
  const unsubscribeUrl = `${APP_URL}/api/newsletter/unsubscribe?token=${unsubscribeToken}`;
  return html
    .replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubscribeUrl)
    .replace(/\{\{UNSUBSCRIBE_TOKEN\}\}/g, unsubscribeToken);
}

export function generatePasswordResetEmail(resetUrl: string): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#1e293b;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:32px 40px;text-align:center;border-bottom:1px solid #334155;">
          <h1 style="margin:0;color:#06b6d4;font-size:24px;">SpaceNexus</h1>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#f1f5f9;font-size:20px;">Password Reset Request</h2>
          <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
            We received a request to reset your password. Click the button below to create a new password. This link expires in 1 hour.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
            <tr><td style="background-color:#06b6d4;border-radius:8px;padding:14px 32px;">
              <a href="${escapeHtml(resetUrl)}" style="color:#0f172a;text-decoration:none;font-weight:bold;font-size:15px;">Reset Password</a>
            </td></tr>
          </table>
          <p style="margin:0 0 16px;color:#64748b;font-size:13px;line-height:1.5;">
            If you didn't request this, you can safely ignore this email. Your password will not be changed.
          </p>
          <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;border-top:1px solid #334155;padding-top:16px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${escapeHtml(resetUrl)}" style="color:#06b6d4;word-break:break-all;">${escapeHtml(resetUrl)}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Password Reset Request\n\nWe received a request to reset your SpaceNexus password.\n\nReset your password: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.`;

  return { html, text };
}

// ============================================================================
// Nurture Email Sequence (7 emails over 21 days)
// ============================================================================

interface NurtureEmailResult {
  subject: string;
  subjectB: string;
  previewText: string;
  html: string;
  text: string;
}

function getNurtureFooter(): string {
  return `
    <tr>
      <td style="padding:30px 40px;border-top:1px solid #334155;text-align:center;">
        <p style="margin:0 0 10px;color:#64748b;font-size:12px;">
          SpaceNexus - Your gateway to the space industry
        </p>
        <p style="margin:0;color:#64748b;font-size:11px;">
          <a href="${APP_URL}/settings/notifications" style="color:#64748b;text-decoration:underline;">Email preferences</a>
          &nbsp;&nbsp;|&nbsp;&nbsp;
          <a href="${APP_URL}" style="color:#64748b;text-decoration:underline;">Visit SpaceNexus</a>
        </p>
      </td>
    </tr>`;
}

function getNurtureHeader(): string {
  return `
    <tr><td style="padding:32px 40px;text-align:center;border-bottom:1px solid #334155;">
      <h1 style="margin:0;color:#06b6d4;font-size:24px;">SpaceNexus</h1>
    </td></tr>`;
}

function getNurtureCta(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
      <tr><td style="background-color:#06b6d4;border-radius:8px;padding:14px 32px;">
        <a href="${escapeHtml(url)}" style="color:#0f172a;text-decoration:none;font-weight:bold;font-size:15px;">${escapeHtml(label)}</a>
      </td></tr>
    </table>`;
}

function wrapNurtureEmail(content: string, preheader: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;font-size:1px;color:#0f172a;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#1e293b;border-radius:12px;overflow:hidden;">
        ${content}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// A/B subject lines:
//   A: "Welcome to SpaceNexus, {name}! 3 things to try right now"
//   B: "{name}, your space intelligence dashboard is ready"
export function generateNurtureWelcomeEmail(userName: string): NurtureEmailResult {
  const name = escapeHtml(userName || 'Explorer');
  const previewText = 'Your space industry dashboard is ready. Here are 3 things to try first.';

  const html = wrapNurtureEmail(`
    ${getNurtureHeader()}
    <tr><td style="padding:40px;">
      <h2 style="margin:0 0 16px;color:#f1f5f9;font-size:20px;">Welcome aboard, ${name}!</h2>
      <p style="margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.6;">
        You now have access to the most comprehensive space industry intelligence platform. Here are 3 things to try right now:
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:10px 0;">
          <p style="margin:0;color:#f1f5f9;font-size:14px;line-height:1.5;">
            <strong style="color:#06b6d4;">1.</strong> Browse the <strong>live news feed</strong> with 50+ curated space industry sources
          </p>
        </td></tr>
        <tr><td style="padding:10px 0;">
          <p style="margin:0;color:#f1f5f9;font-size:14px;line-height:1.5;">
            <strong style="color:#06b6d4;">2.</strong> Check <strong>Mission Control</strong> for upcoming launch countdowns
          </p>
        </td></tr>
        <tr><td style="padding:10px 0;">
          <p style="margin:0;color:#f1f5f9;font-size:14px;line-height:1.5;">
            <strong style="color:#06b6d4;">3.</strong> Explore <strong>market data</strong> from leading space companies
          </p>
        </td></tr>
      </table>
      ${getNurtureCta('Explore Your Dashboard', `${APP_URL}/mission-control`)}
    </td></tr>
    ${getNurtureFooter()}
  `, previewText);

  const text = `Welcome aboard, ${userName || 'Explorer'}!

You now have access to the most comprehensive space industry intelligence platform. Here are 3 things to try right now:

1. Browse the live news feed with 50+ curated space industry sources
2. Check Mission Control for upcoming launch countdowns
3. Explore market data from leading space companies

Explore Your Dashboard: ${APP_URL}/mission-control

---
SpaceNexus - Your gateway to the space industry
${APP_URL}`;

  return {
    subject: `Welcome to SpaceNexus, ${userName || 'Explorer'}! 3 things to try right now`,
    subjectB: `${userName || 'Explorer'}, your space intelligence dashboard is ready`,
    previewText,
    html,
    text,
  };
}

// A/B subject lines:
//   A: "Did you know? Real-time alerts most free users miss"
//   B: "{name}, unlock real-time space industry alerts"
export function generateNurtureDidYouKnowEmail(userName: string): NurtureEmailResult {
  const name = escapeHtml(userName || 'Explorer');
  const previewText = 'Pro users get real-time alerts on launches, contracts, and orbital events.';

  const html = wrapNurtureEmail(`
    ${getNurtureHeader()}
    <tr><td style="padding:40px;">
      <h2 style="margin:0 0 16px;color:#f1f5f9;font-size:20px;">Did you know, ${name}?</h2>
      <p style="margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.6;">
        SpaceNexus Pro members get <strong style="color:#06b6d4;">real-time alerts</strong> delivered the moment something happens -- launch scrubs, new government contracts, orbital conjunction warnings, and more.
      </p>
      <p style="margin:0 0 8px;color:#f1f5f9;font-size:14px;font-weight:bold;">What Pro users get that free users don't:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:14px;">&#x2713; Unlimited article access (vs. 10/day)</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:14px;">&#x2713; Custom alert rules for any module</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:14px;">&#x2713; Ad-free experience across all modules</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:14px;">&#x2713; Export data to CSV and PDF</td></tr>
      </table>
      ${getNurtureCta('See Premium Features', `${APP_URL}/pricing`)}
    </td></tr>
    ${getNurtureFooter()}
  `, previewText);

  const text = `Did you know, ${userName || 'Explorer'}?

SpaceNexus Pro members get real-time alerts delivered the moment something happens -- launch scrubs, new government contracts, orbital conjunction warnings, and more.

What Pro users get that free users don't:
- Unlimited article access (vs. 10/day)
- Custom alert rules for any module
- Ad-free experience across all modules
- Export data to CSV and PDF

See Premium Features: ${APP_URL}/pricing

---
SpaceNexus - Your gateway to the space industry
${APP_URL}`;

  return {
    subject: 'Did you know? Real-time alerts most free users miss',
    subjectB: `${userName || 'Explorer'}, unlock real-time space industry alerts`,
    previewText,
    html,
    text,
  };
}

// A/B subject lines:
//   A: "Join 500+ space professionals using SpaceNexus"
//   B: "How data-driven teams are winning in the space economy"
export function generateNurtureSocialProofEmail(userName: string): NurtureEmailResult {
  const name = escapeHtml(userName || 'Explorer');
  const previewText = '500+ space professionals rely on SpaceNexus for critical decision-making.';

  const html = wrapNurtureEmail(`
    ${getNurtureHeader()}
    <tr><td style="padding:40px;">
      <h2 style="margin:0 0 16px;color:#f1f5f9;font-size:20px;">You're in good company, ${name}</h2>
      <p style="margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.6;">
        Over <strong style="color:#06b6d4;">500 space professionals</strong> -- from satellite operators to launch service providers -- use SpaceNexus to make faster, data-driven decisions.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
        <tr>
          <td style="padding:16px;background-color:#0f172a;border-radius:8px;border-left:3px solid #06b6d4;">
            <p style="margin:0 0 8px;color:#f1f5f9;font-size:14px;line-height:1.5;">
              <em>"SpaceNexus replaced 4 separate tools for our launch ops team. The consolidated view saves us hours every week."</em>
            </p>
            <p style="margin:0;color:#64748b;font-size:12px;">-- Launch Operations Manager</p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;color:#94a3b8;font-size:14px;line-height:1.6;">
        Teams using integrated space data platforms report <strong style="color:#06b6d4;">37% faster</strong> decision-making on critical operations.
      </p>
      ${getNurtureCta('See What Others Are Tracking', `${APP_URL}/mission-control`)}
    </td></tr>
    ${getNurtureFooter()}
  `, previewText);

  const text = `You're in good company, ${userName || 'Explorer'}

Over 500 space professionals -- from satellite operators to launch service providers -- use SpaceNexus to make faster, data-driven decisions.

"SpaceNexus replaced 4 separate tools for our launch ops team. The consolidated view saves us hours every week."
-- Launch Operations Manager

Teams using integrated space data platforms report 37% faster decision-making on critical operations.

See What Others Are Tracking: ${APP_URL}/mission-control

---
SpaceNexus - Your gateway to the space industry
${APP_URL}`;

  return {
    subject: 'Join 500+ space professionals using SpaceNexus',
    subjectB: 'How data-driven teams are winning in the space economy',
    previewText,
    html,
    text,
  };
}

// A/B subject lines:
//   A: "AI Insights: Your space industry research assistant"
//   B: "{name}, save hours with AI-powered space analysis"
export function generateNurtureAISpotlightEmail(userName: string): NurtureEmailResult {
  const name = escapeHtml(userName || 'Explorer');
  const previewText = 'AI Insights analyzes trends, contracts, and market data so you don\'t have to.';

  const html = wrapNurtureEmail(`
    ${getNurtureHeader()}
    <tr><td style="padding:40px;">
      <h2 style="margin:0 0 16px;color:#f1f5f9;font-size:20px;">Meet your AI research assistant</h2>
      <p style="margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.6;">
        ${name}, our <strong style="color:#06b6d4;">AI Insights</strong> engine analyzes thousands of data points across the space industry -- so you can focus on decisions, not data gathering.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
        <tr><td style="padding:16px;background-color:#0f172a;border-radius:8px;">
          <p style="margin:0 0 8px;color:#06b6d4;font-size:12px;font-weight:bold;text-transform:uppercase;">Example AI Analysis</p>
          <p style="margin:0;color:#f1f5f9;font-size:14px;line-height:1.5;">
            "LEO launch costs dropped 12% this quarter, driven by SpaceX's increased cadence. Three new entrants are expected to reach orbit by Q3, which could push prices down another 8-15%."
          </p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;color:#94a3b8;font-size:14px;line-height:1.6;">
        Enterprise users save an average of <strong style="color:#06b6d4;">10+ hours per week</strong> on market research with AI Insights.
      </p>
      ${getNurtureCta('Try AI Insights', `${APP_URL}/ai-insights`)}
    </td></tr>
    ${getNurtureFooter()}
  `, previewText);

  const text = `Meet your AI research assistant

${userName || 'Explorer'}, our AI Insights engine analyzes thousands of data points across the space industry -- so you can focus on decisions, not data gathering.

Example AI Analysis:
"LEO launch costs dropped 12% this quarter, driven by SpaceX's increased cadence. Three new entrants are expected to reach orbit by Q3, which could push prices down another 8-15%."

Enterprise users save an average of 10+ hours per week on market research with AI Insights.

Try AI Insights: ${APP_URL}/ai-insights

---
SpaceNexus - Your gateway to the space industry
${APP_URL}`;

  return {
    subject: 'AI Insights: Your space industry research assistant',
    subjectB: `${userName || 'Explorer'}, save hours with AI-powered space analysis`,
    previewText,
    html,
    text,
  };
}

// A/B subject lines:
//   A: "How one team saved 40+ hours/month with SpaceNexus"
//   B: "$360/year vs $50K+ in value -- the SpaceNexus ROI"
export function generateNurtureCaseStudyEmail(userName: string): NurtureEmailResult {
  const name = escapeHtml(userName || 'Explorer');
  const previewText = 'A satellite operator cut 40+ hours of manual tracking per month with SpaceNexus Pro.';

  const html = wrapNurtureEmail(`
    ${getNurtureHeader()}
    <tr><td style="padding:40px;">
      <h2 style="margin:0 0 16px;color:#f1f5f9;font-size:20px;">40+ hours saved every month</h2>
      <p style="margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.6;">
        ${name}, here's how a satellite operator transformed their workflow with SpaceNexus Pro:
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
        <tr><td style="padding:16px;background-color:#0f172a;border-radius:8px;">
          <p style="margin:0 0 12px;color:#f1f5f9;font-size:14px;line-height:1.5;">
            <strong>Before:</strong> Manually checking 6 different sources for orbital data, conjunction alerts, and regulatory updates. <strong style="color:#ef4444;">40+ hours/month</strong> of tedious work.
          </p>
          <p style="margin:0;color:#f1f5f9;font-size:14px;line-height:1.5;">
            <strong>After:</strong> One unified SpaceNexus dashboard with real-time alerts. <strong style="color:#22c55e;">Under 5 hours/month</strong> to stay fully informed.
          </p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;color:#94a3b8;font-size:14px;line-height:1.6;">
        At <strong style="color:#06b6d4;">$19.99/month</strong> ($199/year), SpaceNexus Pro delivers over <strong style="color:#06b6d4;">$50,000</strong> in annual productivity value.
      </p>
      ${getNurtureCta('Read Full Case Study', `${APP_URL}/pricing`)}
    </td></tr>
    ${getNurtureFooter()}
  `, previewText);

  const text = `40+ hours saved every month

${userName || 'Explorer'}, here's how a satellite operator transformed their workflow with SpaceNexus Pro:

Before: Manually checking 6 different sources for orbital data, conjunction alerts, and regulatory updates. 40+ hours/month of tedious work.

After: One unified SpaceNexus dashboard with real-time alerts. Under 5 hours/month to stay fully informed.

At $19.99/month ($199/year), SpaceNexus Pro delivers over $50,000 in annual productivity value.

Read Full Case Study: ${APP_URL}/pricing

---
SpaceNexus - Your gateway to the space industry
${APP_URL}`;

  return {
    subject: 'How one team saved 40+ hours/month with SpaceNexus',
    subjectB: '$199/year vs $50K+ in value -- the SpaceNexus ROI',
    previewText,
    html,
    text,
  };
}

// A/B subject lines:
//   A: "Your 3-day Pro trial is waiting, {name}"
//   B: "Try SpaceNexus Pro free for 3 days -- no card required"
export function generateNurtureTrialOfferEmail(userName: string): NurtureEmailResult {
  const name = escapeHtml(userName || 'Explorer');
  const previewText = 'Unlock all Pro features free for 3 days. No credit card required.';

  const html = wrapNurtureEmail(`
    ${getNurtureHeader()}
    <tr><td style="padding:40px;">
      <h2 style="margin:0 0 16px;color:#f1f5f9;font-size:20px;">Your 3-day Pro trial is waiting</h2>
      <p style="margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.6;">
        ${name}, experience everything SpaceNexus Pro has to offer -- completely free for 3 days.
      </p>
      <p style="margin:0 0 8px;color:#f1f5f9;font-size:14px;font-weight:bold;">Top 5 Pro features you're missing:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:14px;">&#x2713; <strong style="color:#f1f5f9;">Unlimited access</strong> to all articles and data</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:14px;">&#x2713; <strong style="color:#f1f5f9;">Custom alert rules</strong> for launches, contracts, and more</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:14px;">&#x2713; <strong style="color:#f1f5f9;">Ad-free</strong> experience across every module</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:14px;">&#x2713; <strong style="color:#f1f5f9;">Data export</strong> to CSV and PDF</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:14px;">&#x2713; <strong style="color:#f1f5f9;">Priority support</strong> from our team</td></tr>
      </table>
      ${getNurtureCta('Start Free Trial', `${APP_URL}/pricing?trial=pro`)}
      <p style="margin:0;color:#64748b;font-size:12px;text-align:center;">No credit card required. Cancel anytime.</p>
    </td></tr>
    ${getNurtureFooter()}
  `, previewText);

  const text = `Your 3-day Pro trial is waiting

${userName || 'Explorer'}, experience everything SpaceNexus Pro has to offer -- completely free for 3 days.

Top 5 Pro features you're missing:
- Unlimited access to all articles and data
- Custom alert rules for launches, contracts, and more
- Ad-free experience across every module
- Data export to CSV and PDF
- Priority support from our team

Start Free Trial: ${APP_URL}/pricing?trial=pro

No credit card required. Cancel anytime.

---
SpaceNexus - Your gateway to the space industry
${APP_URL}`;

  return {
    subject: `Your 3-day Pro trial is waiting, ${userName || 'Explorer'}`,
    subjectB: 'Try SpaceNexus Pro free for 3 days -- no card required',
    previewText,
    html,
    text,
  };
}

// A/B subject lines:
//   A: "Last chance: 20% off SpaceNexus Pro (code SPACE20)"
//   B: "{name}, a special offer before we close the door"
export function generateNurtureFinalNudgeEmail(userName: string): NurtureEmailResult {
  const name = escapeHtml(userName || 'Explorer');
  const previewText = 'Get 20% off SpaceNexus Pro with code SPACE20. Limited time offer.';

  const html = wrapNurtureEmail(`
    ${getNurtureHeader()}
    <tr><td style="padding:40px;">
      <h2 style="margin:0 0 16px;color:#f1f5f9;font-size:20px;">A special offer for you, ${name}</h2>
      <p style="margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.6;">
        We noticed you haven't upgraded yet, and we'd love to help you get the most out of SpaceNexus. Here's an exclusive offer:
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
        <tr><td style="padding:20px;background-color:#0f172a;border-radius:8px;text-align:center;border:1px solid #06b6d4;">
          <p style="margin:0 0 8px;color:#06b6d4;font-size:24px;font-weight:bold;">20% OFF</p>
          <p style="margin:0 0 12px;color:#f1f5f9;font-size:16px;">SpaceNexus Pro</p>
          <p style="margin:0;color:#94a3b8;font-size:14px;">
            Use code <strong style="color:#06b6d4;font-size:18px;letter-spacing:2px;">SPACE20</strong> at checkout
          </p>
        </td></tr>
      </table>
      <p style="margin:0 0 0;color:#94a3b8;font-size:14px;line-height:1.6;">
        That's just <strong style="color:#06b6d4;">$7.99/month</strong> for unlimited access to all modules, real-time alerts, and data exports.
      </p>
      ${getNurtureCta('Claim Your Discount', `${APP_URL}/pricing?coupon=SPACE20`)}
      <p style="margin:0;color:#64748b;font-size:12px;text-align:center;">This offer is available for a limited time.</p>
    </td></tr>
    ${getNurtureFooter()}
  `, previewText);

  const text = `A special offer for you, ${userName || 'Explorer'}

We noticed you haven't upgraded yet, and we'd love to help you get the most out of SpaceNexus. Here's an exclusive offer:

20% OFF SpaceNexus Pro
Use code SPACE20 at checkout

That's just $7.99/month for unlimited access to all modules, real-time alerts, and data exports.

Claim Your Discount: ${APP_URL}/pricing?coupon=SPACE20

This offer is available for a limited time.

---
SpaceNexus - Your gateway to the space industry
${APP_URL}`;

  return {
    subject: 'Last chance: 20% off SpaceNexus Pro (code SPACE20)',
    subjectB: `${userName || 'Explorer'}, a special offer before we close the door`,
    previewText,
    html,
    text,
  };
}

export function generateVerificationEmail(verifyUrl: string, userName?: string): { html: string; text: string } {
  const greeting = userName ? `Welcome, ${escapeHtml(userName)}!` : 'Welcome to SpaceNexus!';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#1e293b;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:32px 40px;text-align:center;border-bottom:1px solid #334155;">
          <h1 style="margin:0;color:#06b6d4;font-size:24px;">SpaceNexus</h1>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#f1f5f9;font-size:20px;">${greeting}</h2>
          <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
            Please verify your email address to complete your registration and access all SpaceNexus features.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
            <tr><td style="background-color:#06b6d4;border-radius:8px;padding:14px 32px;">
              <a href="${escapeHtml(verifyUrl)}" style="color:#0f172a;text-decoration:none;font-weight:bold;font-size:15px;">Verify Email</a>
            </td></tr>
          </table>
          <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;border-top:1px solid #334155;padding-top:16px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${escapeHtml(verifyUrl)}" style="color:#06b6d4;word-break:break-all;">${escapeHtml(verifyUrl)}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `${greeting}\n\nPlease verify your email address to complete your SpaceNexus registration.\n\nVerify your email: ${verifyUrl}\n\nIf you didn't create this account, you can safely ignore this email.`;

  return { html, text };
}

// ============================================================
// Marketplace Email Templates
// ============================================================

export function generateRFQMatchEmail(providerName: string, rfqTitle: string, matchScore: number, rfqUrl: string): { html: string; text: string; subject: string } {
  const subject = `New RFQ matches your services: ${rfqTitle}`;
  const content = `
    <tr><td style="padding:30px 40px;">
      <h1 style="color:${styles.textWhite};font-size:22px;margin:0 0 16px 0;">New RFQ Match</h1>
      <p style="color:${styles.textLight};font-size:14px;line-height:1.6;margin:0 0 20px 0;">
        Hi ${escapeHtml(providerName)},<br><br>
        A new Request for Quote matches your service listings on SpaceNexus Marketplace.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;width:100%;">
        <tr><td style="padding:12px 16px;background:${styles.bgCard};border-radius:8px;">
          <p style="color:${styles.textWhite};font-size:16px;font-weight:600;margin:0 0 4px 0;">${escapeHtml(rfqTitle)}</p>
          <p style="color:${styles.accentNebulaLight};font-size:13px;margin:0;">Match Score: ${matchScore}%</p>
        </td></tr>
      </table>
      <a href="${escapeHtml(rfqUrl)}" style="display:inline-block;padding:12px 24px;background:${styles.accentNebula};color:#fff;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;">
        View RFQ & Submit Proposal
      </a>
    </td></tr>`;
  const html = wrapInEmailTemplate(content, `New RFQ: ${rfqTitle}`);
  const text = `Hi ${providerName},\n\nA new RFQ matches your services: "${rfqTitle}" (Match Score: ${matchScore}%)\n\nView and submit a proposal: ${rfqUrl}`;
  return { html, text, subject };
}

export function generateProposalReceivedEmail(buyerName: string, rfqTitle: string, providerName: string, proposalCount: number): { html: string; text: string; subject: string } {
  const subject = `New proposal received for: ${rfqTitle}`;
  const rfqUrl = `${APP_URL}/marketplace/rfq`;
  const content = `
    <tr><td style="padding:30px 40px;">
      <h1 style="color:${styles.textWhite};font-size:22px;margin:0 0 16px 0;">New Proposal Received</h1>
      <p style="color:${styles.textLight};font-size:14px;line-height:1.6;margin:0 0 20px 0;">
        Hi ${escapeHtml(buyerName)},<br><br>
        <strong>${escapeHtml(providerName)}</strong> has submitted a proposal for your RFQ "${escapeHtml(rfqTitle)}".
        You now have ${proposalCount} proposal${proposalCount !== 1 ? 's' : ''} to review.
      </p>
      <a href="${rfqUrl}" style="display:inline-block;padding:12px 24px;background:${styles.accentNebula};color:#fff;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;">
        Review Proposals
      </a>
    </td></tr>`;
  const html = wrapInEmailTemplate(content, `New proposal from ${providerName}`);
  const text = `Hi ${buyerName},\n\n${providerName} submitted a proposal for "${rfqTitle}". You now have ${proposalCount} proposals.\n\nReview proposals: ${rfqUrl}`;
  return { html, text, subject };
}

export function generateProposalStatusEmail(providerName: string, rfqTitle: string, newStatus: string): { html: string; text: string; subject: string } {
  const statusLabels: Record<string, string> = { shortlisted: 'Shortlisted', awarded: 'Awarded', rejected: 'Not Selected' };
  const statusLabel = statusLabels[newStatus] || newStatus;
  const subject = `Your proposal was ${statusLabel.toLowerCase()}: ${rfqTitle}`;
  const content = `
    <tr><td style="padding:30px 40px;">
      <h1 style="color:${styles.textWhite};font-size:22px;margin:0 0 16px 0;">Proposal Update</h1>
      <p style="color:${styles.textLight};font-size:14px;line-height:1.6;margin:0 0 20px 0;">
        Hi ${escapeHtml(providerName)},<br><br>
        Your proposal for "${escapeHtml(rfqTitle)}" has been updated to: <strong style="color:${styles.textWhite};">${statusLabel}</strong>
      </p>
      <a href="${APP_URL}/marketplace" style="display:inline-block;padding:12px 24px;background:${styles.accentNebula};color:#fff;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;">
        View on Marketplace
      </a>
    </td></tr>`;
  const html = wrapInEmailTemplate(content, `Proposal ${statusLabel}`);
  const text = `Hi ${providerName},\n\nYour proposal for "${rfqTitle}" has been ${statusLabel.toLowerCase()}.`;
  return { html, text, subject };
}

export function generateClarificationEmail(recipientName: string, rfqTitle: string, questionPreview: string): { html: string; text: string; subject: string } {
  const subject = `New Q&A on RFQ: ${rfqTitle}`;
  const content = `
    <tr><td style="padding:30px 40px;">
      <h1 style="color:${styles.textWhite};font-size:22px;margin:0 0 16px 0;">RFQ Clarification</h1>
      <p style="color:${styles.textLight};font-size:14px;line-height:1.6;margin:0 0 20px 0;">
        Hi ${escapeHtml(recipientName)},<br><br>
        A new question or answer has been posted on the RFQ "${escapeHtml(rfqTitle)}":
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;width:100%;">
        <tr><td style="padding:12px 16px;background:${styles.bgCard};border-radius:8px;border-left:3px solid ${styles.accentNebula};">
          <p style="color:${styles.textLight};font-size:13px;font-style:italic;margin:0;">"${escapeHtml(questionPreview.substring(0, 200))}${questionPreview.length > 200 ? '...' : ''}"</p>
        </td></tr>
      </table>
      <a href="${APP_URL}/marketplace" style="display:inline-block;padding:12px 24px;background:${styles.accentNebula};color:#fff;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;">
        View Full Q&A
      </a>
    </td></tr>`;
  const html = wrapInEmailTemplate(content, `Q&A: ${rfqTitle}`);
  const text = `Hi ${recipientName},\n\nNew Q&A on "${rfqTitle}":\n"${questionPreview.substring(0, 200)}"\n\nView on SpaceNexus Marketplace.`;
  return { html, text, subject };
}

export function generateReviewNotificationEmail(companyName: string, reviewerName: string, rating: number, reviewTitle: string): { html: string; text: string; subject: string } {
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  const subject = `New ${rating}-star review for ${companyName}`;
  const content = `
    <tr><td style="padding:30px 40px;">
      <h1 style="color:${styles.textWhite};font-size:22px;margin:0 0 16px 0;">New Review</h1>
      <p style="color:${styles.textLight};font-size:14px;line-height:1.6;margin:0 0 20px 0;">
        ${escapeHtml(companyName)} has received a new review on SpaceNexus Marketplace.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;width:100%;">
        <tr><td style="padding:12px 16px;background:${styles.bgCard};border-radius:8px;">
          <p style="color:#facc15;font-size:18px;margin:0 0 4px 0;">${stars}</p>
          ${reviewTitle ? `<p style="color:${styles.textWhite};font-size:14px;font-weight:600;margin:0 0 4px 0;">${escapeHtml(reviewTitle)}</p>` : ''}
          <p style="color:${styles.textMuted};font-size:12px;margin:0;">by ${escapeHtml(reviewerName)}</p>
        </td></tr>
      </table>
      <a href="${APP_URL}/provider-dashboard" style="display:inline-block;padding:12px 24px;background:${styles.accentNebula};color:#fff;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;">
        View & Respond
      </a>
    </td></tr>`;
  const html = wrapInEmailTemplate(content, `${rating}-star review for ${companyName}`);
  const text = `${companyName} received a new ${rating}-star review "${reviewTitle}" from ${reviewerName}.\n\nRespond on your provider dashboard.`;
  return { html, text, subject };
}

export function generateVerificationUpgradeEmail(companyName: string, newLevel: string, criteria: string): { html: string; text: string; subject: string } {
  const levelLabels: Record<string, string> = { identity: 'Identity Verified', capability: 'Capability Verified', performance: 'Performance Verified' };
  const levelLabel = levelLabels[newLevel] || newLevel;
  const subject = `Congratulations! ${companyName} is now ${levelLabel}`;
  const content = `
    <tr><td style="padding:30px 40px;">
      <h1 style="color:${styles.textWhite};font-size:22px;margin:0 0 16px 0;">Verification Upgrade</h1>
      <p style="color:${styles.textLight};font-size:14px;line-height:1.6;margin:0 0 20px 0;">
        Congratulations! <strong>${escapeHtml(companyName)}</strong> has been upgraded to <strong style="color:${styles.accentNebulaLight};">${levelLabel}</strong> on SpaceNexus Marketplace.
      </p>
      <p style="color:${styles.textMuted};font-size:13px;margin:0 0 20px 0;">
        Criteria met: ${escapeHtml(criteria)}
      </p>
      <p style="color:${styles.textLight};font-size:14px;margin:0 0 20px 0;">
        Your verified badge will now appear on all your service listings, increasing buyer confidence and visibility in search results.
      </p>
      <a href="${APP_URL}/provider-dashboard" style="display:inline-block;padding:12px 24px;background:${styles.accentNebula};color:#fff;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;">
        View Your Dashboard
      </a>
    </td></tr>`;
  const html = wrapInEmailTemplate(content, `${companyName} is now ${levelLabel}`);
  const text = `Congratulations! ${companyName} is now ${levelLabel} on SpaceNexus Marketplace.\nCriteria: ${criteria}`;
  return { html, text, subject };
}

// ============================================================
// AI Insights Editorial Review Email Template
// ============================================================

interface EditorialReviewArticle {
  title: string;
  slug: string;
  summary: string;
  category: string;
  contentPreview: string;
  factCheckNote: string | null;
  reviewToken: string;
}

export function generateEditorialReviewEmail(articles: EditorialReviewArticle[]): { html: string; text: string; subject: string } {
  const subject = `[SpaceNexus] ${articles.length} AI Insight${articles.length !== 1 ? 's' : ''} ready for review`;
  const categoryColors: Record<string, string> = {
    regulatory: '#f59e0b',
    market: '#10b981',
    technology: '#06b6d4',
    geopolitical: '#a78bfa',
  };

  let articlesHtml = '';
  let articlesPlain = '';

  articles.forEach((article, index) => {
    const catColor = categoryColors[article.category] || '#06b6d4';
    const approveUrl = `${APP_URL}/api/ai-insights/${article.slug}/approve?token=${article.reviewToken}`;
    const rejectUrl = `${APP_URL}/api/ai-insights/${article.slug}/reject?token=${article.reviewToken}`;
    const previewUrl = `${APP_URL}/api/ai-insights/${article.slug}/preview?token=${article.reviewToken}`;

    articlesHtml += `
      <tr>
        <td style="padding:${index === 0 ? '30' : '20'}px 40px 20px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;border-radius:8px;overflow:hidden;">
            <tr><td style="padding:20px;">
              <span style="display:inline-block;padding:3px 10px;background-color:${catColor}22;color:${catColor};font-size:11px;font-weight:600;text-transform:uppercase;border-radius:4px;border:1px solid ${catColor}44;">
                ${escapeHtml(article.category)}
              </span>
              <h2 style="margin:12px 0 8px 0;color:#f1f5f9;font-size:18px;font-weight:600;line-height:1.3;">
                ${escapeHtml(article.title)}
              </h2>
              <p style="margin:0 0 12px 0;color:#94a3b8;font-size:14px;line-height:1.6;">
                ${escapeHtml(article.summary)}
              </p>
              <p style="margin:0 0 16px 0;color:#64748b;font-size:13px;line-height:1.5;border-left:3px solid #334155;padding-left:12px;">
                ${escapeHtml(article.contentPreview)}...
              </p>
              ${article.factCheckNote ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
                <tr><td style="padding:12px;background-color:#1e293b;border-radius:6px;border-left:3px solid #f59e0b;">
                  <p style="margin:0 0 4px 0;color:#f59e0b;font-size:11px;font-weight:600;text-transform:uppercase;">Fact-Check Notes</p>
                  <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">${escapeHtml(article.factCheckNote)}</p>
                </td></tr>
              </table>
              ` : ''}
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:8px;">
                    <a href="${escapeHtml(approveUrl)}" style="display:inline-block;padding:10px 24px;background-color:#22c55e;color:#fff;border-radius:6px;font-weight:600;font-size:13px;text-decoration:none;">
                      Approve & Publish
                    </a>
                  </td>
                  <td style="padding-right:8px;">
                    <a href="${escapeHtml(previewUrl)}" style="display:inline-block;padding:10px 24px;background-color:#334155;color:#f1f5f9;border-radius:6px;font-weight:600;font-size:13px;text-decoration:none;">
                      Preview
                    </a>
                  </td>
                  <td>
                    <a href="${escapeHtml(rejectUrl)}" style="display:inline-block;padding:10px 24px;background-color:#dc2626;color:#fff;border-radius:6px;font-weight:600;font-size:13px;text-decoration:none;">
                      Reject
                    </a>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td>
      </tr>`;

    articlesPlain += `
---
[${article.category.toUpperCase()}] ${article.title}

${article.summary}

Preview: ${article.contentPreview}...
${article.factCheckNote ? `\nFact-Check Notes: ${article.factCheckNote}` : ''}

Approve: ${approveUrl}
Preview: ${previewUrl}
Reject: ${rejectUrl}
`;
  });

  const content = `
    <tr><td style="padding:32px 40px;text-align:center;border-bottom:1px solid #334155;">
      <h1 style="margin:0;color:#06b6d4;font-size:24px;">SpaceNexus</h1>
    </td></tr>
    <tr><td style="padding:30px 40px 10px 40px;">
      <h2 style="margin:0 0 8px 0;color:#f1f5f9;font-size:20px;">AI Insights Ready for Review</h2>
      <p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.6;">
        ${articles.length} new AI-generated article${articles.length !== 1 ? 's' : ''} ${articles.length !== 1 ? 'are' : 'is'} pending your approval before publishing on SpaceNexus.
      </p>
    </td></tr>
    ${articlesHtml}
    <tr><td style="padding:20px 40px 30px 40px;">
      <p style="margin:0;color:#64748b;font-size:12px;text-align:center;">
        Articles will not appear on SpaceNexus until approved. You can also manage pending articles in the
        <a href="${APP_URL}/admin" style="color:#06b6d4;">admin dashboard</a>.
      </p>
    </td></tr>`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#1e293b;border-radius:12px;overflow:hidden;">
        ${content}
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `AI INSIGHTS READY FOR REVIEW
${articles.length} new article${articles.length !== 1 ? 's' : ''} pending your approval.
${articlesPlain}
---
SpaceNexus - Articles will not appear until approved.
Manage in admin: ${APP_URL}/admin`;

  return { html, text, subject };
}
