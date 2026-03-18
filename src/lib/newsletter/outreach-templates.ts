// Cold outreach email templates for founder sales
// Uses same dark-themed, inline CSS pattern as marketing-email-templates.ts

import { APP_URL } from '@/lib/constants';

const styles = {
  bgDark: '#0a0a1a',
  bgCard: '#12122a',
  textWhite: '#ffffff',
  textLight: '#a0a0c0',
  textMuted: '#707090',
  accentCyan: '#06b6d4',
  accentNebula: '#7c3aed',
  accentNebulaLight: '#a78bfa',
  borderColor: '#2a2a4a',
};

interface OutreachEmailResult {
  html: string;
  plain: string;
  subject: string;
}

function wrapInLayout(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body, table, td, div, p, span, a { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    body { margin: 0; padding: 0; background-color: ${styles.bgDark}; color: ${styles.textWhite}; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${styles.bgDark};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${styles.bgDark};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="${APP_URL}" style="color:${styles.textWhite};text-decoration:none;font-size:28px;font-weight:bold;letter-spacing:1px;">
            SpaceNexus
          </a>
        </td></tr>
        <!-- Body -->
        <tr><td style="background-color:${styles.bgCard};border-radius:12px;padding:32px;border:1px solid ${styles.borderColor};">
          ${bodyContent}
        </td></tr>
        <!-- Footer -->
        <tr><td align="center" style="padding-top:24px;color:${styles.textMuted};font-size:12px;">
          <p style="margin:0 0 8px;">SpaceNexus LLC &bull; Houston, TX</p>
          <p style="margin:0;">
            <a href="${APP_URL}/privacy" style="color:${styles.textMuted};text-decoration:underline;">Privacy</a> &bull;
            <a href="${APP_URL}/terms" style="color:${styles.textMuted};text-decoration:underline;">Terms</a> &bull;
            <a href="${APP_URL}" style="color:${styles.textMuted};text-decoration:underline;">spacenexus.us</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(text: string, href: string, color: string = styles.accentCyan): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
    <tr><td align="center" style="background-color:${color};border-radius:8px;">
      <a href="${href}" style="display:inline-block;padding:14px 32px;color:#000000;text-decoration:none;font-weight:bold;font-size:16px;">
        ${text}
      </a>
    </td></tr>
  </table>`;
}

function bulletPoint(text: string): string {
  return `<tr><td style="padding:6px 0;vertical-align:top;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:10px;vertical-align:top;color:${styles.accentCyan};font-size:18px;line-height:1;">&bull;</td>
      <td style="color:${styles.textLight};font-size:15px;line-height:1.5;">${text}</td>
    </tr></table>
  </td></tr>`;
}

/**
 * Outreach Template 1: For Space VCs
 * Targets venture capital firms investing in the space sector.
 */
export function generateSpaceVCOutreach(): OutreachEmailResult {
  const subject = 'The space deal flow tool your competitors are using';

  const html = wrapInLayout(subject, `
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 16px;">
      Hi {{FIRST_NAME}},
    </p>
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 16px;">
      I noticed {{FIRM_NAME}} has been active in the space sector &mdash; congrats on the recent investments. I&rsquo;m building SpaceNexus, the intelligence platform space-focused investors are using to source and evaluate deals faster.
    </p>
    <p style="color:${styles.textWhite};font-size:16px;font-weight:600;margin:0 0 12px;">
      Here&rsquo;s what VCs are using it for:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      ${bulletPoint('<strong style="color:' + styles.textWhite + ';">200+ company profiles</strong> with funding history, team data, and competitive positioning &mdash; searchable and filterable by subsector')}
      ${bulletPoint('<strong style="color:' + styles.textWhite + ';">Real-time funding tracker</strong> that surfaces new rounds, M&A activity, and SPAC movements the day they happen')}
      ${bulletPoint('<strong style="color:' + styles.textWhite + ';">Deal flow alerts</strong> &mdash; get notified when companies in your focus areas raise, hire key execs, or win government contracts')}
    </table>
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 8px;">
      We&rsquo;re replacing the scattered Google Alerts + expensive research subscriptions that most space VCs cobble together. One platform, updated daily.
    </p>
    ${ctaButton('Try SpaceNexus Free', APP_URL + '/register?ref=outreach-vc')}
    <p style="color:${styles.textMuted};font-size:13px;line-height:1.5;margin:0;text-align:center;">
      No credit card required &bull; Full access during trial
    </p>
  `);

  const plain = `Hi {{FIRST_NAME}},

I noticed {{FIRM_NAME}} has been active in the space sector -- congrats on the recent investments. I'm building SpaceNexus, the intelligence platform space-focused investors are using to source and evaluate deals faster.

Here's what VCs are using it for:

- 200+ company profiles with funding history, team data, and competitive positioning -- searchable and filterable by subsector
- Real-time funding tracker that surfaces new rounds, M&A activity, and SPAC movements the day they happen
- Deal flow alerts -- get notified when companies in your focus areas raise, hire key execs, or win government contracts

We're replacing the scattered Google Alerts + expensive research subscriptions that most space VCs cobble together. One platform, updated daily.

Try SpaceNexus free (no credit card required):
${APP_URL}/register?ref=outreach-vc

---
SpaceNexus LLC | Houston, TX
${APP_URL}`;

  return { html, plain, subject };
}

/**
 * Outreach Template 2: For Defense Contractors
 * Targets defense/aerospace companies needing compliance and contract tracking.
 */
export function generateDefenseContractorOutreach(): OutreachEmailResult {
  const subject = 'ITAR compliance just got 10x easier';

  const html = wrapInLayout(subject, `
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 16px;">
      Hi {{FIRST_NAME}},
    </p>
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 16px;">
      If you&rsquo;re involved in space or defense programs at {{COMPANY_NAME}}, you know how painful it is to stay on top of ITAR, EAR, and the constantly shifting regulatory landscape. We built SpaceNexus to solve exactly that.
    </p>
    <p style="color:${styles.textWhite};font-size:16px;font-weight:600;margin:0 0 12px;">
      What defense teams use SpaceNexus for:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      ${bulletPoint('<strong style="color:' + styles.textWhite + ';">Compliance database</strong> &mdash; searchable ITAR/EAR categories, USML references, and export control classifications mapped to space technologies')}
      ${bulletPoint('<strong style="color:' + styles.textWhite + ';">Regulatory alerts</strong> &mdash; instant notifications when FAA, FCC, NOAA, or DoD issue new rules, guidance, or RFIs affecting the space sector')}
      ${bulletPoint('<strong style="color:' + styles.textWhite + ';">Contract tracking</strong> &mdash; monitor government contract awards, SAM.gov opportunities, and competitor wins across NASA, Space Force, and NRO programs')}
    </table>
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 8px;">
      Instead of having your compliance team chase down updates across 10 different federal websites, SpaceNexus aggregates it into a single dashboard with proactive alerts.
    </p>
    ${ctaButton('Try SpaceNexus Free', APP_URL + '/register?ref=outreach-defense')}
    <p style="color:${styles.textMuted};font-size:13px;line-height:1.5;margin:0;text-align:center;">
      No credit card required &bull; Full access during trial
    </p>
  `);

  const plain = `Hi {{FIRST_NAME}},

If you're involved in space or defense programs at {{COMPANY_NAME}}, you know how painful it is to stay on top of ITAR, EAR, and the constantly shifting regulatory landscape. We built SpaceNexus to solve exactly that.

What defense teams use SpaceNexus for:

- Compliance database -- searchable ITAR/EAR categories, USML references, and export control classifications mapped to space technologies
- Regulatory alerts -- instant notifications when FAA, FCC, NOAA, or DoD issue new rules, guidance, or RFIs affecting the space sector
- Contract tracking -- monitor government contract awards, SAM.gov opportunities, and competitor wins across NASA, Space Force, and NRO programs

Instead of having your compliance team chase down updates across 10 different federal websites, SpaceNexus aggregates it into a single dashboard with proactive alerts.

Try SpaceNexus free (no credit card required):
${APP_URL}/register?ref=outreach-defense

---
SpaceNexus LLC | Houston, TX
${APP_URL}`;

  return { html, plain, subject };
}

/**
 * Outreach Template 3: For Space Startups
 * Targets early-stage space companies looking for affordable market intelligence.
 */
export function generateSpaceStartupOutreach(): OutreachEmailResult {
  const subject = 'Stop paying $10K/yr for space market intelligence';

  const html = wrapInLayout(subject, `
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 16px;">
      Hi {{FIRST_NAME}},
    </p>
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 16px;">
      I saw that {{COMPANY_NAME}} is building in the {{SUBSECTOR}} space &mdash; exciting stuff. Quick question: are you paying $10K+ per year for market research reports that are outdated by the time they arrive?
    </p>
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 16px;">
      SpaceNexus gives you the same caliber of space market intelligence for <strong style="color:${styles.accentCyan};">$19.99/month</strong> &mdash; that&rsquo;s less than one analyst-hour at the big research firms.
    </p>
    <p style="color:${styles.textWhite};font-size:16px;font-weight:600;margin:0 0 12px;">
      What startups get:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      ${bulletPoint('<strong style="color:' + styles.textWhite + ';">Live market data</strong> &mdash; TAM/SAM sizing, segment growth rates, and investment flow data updated daily, not annually')}
      ${bulletPoint('<strong style="color:' + styles.textWhite + ';">200+ company profiles</strong> &mdash; know your competitors\' funding, team size, contracts, and strategic moves before your next board meeting')}
      ${bulletPoint('<strong style="color:' + styles.textWhite + ';">Competitive analysis tools</strong> &mdash; side-by-side comparisons, market positioning maps, and automated alerts when competitors make moves')}
    </table>
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 8px;">
      Your investors expect you to know the market. SpaceNexus makes that possible without the enterprise price tag.
    </p>
    ${ctaButton('Try SpaceNexus Free', APP_URL + '/register?ref=outreach-startup')}
    <p style="color:${styles.textMuted};font-size:13px;line-height:1.5;margin:0;text-align:center;">
      No credit card required &bull; $19.99/mo after trial vs $10K+ competitors
    </p>
  `);

  const plain = `Hi {{FIRST_NAME}},

I saw that {{COMPANY_NAME}} is building in the {{SUBSECTOR}} space -- exciting stuff. Quick question: are you paying $10K+ per year for market research reports that are outdated by the time they arrive?

SpaceNexus gives you the same caliber of space market intelligence for $19.99/month -- that's less than one analyst-hour at the big research firms.

What startups get:

- Live market data -- TAM/SAM sizing, segment growth rates, and investment flow data updated daily, not annually
- 200+ company profiles -- know your competitors' funding, team size, contracts, and strategic moves before your next board meeting
- Competitive analysis tools -- side-by-side comparisons, market positioning maps, and automated alerts when competitors make moves

Your investors expect you to know the market. SpaceNexus makes that possible without the enterprise price tag.

Try SpaceNexus free (no credit card required):
${APP_URL}/register?ref=outreach-startup

$19.99/mo after trial vs $10K+ competitors

---
SpaceNexus LLC | Houston, TX
${APP_URL}`;

  return { html, plain, subject };
}
