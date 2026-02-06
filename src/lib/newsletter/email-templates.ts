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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.com';

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
        <img src="${APP_URL}/spacenexus-logo.png" alt="SpaceNexus" width="180" style="display: block; margin-bottom: 10px;">
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
              <img src="${APP_URL}/spacenexus-logo.png" alt="SpaceNexus" width="120" style="display: block; opacity: 0.7; margin-bottom: 15px;">
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
