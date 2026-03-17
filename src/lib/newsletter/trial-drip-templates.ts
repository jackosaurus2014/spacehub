// Trial-to-paid conversion drip sequence — 3 emails over 7 days
// Sent to users on a 14-day Professional trial to drive engagement and conversion
// Uses same dark-themed, inline CSS pattern as welcome-drip-templates.ts

import { APP_URL } from '@/lib/constants';

const styles = {
  bgDark: '#0a0a1a',
  bgCard: '#12122a',
  textWhite: '#ffffff',
  textLight: '#a0a0c0',
  textMuted: '#707090',
  accentCyan: '#06b6d4',
  accentNebula: '#7c3aed',
  accentAmber: '#f59e0b',
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

function actionCard(icon: string, title: string, desc: string, href: string): string {
  return `<div style="margin-bottom:12px;padding:16px;background-color:${styles.bgDark};border-radius:8px;border:1px solid ${styles.borderColor};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:40px;vertical-align:top;">
          <span style="font-size:22px;">${icon}</span>
        </td>
        <td style="vertical-align:top;">
          <a href="${href}" style="color:${styles.accentCyan};font-weight:bold;font-size:14px;text-decoration:none;">${title}</a>
          <br><span style="color:${styles.textMuted};font-size:12px;line-height:1.5;">${desc}</span>
        </td>
      </tr>
    </table>
  </div>`;
}

export interface TrialDripEmail {
  day: number;
  templateId: string;
  subject: string;
  generate: (params: TrialDripParams) => { html: string; plain: string; subject: string };
}

export interface TrialDripParams {
  /** User's first name or display name */
  userName: string;
  /** Personalized usage stats for the Day 7 email */
  stats?: {
    companyProfilesViewed: number;
    articlesRead: number;
    satellitesTracked: number;
  };
}

// ---------------------------------------------------------------------------
// Day 0: "Your space command center is ready"
// ---------------------------------------------------------------------------
function generateTrialWelcomeEmail(params: TrialDripParams): { html: string; plain: string; subject: string } {
  const { userName } = params;
  const subject = 'Your space command center is ready';

  const html = wrapInLayout(subject, `
    <h1 style="color:${styles.textWhite};font-size:24px;margin:0 0 8px;text-align:center;">
      Welcome aboard, ${userName}!
    </h1>
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 16px;text-align:center;">
      Your space command center is ready. Let&rsquo;s get you oriented.
    </p>

    <!-- Trial highlight -->
    <div style="margin:16px 0 24px;padding:14px 20px;background:linear-gradient(135deg, ${styles.accentNebula}22, ${styles.accentCyan}22);border-radius:8px;border:1px solid ${styles.accentCyan}44;text-align:center;">
      <span style="color:${styles.accentCyan};font-weight:bold;font-size:14px;">
        You have 14 days of full Professional access
      </span>
      <br>
      <span style="color:${styles.textMuted};font-size:12px;">
        Unlimited articles, smart alerts, deal flow, executive moves &mdash; all unlocked.
      </span>
    </div>

    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 16px;">
      Here are 3 quick actions to start with:
    </p>

    ${actionCard(
      '\u{1F4CA}',
      'Explore Your Dashboard',
      'Your personalized mission control with launches, markets, and live data.',
      `${APP_URL}/dashboard`
    )}

    ${actionCard(
      '\u{1F3E2}',
      'Browse Company Profiles',
      'Deep-dive into 200+ space companies with financials, news, and analysis.',
      `${APP_URL}/company-profiles`
    )}

    ${actionCard(
      '\u{1F6F0}\uFE0F',
      'Track Satellites',
      '19,000+ objects on an interactive 3D globe \u2014 ISS, Starlink, weather satellites, and more.',
      `${APP_URL}/satellites`
    )}

    ${ctaButton('Get Started', `${APP_URL}/getting-started`)}

    <p style="color:${styles.textMuted};font-size:12px;text-align:center;margin:0;">
      We&rsquo;ll send a couple more emails this week to help you get the most out of your trial. No spam.
    </p>
  `, `Welcome aboard, ${userName}! Your 14-day Professional trial is active.`);

  const plain = `Welcome aboard, ${userName}!

Your space command center is ready. You have 14 days of full Professional access — unlimited articles, smart alerts, deal flow, executive moves, and more.

3 quick actions to start with:

1. Explore Your Dashboard
   Your personalized mission control with launches, markets, and live data.
   ${APP_URL}/dashboard

2. Browse Company Profiles
   Deep-dive into 200+ space companies with financials, news, and analysis.
   ${APP_URL}/company-profiles

3. Track Satellites
   19,000+ objects on an interactive 3D globe.
   ${APP_URL}/satellites

Get Started: ${APP_URL}/getting-started

SpaceNexus LLC | spacenexus.us`;

  return { html, plain, subject };
}

// ---------------------------------------------------------------------------
// Day 3: "3 things you haven't tried yet"
// ---------------------------------------------------------------------------
function generateTrialEngagementEmail(params: TrialDripParams): { html: string; plain: string; subject: string } {
  const { userName } = params;
  const subject = '3 things you haven\'t tried yet';

  const html = wrapInLayout(subject, `
    <h1 style="color:${styles.textWhite};font-size:22px;margin:0 0 16px;">
      Hey ${userName}, going deeper
    </h1>
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 8px;">
      You&rsquo;ve been on SpaceNexus for 3 days. Nice! But there are some powerful features most
      users don&rsquo;t discover until week two. Here are three worth trying today:
    </p>

    <!-- Feature 1 -->
    <div style="margin:20px 0 16px;padding:16px;background-color:${styles.bgDark};border-radius:8px;border:1px solid ${styles.borderColor};">
      <h3 style="color:${styles.accentCyan};font-size:16px;margin:0 0 6px;">
        <span style="margin-right:6px;">\u{1F514}</span> Set Up Price Alerts
      </h3>
      <p style="color:${styles.textLight};font-size:13px;line-height:1.5;margin:0 0 8px;">
        Track space stocks and get notified when they hit your target price. Works for ASTS,
        RocketLab (RKLB), Virgin Galactic, and every other public space company.
      </p>
      <a href="${APP_URL}/alerts" style="color:${styles.accentCyan};font-size:12px;text-decoration:none;">
        Set up alerts &rarr;
      </a>
    </div>

    <!-- Feature 2 -->
    <div style="margin-bottom:16px;padding:16px;background-color:${styles.bgDark};border-radius:8px;border:1px solid ${styles.borderColor};">
      <h3 style="color:${styles.accentCyan};font-size:16px;margin:0 0 6px;">
        <span style="margin-right:6px;">\u{1F4CB}</span> Read the Weekly Intelligence Brief
      </h3>
      <p style="color:${styles.textLight};font-size:13px;line-height:1.5;margin:0 0 8px;">
        Every week we compile the most important developments across launches, policy, markets,
        and contracts into a single, skimmable briefing. It&rsquo;s what space professionals read on
        Monday morning.
      </p>
      <a href="${APP_URL}/intelligence-brief" style="color:${styles.accentCyan};font-size:12px;text-decoration:none;">
        Read the latest brief &rarr;
      </a>
    </div>

    <!-- Feature 3 -->
    <div style="margin-bottom:16px;padding:16px;background-color:${styles.bgDark};border-radius:8px;border:1px solid ${styles.borderColor};">
      <h3 style="color:${styles.accentCyan};font-size:16px;margin:0 0 6px;">
        <span style="margin-right:6px;">\u{1F4B0}</span> Use the Mission Cost Calculator
      </h3>
      <p style="color:${styles.textLight};font-size:13px;line-height:1.5;margin:0 0 8px;">
        Estimate launch costs across vehicles &mdash; from Falcon 9 to Starship to Electron. Compare
        cost per kg to LEO, GTO, and beyond.
      </p>
      <a href="${APP_URL}/mission-cost" style="color:${styles.accentCyan};font-size:12px;text-decoration:none;">
        Try the calculator &rarr;
      </a>
    </div>

    ${ctaButton('Explore All Features', `${APP_URL}/dashboard`)}

    <p style="color:${styles.textMuted};font-size:12px;text-align:center;margin:0;">
      Tip: Your Professional trial includes unlimited access to all of these. Make the most of it!
    </p>
  `, `${userName}, 3 features most new users miss. Try them today.`);

  const plain = `Hey ${userName}, going deeper

You've been on SpaceNexus for 3 days. Here are 3 features worth trying today:

1. Set Up Price Alerts
   Track space stocks and get notified when they hit your target price.
   ${APP_URL}/alerts

2. Read the Weekly Intelligence Brief
   The most important developments across launches, policy, markets, and contracts.
   ${APP_URL}/intelligence-brief

3. Use the Mission Cost Calculator
   Estimate launch costs across vehicles — Falcon 9, Starship, Electron, and more.
   ${APP_URL}/mission-cost

Explore All Features: ${APP_URL}/dashboard

Tip: Your Professional trial includes unlimited access to all of these. Make the most of it!

SpaceNexus LLC | spacenexus.us`;

  return { html, plain, subject };
}

// ---------------------------------------------------------------------------
// Day 7: "Your first week in numbers"
// ---------------------------------------------------------------------------
function generateTrialWeekOneEmail(params: TrialDripParams): { html: string; plain: string; subject: string } {
  const { userName, stats } = params;
  const subject = 'Your first week in numbers';

  const profilesViewed = stats?.companyProfilesViewed ?? 0;
  const articlesRead = stats?.articlesRead ?? 0;
  const satellitesTracked = stats?.satellitesTracked ?? 0;

  const html = wrapInLayout(subject, `
    <h1 style="color:${styles.textWhite};font-size:22px;margin:0 0 16px;text-align:center;">
      Your First Week in Numbers
    </h1>
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 20px;text-align:center;">
      ${userName}, here&rsquo;s what you accomplished in your first 7 days on SpaceNexus:
    </p>

    <!-- Stats grid -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr>
        <td width="33%" style="padding:8px;text-align:center;">
          <div style="background-color:${styles.bgDark};border-radius:8px;border:1px solid ${styles.borderColor};padding:16px 8px;">
            <div style="color:${styles.accentCyan};font-size:28px;font-weight:bold;line-height:1;">
              ${profilesViewed}
            </div>
            <div style="color:${styles.textMuted};font-size:11px;margin-top:6px;">
              Company Profiles Viewed
            </div>
          </div>
        </td>
        <td width="33%" style="padding:8px;text-align:center;">
          <div style="background-color:${styles.bgDark};border-radius:8px;border:1px solid ${styles.borderColor};padding:16px 8px;">
            <div style="color:${styles.accentCyan};font-size:28px;font-weight:bold;line-height:1;">
              ${articlesRead}
            </div>
            <div style="color:${styles.textMuted};font-size:11px;margin-top:6px;">
              Articles Read
            </div>
          </div>
        </td>
        <td width="33%" style="padding:8px;text-align:center;">
          <div style="background-color:${styles.bgDark};border-radius:8px;border:1px solid ${styles.borderColor};padding:16px 8px;">
            <div style="color:${styles.accentCyan};font-size:28px;font-weight:bold;line-height:1;">
              ${satellitesTracked}
            </div>
            <div style="color:${styles.textMuted};font-size:11px;margin-top:6px;">
              Satellites Tracked
            </div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Engagement badge -->
    <div style="text-align:center;margin:0 0 24px;">
      <span style="display:inline-block;padding:8px 20px;background:linear-gradient(135deg, ${styles.accentNebula}33, ${styles.accentCyan}33);border-radius:20px;border:1px solid ${styles.accentCyan}44;color:${styles.accentCyan};font-size:13px;font-weight:bold;">
        You&rsquo;re in the top 10% of active users
      </span>
    </div>

    <!-- Urgency block -->
    <div style="margin:0 0 24px;padding:16px 20px;background-color:${styles.accentAmber}15;border-radius:8px;border:1px solid ${styles.accentAmber}44;">
      <h3 style="color:${styles.accentAmber};font-size:15px;margin:0 0 8px;">
        7 days left in your trial
      </h3>
      <p style="color:${styles.textLight};font-size:13px;line-height:1.5;margin:0 0 12px;">
        When your trial ends, you&rsquo;ll lose access to:
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0;">
        <tr><td style="padding:3px 0;color:${styles.textLight};font-size:13px;">
          <span style="color:${styles.accentAmber};margin-right:6px;">&times;</span> Unlimited article access
        </td></tr>
        <tr><td style="padding:3px 0;color:${styles.textLight};font-size:13px;">
          <span style="color:${styles.accentAmber};margin-right:6px;">&times;</span> Smart alerts and price notifications
        </td></tr>
        <tr><td style="padding:3px 0;color:${styles.textLight};font-size:13px;">
          <span style="color:${styles.accentAmber};margin-right:6px;">&times;</span> Deal flow and executive moves
        </td></tr>
        <tr><td style="padding:3px 0;color:${styles.textLight};font-size:13px;">
          <span style="color:${styles.accentAmber};margin-right:6px;">&times;</span> Supply chain map and regulatory calendar
        </td></tr>
        <tr><td style="padding:3px 0;color:${styles.textLight};font-size:13px;">
          <span style="color:${styles.accentAmber};margin-right:6px;">&times;</span> Ad-free experience
        </td></tr>
      </table>
    </div>

    ${ctaButton('Upgrade Now to Keep Full Access', `${APP_URL}/pricing`, styles.accentAmber)}

    <p style="color:${styles.textMuted};font-size:12px;text-align:center;margin:0;">
      Pro starts at $19.99/month. Cancel anytime &mdash; no questions asked.
    </p>
  `, `${userName}, your first week recap + 7 days left to upgrade.`);

  const plain = `Your First Week in Numbers

${userName}, here's what you accomplished in your first 7 days on SpaceNexus:

- ${profilesViewed} company profiles viewed
- ${articlesRead} articles read
- ${satellitesTracked} satellites tracked

You're in the top 10% of active users!

---

7 days left in your trial.

When your trial ends, you'll lose access to:
- Unlimited article access
- Smart alerts and price notifications
- Deal flow and executive moves
- Supply chain map and regulatory calendar
- Ad-free experience

Upgrade now to keep full access: ${APP_URL}/pricing

Pro starts at $19.99/month. Cancel anytime.

SpaceNexus LLC | spacenexus.us`;

  return { html, plain, subject };
}

// ---------------------------------------------------------------------------
// Sequence definition
// ---------------------------------------------------------------------------
export const TRIAL_DRIP_SEQUENCE: TrialDripEmail[] = [
  {
    day: 0,
    templateId: 'trial-welcome',
    subject: 'Your space command center is ready',
    generate: generateTrialWelcomeEmail,
  },
  {
    day: 3,
    templateId: 'trial-engagement',
    subject: '3 things you haven\'t tried yet',
    generate: generateTrialEngagementEmail,
  },
  {
    day: 7,
    templateId: 'trial-week-one',
    subject: 'Your first week in numbers',
    generate: generateTrialWeekOneEmail,
  },
];

/**
 * Get the next trial drip email for a user based on days since trial start.
 * Returns null when all emails have been sent.
 */
export function getNextTrialDripEmail(
  daysSinceTrialStart: number,
  sentTemplateIds: string[]
): TrialDripEmail | null {
  for (const email of TRIAL_DRIP_SEQUENCE) {
    if (daysSinceTrialStart >= email.day && !sentTemplateIds.includes(email.templateId)) {
      return email;
    }
  }
  return null;
}
