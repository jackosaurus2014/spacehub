// Marketing email templates for launch campaigns
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

/**
 * Email 1: Launch Day Announcement
 */
export function generateLaunchAnnouncementEmail(): { html: string; plain: string; subject: string } {
  const subject = 'SpaceNexus is live — space industry intelligence for everyone';

  const html = wrapInLayout(subject, `
    <h1 style="color:${styles.textWhite};font-size:24px;margin:0 0 16px;text-align:center;">
      SpaceNexus is Live
    </h1>
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 16px;">
      The space industry's most comprehensive intelligence platform is now available.
      Everything you need to track launches, analyze markets, monitor satellites, and
      discover business opportunities — in one place.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td style="padding:12px;background-color:${styles.bgDark};border-radius:8px;border:1px solid ${styles.borderColor};">
          <p style="color:${styles.accentCyan};font-weight:bold;margin:0 0 8px;font-size:14px;">What you get for free:</p>
          <ul style="color:${styles.textLight};font-size:13px;line-height:1.8;margin:0;padding-left:20px;">
            <li>Real-time launch tracking with countdowns</li>
            <li>Space news from 50+ curated sources</li>
            <li>Satellite tracker (19,000+ objects)</li>
            <li>200+ space company directory</li>
            <li>Space weather monitoring</li>
            <li>Mission Control dashboard</li>
          </ul>
        </td>
      </tr>
    </table>
    ${ctaButton('Get Started Free', `${APP_URL}/register`)}
    <p style="color:${styles.textMuted};font-size:12px;text-align:center;margin:0;">
      No credit card required. Upgrade to Pro anytime for AI insights and advanced analytics.
    </p>
  `);

  const plain = `SpaceNexus is Live

The space industry's most comprehensive intelligence platform is now available.

What you get for free:
- Real-time launch tracking with countdowns
- Space news from 50+ curated sources
- Satellite tracker (19,000+ objects)
- 200+ space company directory
- Space weather monitoring
- Mission Control dashboard

Get started free: ${APP_URL}/register

No credit card required.

SpaceNexus LLC | spacenexus.us`;

  return { html, plain, subject };
}

/**
 * Email 2: Feature Highlight (Day 3)
 */
export function generateFeatureHighlightEmail(): { html: string; plain: string; subject: string } {
  const subject = '10 modules, 200+ companies, real-time data — a tour of SpaceNexus';

  const modules = [
    { name: 'Mission Control', desc: 'Real-time dashboard with launches, markets, and news', icon: '🎯' },
    { name: 'Market Intelligence', desc: 'Space stocks, ETFs, funding rounds, and M&A', icon: '📊' },
    { name: 'Satellite Tracker', desc: '19,000+ objects on interactive 3D globe', icon: '🛰️' },
    { name: 'Company Profiles', desc: '200+ companies with financials and analysis', icon: '🏢' },
    { name: 'Procurement Intel', desc: 'Government contracts from SAM.gov and SBIR', icon: '📋' },
  ];

  const moduleRows = modules.map(m => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid ${styles.borderColor};">
        <span style="font-size:18px;margin-right:8px;">${m.icon}</span>
        <strong style="color:${styles.textWhite};font-size:14px;">${m.name}</strong>
        <br><span style="color:${styles.textMuted};font-size:12px;">${m.desc}</span>
      </td>
    </tr>
  `).join('');

  const html = wrapInLayout(subject, `
    <h1 style="color:${styles.textWhite};font-size:22px;margin:0 0 16px;text-align:center;">
      10 Modules of Space Intelligence
    </h1>
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 20px;">
      SpaceNexus isn't just a news feed or a satellite tracker. It's a complete intelligence
      platform with 10 integrated modules. Here's a look at five of them:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${styles.bgDark};border-radius:8px;border:1px solid ${styles.borderColor};margin-bottom:20px;">
      ${moduleRows}
    </table>
    <p style="color:${styles.textLight};font-size:14px;line-height:1.6;margin:0 0 4px;">
      Plus: Space Talent Hub, Regulatory Compliance, Mission Planning, Space Environment, and Solar System Exploration.
    </p>
    ${ctaButton('Explore All Modules', `${APP_URL}/mission-control`)}
  `);

  const plain = `10 Modules of Space Intelligence

SpaceNexus isn't just a news feed or a satellite tracker. It's a complete intelligence platform with 10 integrated modules:

1. Mission Control — Real-time dashboard
2. Market Intelligence — Space stocks, ETFs, funding
3. Satellite Tracker — 19,000+ objects on 3D globe
4. Company Profiles — 200+ companies with financials
5. Procurement Intel — Government contracts from SAM.gov

Plus 5 more modules covering talent, compliance, mission planning, space weather, and solar exploration.

Explore all modules: ${APP_URL}/mission-control

SpaceNexus LLC | spacenexus.us`;

  return { html, plain, subject };
}

/**
 * Email 3: Mobile App Announcement
 */
export function generateMobileAppEmail(): { html: string; plain: string; subject: string } {
  const subject = 'SpaceNexus is now on Android & iOS — space intelligence in your pocket';

  const html = wrapInLayout(subject, `
    <h1 style="color:${styles.textWhite};font-size:22px;margin:0 0 16px;text-align:center;">
      SpaceNexus Goes Mobile
    </h1>
    <p style="color:${styles.textLight};font-size:15px;line-height:1.6;margin:0 0 20px;">
      Everything you use on spacenexus.us — launch tracking, satellite monitoring, company profiles,
      AI insights, and more — is now available as a native mobile app with exclusive features.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr><td style="padding:12px;background-color:${styles.bgDark};border-radius:8px;border:1px solid ${styles.borderColor};">
        <p style="color:${styles.accentCyan};font-weight:bold;margin:0 0 8px;font-size:14px;">Mobile-only features:</p>
        <ul style="color:${styles.textLight};font-size:13px;line-height:1.8;margin:0;padding-left:20px;">
          <li><strong>Push Notifications</strong> — Get alerted for launches, market moves, and breaking news</li>
          <li><strong>Face ID / Touch ID</strong> — Secure biometric authentication</li>
          <li><strong>Offline Access</strong> — View cached data without internet</li>
          <li><strong>Native Share</strong> — Share insights directly to any app</li>
        </ul>
      </td></tr>
    </table>
    <p style="color:${styles.textLight};font-size:14px;text-align:center;margin:0 0 4px;">
      Already a subscriber? Your account works on mobile too — just sign in.
    </p>
    ${ctaButton('Download on Google Play', 'https://play.google.com/store/apps/details?id=com.spacenexus.app')}
    <p style="color:${styles.textMuted};font-size:12px;text-align:center;margin:0;">
      Also available on the Apple App Store.
    </p>
  `);

  const plain = `SpaceNexus Goes Mobile

Everything you use on spacenexus.us is now available as a native mobile app with exclusive features:

- Push Notifications — Get alerted for launches, market moves, and breaking news
- Face ID / Touch ID — Secure biometric authentication
- Offline Access — View cached data without internet
- Native Share — Share insights directly to any app

Already a subscriber? Your account works on mobile too — just sign in.

Download on Google Play: https://play.google.com/store/apps/details?id=com.spacenexus.app
Also available on the Apple App Store.

SpaceNexus LLC | spacenexus.us`;

  return { html, plain, subject };
}

/**
 * Weekly Newsletter Template ("Space Intel Brief")
 */
export function generateWeeklyNewsletterEmail(data: {
  headline: { title: string; summary: string; url: string };
  launches: Array<{ name: string; date: string; provider: string }>;
  marketHighlight: string;
  companySpotlight: { name: string; description: string; slug: string };
  blogPost?: { title: string; url: string };
}): { html: string; plain: string; subject: string } {
  const subject = `Space Intel Brief — ${data.headline.title.substring(0, 60)}`;

  const launchRows = data.launches.slice(0, 3).map(l => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid ${styles.borderColor};color:${styles.textLight};font-size:13px;">
        <strong style="color:${styles.textWhite};">${l.name}</strong><br>
        <span style="color:${styles.textMuted};">${l.provider} &bull; ${l.date}</span>
      </td>
    </tr>
  `).join('');

  const html = wrapInLayout(subject, `
    <h1 style="color:${styles.textWhite};font-size:20px;margin:0 0 6px;">Space Intel Brief</h1>
    <p style="color:${styles.textMuted};font-size:12px;margin:0 0 20px;">Your weekly space industry intelligence digest</p>

    <!-- Headline -->
    <div style="margin-bottom:20px;">
      <h2 style="color:${styles.accentCyan};font-size:16px;margin:0 0 8px;">This Week's Headline</h2>
      <p style="color:${styles.textLight};font-size:14px;line-height:1.5;margin:0 0 8px;">${data.headline.summary}</p>
      <a href="${data.headline.url}" style="color:${styles.accentCyan};font-size:13px;">Read more &rarr;</a>
    </div>

    <!-- Launches -->
    <div style="margin-bottom:20px;padding:16px;background-color:${styles.bgDark};border-radius:8px;border:1px solid ${styles.borderColor};">
      <h3 style="color:${styles.textWhite};font-size:14px;margin:0 0 12px;">🚀 Launch Watch</h3>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${launchRows}
      </table>
      <a href="${APP_URL}/launch" style="color:${styles.accentCyan};font-size:12px;display:block;margin-top:8px;">View all launches &rarr;</a>
    </div>

    <!-- Market -->
    <div style="margin-bottom:20px;">
      <h3 style="color:${styles.textWhite};font-size:14px;margin:0 0 8px;">📊 Market Moves</h3>
      <p style="color:${styles.textLight};font-size:13px;line-height:1.5;margin:0;">${data.marketHighlight}</p>
    </div>

    <!-- Company Spotlight -->
    <div style="margin-bottom:20px;padding:16px;background-color:${styles.bgDark};border-radius:8px;border:1px solid ${styles.borderColor};">
      <h3 style="color:${styles.textWhite};font-size:14px;margin:0 0 8px;">🏢 Company Spotlight: ${data.companySpotlight.name}</h3>
      <p style="color:${styles.textLight};font-size:13px;line-height:1.5;margin:0 0 8px;">${data.companySpotlight.description}</p>
      <a href="${APP_URL}/company-profiles/${data.companySpotlight.slug}" style="color:${styles.accentCyan};font-size:12px;">View full profile &rarr;</a>
    </div>

    ${data.blogPost ? `
    <div style="margin-bottom:16px;">
      <h3 style="color:${styles.textWhite};font-size:14px;margin:0 0 8px;">📝 From the Blog</h3>
      <a href="${data.blogPost.url}" style="color:${styles.accentCyan};font-size:13px;">${data.blogPost.title} &rarr;</a>
    </div>
    ` : ''}

    ${ctaButton('Open SpaceNexus', APP_URL)}
  `);

  const plain = `Space Intel Brief

THIS WEEK'S HEADLINE
${data.headline.summary}
Read more: ${data.headline.url}

LAUNCH WATCH
${data.launches.map(l => `- ${l.name} (${l.provider}, ${l.date})`).join('\n')}
View all: ${APP_URL}/launch

MARKET MOVES
${data.marketHighlight}

COMPANY SPOTLIGHT: ${data.companySpotlight.name}
${data.companySpotlight.description}
Profile: ${APP_URL}/company-profiles/${data.companySpotlight.slug}

${data.blogPost ? `FROM THE BLOG\n${data.blogPost.title}: ${data.blogPost.url}\n` : ''}
Open SpaceNexus: ${APP_URL}

SpaceNexus LLC | spacenexus.us`;

  return { html, plain, subject };
}
