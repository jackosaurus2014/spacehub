// Welcome email drip sequence — 6 emails over 14 days
// Uses same dark-themed, inline CSS pattern as main email-templates.ts

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us';

const styles = {
  bgDark: '#0a0a1a',
  bgCard: '#12122a',
  textWhite: '#ffffff',
  textLight: '#a0a0c0',
  textMuted: '#707090',
  accentCyan: '#06b6d4',
  accentNebula: '#7c3aed',
  borderColor: '#2a2a4a',
};

function wrapInLayout(title: string, bodyContent: string, preheader?: string): string {
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
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${styles.bgDark};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="${APP_URL}" style="color:${styles.textWhite};text-decoration:none;font-size:28px;font-weight:bold;letter-spacing:1px;">
            SpaceNexus
          </a>
        </td></tr>
        <tr><td style="background-color:${styles.bgCard};border-radius:12px;padding:32px;border:1px solid ${styles.borderColor};">
          ${bodyContent}
        </td></tr>
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

function featureRow(icon: string, title: string, desc: string): string {
  return `<tr>
    <td style="padding:10px 12px;border-bottom:1px solid ${styles.borderColor};">
      <span style="font-size:18px;margin-right:8px;">${icon}</span>
      <strong style="color:${styles.textWhite};font-size:14px;">${title}</strong>
      <br><span style="color:${styles.textMuted};font-size:12px;">${desc}</span>
    </td>
  </tr>`;
}

export interface DripEmail {
  day: number;
  templateId: string;
  subject: string;
  generate: () => { html: string; plain: string; subject: string };
}

/**
 * Day 0: Welcome email — sent immediately on registration
 */
function generateWelcomeEmail(): { html: string; plain: string; subject: string } {
  const subject = 'Welcome to SpaceNexus — your space intelligence platform';

  const html = wrapInLayout(subject, `
    <h1 style="color:${styles.textWhite};font-size:24px;margin:0 0 16px;text-align:center;">
      Welcome to SpaceNexus
    </h1>
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 16px;">
      You're in. You now have access to the space industry's most comprehensive intelligence
      platform — real-time data from 50+ sources, 200+ company profiles, and 10 integrated modules.
    </p>
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 20px;">
      Here are 3 things to try first:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr><td style="padding:12px;background-color:${styles.bgDark};border-radius:8px;border:1px solid ${styles.borderColor};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${featureRow('1️⃣', 'Explore Mission Control', 'Your real-time dashboard with launches, markets, and news')}
          ${featureRow('2️⃣', 'Browse Company Profiles', 'Deep-dive into 200+ space companies with financials and analysis')}
          ${featureRow('3️⃣', 'Track a Satellite', '19,000+ objects on an interactive 3D globe')}
        </table>
      </td></tr>
    </table>
    ${ctaButton('Open Mission Control', `${APP_URL}/mission-control`)}
    <p style="color:${styles.textMuted};font-size:12px;text-align:center;margin:0;">
      You'll get a few more emails from us over the next two weeks to help you get the most out of SpaceNexus.
      No spam — just useful tips.
    </p>
  `, 'You\'re in. Here are 3 things to try first.');

  const plain = `Welcome to SpaceNexus

You're in. You now have access to the space industry's most comprehensive intelligence platform.

3 things to try first:
1. Explore Mission Control — your real-time dashboard: ${APP_URL}/mission-control
2. Browse Company Profiles — 200+ space companies: ${APP_URL}/company-profiles
3. Track a Satellite — 19,000+ objects on 3D globe: ${APP_URL}/satellites

Open Mission Control: ${APP_URL}/mission-control

SpaceNexus LLC | spacenexus.us`;

  return { html, plain, subject };
}

/**
 * Day 1: Launch Dashboard walkthrough
 */
function generateDashboardWalkthroughEmail(): { html: string; plain: string; subject: string } {
  const subject = 'Never miss a launch — your real-time launch dashboard';

  const html = wrapInLayout(subject, `
    <h1 style="color:${styles.textWhite};font-size:22px;margin:0 0 16px;">
      Your Launch Dashboard
    </h1>
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 16px;">
      SpaceNexus tracks every orbital and suborbital launch worldwide. Here's how to use the launch dashboard:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr><td style="padding:16px;background-color:${styles.bgDark};border-radius:8px;border:1px solid ${styles.borderColor};">
        <p style="color:${styles.accentCyan};font-weight:bold;margin:0 0 12px;font-size:14px;">What you can do:</p>
        <ul style="color:${styles.textLight};font-size:13px;line-height:2;margin:0;padding-left:20px;">
          <li>See upcoming launches with live countdowns</li>
          <li>Filter by provider (SpaceX, ULA, Rocket Lab, etc.)</li>
          <li>View launch vehicle specs and payload details</li>
          <li>Track launch history and success rates</li>
          <li>Watch live streams when available</li>
        </ul>
      </td></tr>
    </table>
    <p style="color:${styles.textLight};font-size:14px;line-height:1.6;margin:0 0 4px;">
      <strong style="color:${styles.textWhite};">Pro tip:</strong> Check out the
      <a href="${APP_URL}/launch-vehicles" style="color:${styles.accentCyan};text-decoration:none;">Launch Vehicles module</a>
      to compare rockets side-by-side — payload capacity, cost per kg, and more.
    </p>
    ${ctaButton('View Launch Dashboard', `${APP_URL}/launch`)}
  `, 'Track every rocket launch worldwide with live countdowns.');

  const plain = `Never Miss a Launch

SpaceNexus tracks every orbital and suborbital launch worldwide.

What you can do:
- See upcoming launches with live countdowns
- Filter by provider (SpaceX, ULA, Rocket Lab, etc.)
- View launch vehicle specs and payload details
- Track launch history and success rates
- Watch live streams when available

Pro tip: Check out Launch Vehicles to compare rockets side-by-side.

View Launch Dashboard: ${APP_URL}/launch
Launch Vehicles: ${APP_URL}/launch-vehicles

SpaceNexus LLC | spacenexus.us`;

  return { html, plain, subject };
}

/**
 * Day 3: Company profiles deep dive
 */
function generateCompanyProfilesEmail(): { html: string; plain: string; subject: string } {
  const subject = '200+ space companies — profiles, financials, and analysis';

  const html = wrapInLayout(subject, `
    <h1 style="color:${styles.textWhite};font-size:22px;margin:0 0 16px;">
      Space Company Intelligence
    </h1>
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 16px;">
      SpaceNexus profiles over 200 space companies — from SpaceX and Lockheed Martin to emerging startups.
      Each profile includes:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${styles.bgDark};border-radius:8px;border:1px solid ${styles.borderColor};margin:16px 0;">
      ${featureRow('📊', 'Financial Data', 'Revenue, funding rounds, valuation, and market cap')}
      ${featureRow('🛰️', 'Satellite Assets', 'Active satellites and constellation details')}
      ${featureRow('📰', 'News Feed', 'Company-tagged news from 50+ sources')}
      ${featureRow('📋', 'Contract History', 'Government contracts and awards')}
      ${featureRow('🏢', 'Facility Map', 'HQ, manufacturing, and launch site locations')}
    </table>
    <p style="color:${styles.textLight};font-size:14px;line-height:1.6;margin:0 0 4px;">
      <strong style="color:${styles.textWhite};">Try searching for a company you follow</strong> — type any name in the
      <a href="${APP_URL}/company-profiles" style="color:${styles.accentCyan};text-decoration:none;">company directory</a>
      to see what's available.
    </p>
    ${ctaButton('Browse Company Profiles', `${APP_URL}/company-profiles`)}
  `, 'Deep-dive into 200+ space companies with financials, news, and analysis.');

  const plain = `Space Company Intelligence

SpaceNexus profiles over 200 space companies. Each profile includes:
- Financial Data: revenue, funding, valuation, market cap
- Satellite Assets: active satellites and constellations
- News Feed: company-tagged news from 50+ sources
- Contract History: government contracts and awards
- Facility Map: HQ, manufacturing, and launch sites

Try searching for a company: ${APP_URL}/company-profiles

SpaceNexus LLC | spacenexus.us`;

  return { html, plain, subject };
}

/**
 * Day 5: Power features (Market Intel, Procurement, Compliance)
 */
function generatePowerFeaturesEmail(): { html: string; plain: string; subject: string } {
  const subject = '3 features most users discover on week 2';

  const html = wrapInLayout(subject, `
    <h1 style="color:${styles.textWhite};font-size:22px;margin:0 0 16px;">
      Power Features You Might Have Missed
    </h1>
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 20px;">
      Beyond launches and satellites, SpaceNexus has three modules that professionals tell us are
      game-changers for their work:
    </p>

    <div style="margin-bottom:16px;padding:16px;background-color:${styles.bgDark};border-radius:8px;border:1px solid ${styles.borderColor};">
      <h3 style="color:${styles.accentCyan};font-size:16px;margin:0 0 8px;">📊 Market Intelligence</h3>
      <p style="color:${styles.textLight};font-size:13px;line-height:1.5;margin:0;">
        Track space stocks, ETFs, funding rounds, and M&A activity. Real-time data on every public space company
        plus venture capital deal flow.
      </p>
      <a href="${APP_URL}/market-intel" style="color:${styles.accentCyan};font-size:12px;display:block;margin-top:8px;">Explore Market Intel &rarr;</a>
    </div>

    <div style="margin-bottom:16px;padding:16px;background-color:${styles.bgDark};border-radius:8px;border:1px solid ${styles.borderColor};">
      <h3 style="color:${styles.accentCyan};font-size:16px;margin:0 0 8px;">📋 Procurement Intelligence</h3>
      <p style="color:${styles.textLight};font-size:13px;line-height:1.5;margin:0;">
        Government contracts from SAM.gov and SBIR opportunities — filtered for space. Find NASA, Space Force,
        and NOAA contracts before your competitors.
      </p>
      <a href="${APP_URL}/procurement" style="color:${styles.accentCyan};font-size:12px;display:block;margin-top:8px;">Browse Contracts &rarr;</a>
    </div>

    <div style="margin-bottom:16px;padding:16px;background-color:${styles.bgDark};border-radius:8px;border:1px solid ${styles.borderColor};">
      <h3 style="color:${styles.accentCyan};font-size:16px;margin:0 0 8px;">⚖️ Regulatory Compliance</h3>
      <p style="color:${styles.textLight};font-size:13px;line-height:1.5;margin:0;">
        Track FCC filings, spectrum allocations, and regulatory changes. Essential for satellite operators,
        launch providers, and anyone navigating space law.
      </p>
      <a href="${APP_URL}/compliance" style="color:${styles.accentCyan};font-size:12px;display:block;margin-top:8px;">View Compliance Hub &rarr;</a>
    </div>

    ${ctaButton('Open SpaceNexus', APP_URL)}
  `, 'Market intel, procurement, and compliance — the modules professionals love.');

  const plain = `Power Features You Might Have Missed

1. Market Intelligence
Track space stocks, ETFs, funding rounds, and M&A activity.
${APP_URL}/market-intel

2. Procurement Intelligence
Government contracts from SAM.gov and SBIR opportunities.
${APP_URL}/procurement

3. Regulatory Compliance
Track FCC filings, spectrum allocations, and regulatory changes.
${APP_URL}/compliance

Open SpaceNexus: ${APP_URL}

SpaceNexus LLC | spacenexus.us`;

  return { html, plain, subject };
}

/**
 * Day 10: Pro upsell
 */
function generateProUpsellEmail(): { html: string; plain: string; subject: string } {
  const subject = 'Unlock AI insights and advanced analytics with SpaceNexus Pro';

  const html = wrapInLayout(subject, `
    <h1 style="color:${styles.textWhite};font-size:22px;margin:0 0 16px;">
      Ready for More?
    </h1>
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 16px;">
      You've been using SpaceNexus for 10 days now. If you're finding the free tier useful,
      here's what you're missing on Pro:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr><td style="padding:16px;background-color:${styles.bgDark};border-radius:8px;border:1px solid ${styles.borderColor};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${featureRow('🤖', 'AI-Powered Insights', 'Automated analysis of launches, markets, and company news')}
          ${featureRow('📊', 'Advanced Analytics', 'Custom charts, data export, and trend analysis')}
          ${featureRow('🔔', 'Smart Alerts', 'Custom notifications for launches, contracts, and market moves')}
          ${featureRow('📈', 'Unlimited Articles', 'No daily article limits on news and blogs')}
          ${featureRow('🔌', 'API Access', 'Integrate SpaceNexus data into your own tools')}
          ${featureRow('🚫', 'Ad-Free Experience', 'Clean interface without advertisements')}
        </table>
      </td></tr>
    </table>
    <p style="color:${styles.textLight};font-size:14px;text-align:center;margin:0 0 4px;">
      Pro starts at <strong style="color:${styles.textWhite};">$29/month</strong>. Cancel anytime.
    </p>
    ${ctaButton('Upgrade to Pro', `${APP_URL}/pricing`)}
    <p style="color:${styles.textMuted};font-size:12px;text-align:center;margin:0;">
      Not ready? No problem — the free tier is yours forever.
    </p>
  `, 'AI insights, advanced analytics, smart alerts, and more.');

  const plain = `Ready for More?

You've been using SpaceNexus for 10 days. Here's what Pro unlocks:

- AI-Powered Insights — automated analysis of launches, markets, and news
- Advanced Analytics — custom charts, data export, and trends
- Smart Alerts — custom notifications for launches, contracts, market moves
- Unlimited Articles — no daily article limits
- API Access — integrate SpaceNexus data into your tools
- Ad-Free Experience — clean interface

Pro starts at $29/month. Cancel anytime.
Upgrade: ${APP_URL}/pricing

Not ready? The free tier is yours forever.

SpaceNexus LLC | spacenexus.us`;

  return { html, plain, subject };
}

/**
 * Day 14: NPS survey + check-in
 */
function generateNpsSurveyEmail(): { html: string; plain: string; subject: string } {
  const subject = 'Quick question — how\'s SpaceNexus working for you?';

  const html = wrapInLayout(subject, `
    <h1 style="color:${styles.textWhite};font-size:22px;margin:0 0 16px;">
      Two Weeks In — How Are We Doing?
    </h1>
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 20px;">
      You've had SpaceNexus for two weeks now. We'd love to know: how likely are you to recommend
      us to a colleague in the space industry?
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
      <tr>
        ${[0,1,2,3,4,5,6,7,8,9,10].map(n => `<td style="padding:2px;">
          <a href="${APP_URL}/api/nps?score=${n}" style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border-radius:6px;background-color:${n <= 6 ? '#ef4444' : n <= 8 ? '#f59e0b' : '#22c55e'};color:#fff;text-decoration:none;font-size:13px;font-weight:bold;">${n}</a>
        </td>`).join('')}
      </tr>
      <tr>
        <td colspan="4" style="padding-top:4px;color:${styles.textMuted};font-size:11px;">Not likely</td>
        <td colspan="3"></td>
        <td colspan="4" style="padding-top:4px;color:${styles.textMuted};font-size:11px;text-align:right;">Very likely</td>
      </tr>
    </table>
    <p style="color:${styles.textLight};font-size:14px;line-height:1.6;margin:0 0 16px;">
      Your feedback directly shapes what we build next. If there's a feature you wish we had or
      something that's not working right, reply to this email — it goes straight to the founding team.
    </p>
    <div style="padding:16px;background-color:${styles.bgDark};border-radius:8px;border:1px solid ${styles.borderColor};">
      <p style="color:${styles.accentCyan};font-weight:bold;margin:0 0 8px;font-size:14px;">What's coming next:</p>
      <ul style="color:${styles.textLight};font-size:13px;line-height:1.8;margin:0;padding-left:20px;">
        <li>Custom dashboard builder</li>
        <li>Enhanced AI analysis for company profiles</li>
        <li>Marketplace for space products and services</li>
        <li>Weekly "Space Intel Brief" newsletter</li>
      </ul>
    </div>
    ${ctaButton('Open SpaceNexus', APP_URL)}
  `, 'We\'d love your feedback — how likely are you to recommend us?');

  const plain = `Two Weeks In — How Are We Doing?

We'd love to know: how likely are you to recommend SpaceNexus to a colleague? (0-10)

Rate us: ${APP_URL}/api/nps

Your feedback directly shapes what we build next. Reply to this email — it goes to the founding team.

What's coming next:
- Custom dashboard builder
- Enhanced AI analysis for company profiles
- Marketplace for space products and services
- Weekly "Space Intel Brief" newsletter

Open SpaceNexus: ${APP_URL}

SpaceNexus LLC | spacenexus.us`;

  return { html, plain, subject };
}

/**
 * Complete drip sequence definition
 */
export const WELCOME_DRIP_SEQUENCE: DripEmail[] = [
  { day: 0, templateId: 'welcome', subject: 'Welcome to SpaceNexus', generate: generateWelcomeEmail },
  { day: 1, templateId: 'dashboard-walkthrough', subject: 'Never miss a launch', generate: generateDashboardWalkthroughEmail },
  { day: 3, templateId: 'company-profiles', subject: '200+ space companies', generate: generateCompanyProfilesEmail },
  { day: 5, templateId: 'power-features', subject: 'Power features', generate: generatePowerFeaturesEmail },
  { day: 10, templateId: 'pro-upsell', subject: 'Upgrade to Pro', generate: generateProUpsellEmail },
  { day: 14, templateId: 'nps-survey', subject: 'How\'s SpaceNexus?', generate: generateNpsSurveyEmail },
];

/**
 * Get the next drip email for a user based on days since registration
 */
export function getNextDripEmail(daysSinceRegistration: number, sentTemplateIds: string[]): DripEmail | null {
  for (const email of WELCOME_DRIP_SEQUENCE) {
    if (daysSinceRegistration >= email.day && !sentTemplateIds.includes(email.templateId)) {
      return email;
    }
  }
  return null;
}
