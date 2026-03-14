// Weekly Digest email template
// Curated weekly roundup of launches, market moves, top stories, and featured blog content
// Dark-themed, table-based HTML for email client compatibility

import {
  wrapInEmailTemplate,
  escapeHtml,
  styles,
  APP_URL,
} from './email-templates';

// --- Types ---

export interface WeeklyLaunch {
  vehicle: string;
  mission: string;
  provider: string;
  date: string;
  outcome?: 'success' | 'failure' | 'partial' | 'upcoming';
}

export interface WeeklyMarketMover {
  ticker: string;
  name: string;
  change: string; // e.g. "+12.4%" or "-3.1%"
  catalyst?: string;
}

export interface WeeklyTopStory {
  title: string;
  summary: string;
  url?: string;
  source?: string;
  category?: string;
}

export interface WeeklyFeaturedArticle {
  title: string;
  excerpt: string;
  slug: string;
  category: string;
  readTime: number;
}

export interface WeeklyStatHighlight {
  label: string;
  value: string;
  context?: string;
}

export interface WeeklyDigestData {
  weekLabel: string;          // e.g. "March 10–14, 2026"
  issueNumber: number;
  editorNote?: string;        // optional short intro paragraph
  launches: WeeklyLaunch[];
  marketMovers: WeeklyMarketMover[];
  topStories: WeeklyTopStory[];
  featuredArticles: WeeklyFeaturedArticle[];
  statHighlights: WeeklyStatHighlight[];
  weekAhead?: string[];       // bullet points for the coming week
}

// --- Colors ---

const DIGEST_ACCENT = '#7c3aed';
const DIGEST_ACCENT_LIGHT = '#a78bfa';
const DIGEST_BG = '#0a0a1a';
const DIGEST_CARD = '#12122a';
const DIGEST_BORDER = '#2a2a4a';
const DIGEST_TEXT = '#ffffff';
const DIGEST_TEXT_MUTED = '#a0a0c0';
const DIGEST_TEXT_DIM = '#707090';
const DIGEST_GREEN = '#22c55e';
const DIGEST_RED = '#ef4444';

// --- Outcome badge ---

function outcomeBadge(outcome?: WeeklyLaunch['outcome']): string {
  if (!outcome) return '';
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    success:  { bg: '#166534', text: '#86efac', label: 'Success' },
    failure:  { bg: '#7f1d1d', text: '#fca5a5', label: 'Failure' },
    partial:  { bg: '#78350f', text: '#fcd34d', label: 'Partial' },
    upcoming: { bg: '#1e3a5f', text: '#93c5fd', label: 'Upcoming' },
  };
  const c = colors[outcome] || colors.upcoming;
  return `<span style="display:inline-block;padding:2px 8px;background-color:${c.bg};color:${c.text};font-size:10px;font-weight:700;text-transform:uppercase;border-radius:3px;margin-left:8px;vertical-align:middle;">${c.label}</span>`;
}

// --- Section renderers ---

function renderHeader(data: WeeklyDigestData): string {
  return `
    <tr>
      <td style="padding:32px 30px;text-align:center;background:linear-gradient(135deg,${DIGEST_BG} 0%,#1a1a2e 100%);border-radius:12px 12px 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <img src="${APP_URL}/spacenexus-logo.png" alt="SpaceNexus" width="160" style="display:block;margin:0 auto 12px auto;">
              <p style="margin:0 0 4px 0;font-size:12px;color:${DIGEST_ACCENT_LIGHT};text-transform:uppercase;letter-spacing:2px;font-weight:600;">
                Weekly Digest &bull; Issue #${data.issueNumber}
              </p>
              <h1 style="margin:8px 0 0 0;font-size:22px;font-weight:600;color:${DIGEST_TEXT};">
                ${escapeHtml(data.weekLabel)}
              </h1>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderEditorNote(note: string): string {
  return `
    <tr>
      <td style="padding:24px 30px;background-color:${DIGEST_CARD};">
        <p style="margin:0;font-size:15px;color:${DIGEST_TEXT_MUTED};line-height:1.7;font-style:italic;">
          ${escapeHtml(note)}
        </p>
      </td>
    </tr>`;
}

function renderStatHighlights(stats: WeeklyStatHighlight[]): string {
  if (stats.length === 0) return '';

  const cells = stats
    .map(
      (s) => `
        <td align="center" style="padding:16px;width:${Math.floor(100 / stats.length)}%;">
          <p style="margin:0 0 4px 0;font-size:24px;font-weight:700;color:${DIGEST_ACCENT_LIGHT};">${escapeHtml(s.value)}</p>
          <p style="margin:0;font-size:12px;color:${DIGEST_TEXT_MUTED};text-transform:uppercase;letter-spacing:1px;">${escapeHtml(s.label)}</p>
          ${s.context ? `<p style="margin:4px 0 0 0;font-size:11px;color:${DIGEST_TEXT_DIM};">${escapeHtml(s.context)}</p>` : ''}
        </td>`
    )
    .join('');

  return `
    <tr>
      <td style="padding:0 30px 8px 30px;background-color:${DIGEST_CARD};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${DIGEST_BORDER};border-radius:8px;overflow:hidden;background-color:${DIGEST_BG};">
          <tr>${cells}</tr>
        </table>
      </td>
    </tr>`;
}

function renderSectionTitle(icon: string, title: string): string {
  return `
    <tr>
      <td style="padding:28px 30px 12px 30px;background-color:${DIGEST_CARD};">
        <h2 style="margin:0;font-size:18px;font-weight:600;color:${DIGEST_ACCENT_LIGHT};">
          <span style="margin-right:8px;">${icon}</span>${escapeHtml(title)}
        </h2>
        <div style="margin-top:8px;height:1px;background-color:${DIGEST_BORDER};"></div>
      </td>
    </tr>`;
}

function renderLaunches(launches: WeeklyLaunch[]): string {
  if (launches.length === 0) return '';

  let html = renderSectionTitle('&#x1F680;', 'Launch Activity');

  for (const l of launches) {
    html += `
    <tr>
      <td style="padding:6px 30px;background-color:${DIGEST_CARD};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid ${DIGEST_BORDER};">
              <p style="margin:0 0 4px 0;font-size:15px;font-weight:500;color:${DIGEST_TEXT};">
                ${escapeHtml(l.vehicle)} &mdash; ${escapeHtml(l.mission)}${outcomeBadge(l.outcome)}
              </p>
              <p style="margin:0;font-size:13px;color:${DIGEST_TEXT_DIM};">
                ${escapeHtml(l.provider)} &bull; ${escapeHtml(l.date)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }

  return html;
}

function renderMarketMovers(movers: WeeklyMarketMover[]): string {
  if (movers.length === 0) return '';

  let html = renderSectionTitle('&#x1F4C8;', 'Market Movers');

  for (const m of movers) {
    const isPositive = m.change.startsWith('+');
    const changeColor = isPositive ? DIGEST_GREEN : DIGEST_RED;

    html += `
    <tr>
      <td style="padding:6px 30px;background-color:${DIGEST_CARD};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid ${DIGEST_BORDER};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:15px;font-weight:500;color:${DIGEST_TEXT};">
                      <span style="color:${DIGEST_TEXT_DIM};font-size:13px;">${escapeHtml(m.ticker)}</span>&nbsp; ${escapeHtml(m.name)}
                    </p>
                  </td>
                  <td align="right" style="white-space:nowrap;">
                    <span style="font-size:15px;font-weight:700;color:${changeColor};">${escapeHtml(m.change)}</span>
                  </td>
                </tr>
                ${m.catalyst ? `<tr><td colspan="2"><p style="margin:4px 0 0 0;font-size:12px;color:${DIGEST_TEXT_DIM};">${escapeHtml(m.catalyst)}</p></td></tr>` : ''}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }

  return html;
}

function renderTopStories(stories: WeeklyTopStory[]): string {
  if (stories.length === 0) return '';

  let html = renderSectionTitle('&#x1F4F0;', 'Top Stories');

  for (const s of stories) {
    html += `
    <tr>
      <td style="padding:6px 30px;background-color:${DIGEST_CARD};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid ${DIGEST_BORDER};">
              <p style="margin:0 0 4px 0;font-size:15px;font-weight:500;color:${DIGEST_TEXT};line-height:1.4;">
                ${s.url ? `<a href="${escapeHtml(s.url)}" style="color:${DIGEST_TEXT};text-decoration:none;">${escapeHtml(s.title)}</a>` : escapeHtml(s.title)}
                ${s.category ? `<span style="display:inline-block;padding:1px 6px;background-color:${DIGEST_BORDER};color:${DIGEST_TEXT_MUTED};font-size:10px;border-radius:3px;margin-left:6px;vertical-align:middle;">${escapeHtml(s.category)}</span>` : ''}
              </p>
              <p style="margin:0;font-size:14px;color:${DIGEST_TEXT_MUTED};line-height:1.5;">${escapeHtml(s.summary)}</p>
              ${s.source ? `<p style="margin:4px 0 0 0;font-size:11px;color:${DIGEST_TEXT_DIM};">${escapeHtml(s.source)}</p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }

  return html;
}

function renderFeaturedArticles(articles: WeeklyFeaturedArticle[]): string {
  if (articles.length === 0) return '';

  let html = renderSectionTitle('&#x2728;', 'From the SpaceNexus Blog');

  for (const a of articles) {
    html += `
    <tr>
      <td style="padding:8px 30px;background-color:${DIGEST_CARD};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:16px;background-color:${DIGEST_BG};border-radius:8px;border:1px solid ${DIGEST_BORDER};">
              <p style="margin:0 0 4px 0;font-size:11px;color:${DIGEST_ACCENT_LIGHT};text-transform:uppercase;letter-spacing:1px;font-weight:600;">
                ${escapeHtml(a.category)} &bull; ${a.readTime} min read
              </p>
              <p style="margin:0 0 8px 0;font-size:16px;font-weight:600;color:${DIGEST_TEXT};line-height:1.4;">
                <a href="${APP_URL}/blog/${escapeHtml(a.slug)}" style="color:${DIGEST_TEXT};text-decoration:none;">
                  ${escapeHtml(a.title)}
                </a>
              </p>
              <p style="margin:0 0 12px 0;font-size:14px;color:${DIGEST_TEXT_MUTED};line-height:1.5;">${escapeHtml(a.excerpt)}</p>
              <a href="${APP_URL}/blog/${escapeHtml(a.slug)}" style="font-size:13px;font-weight:600;color:${DIGEST_ACCENT_LIGHT};text-decoration:none;">
                Read full article &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }

  return html;
}

function renderWeekAhead(items: string[]): string {
  if (items.length === 0) return '';

  let html = renderSectionTitle('&#x1F4C5;', 'The Week Ahead');

  html += `
    <tr>
      <td style="padding:8px 30px 20px 30px;background-color:${DIGEST_CARD};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">`;

  for (const item of items) {
    html += `
          <tr>
            <td style="padding:6px 0;font-size:14px;color:${DIGEST_TEXT_MUTED};line-height:1.5;">
              &#x2022;&nbsp; ${escapeHtml(item)}
            </td>
          </tr>`;
  }

  html += `
        </table>
      </td>
    </tr>`;

  return html;
}

function renderCTA(): string {
  return `
    <tr>
      <td style="padding:30px;background-color:${DIGEST_CARD};text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            <td style="background:linear-gradient(135deg,${DIGEST_ACCENT} 0%,#6d28d9 100%);border-radius:8px;padding:14px 32px;">
              <a href="${APP_URL}/mission-control" style="color:#fff;text-decoration:none;font-weight:600;font-size:15px;">
                Open SpaceNexus Dashboard
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderFooter(): string {
  return `
    <tr>
      <td style="padding:30px;background-color:${DIGEST_CARD};border-radius:0 0 12px 12px;border-top:1px solid ${DIGEST_BORDER};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <img src="${APP_URL}/spacenexus-logo.png" alt="SpaceNexus" width="100" style="display:block;opacity:0.6;margin:0 auto 12px auto;">
              <p style="margin:0 0 8px 0;font-size:12px;color:${DIGEST_TEXT_DIM};">
                SpaceNexus Weekly Digest &mdash; Your space industry intelligence briefing
              </p>
              <p style="margin:0 0 8px 0;font-size:11px;color:${DIGEST_TEXT_DIM};">
                <a href="https://www.linkedin.com/company/spacenexus-llc" style="color:${DIGEST_TEXT_DIM};text-decoration:underline;">LinkedIn</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="${APP_URL}/blog" style="color:${DIGEST_TEXT_DIM};text-decoration:underline;">Blog</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="${APP_URL}" style="color:${DIGEST_TEXT_DIM};text-decoration:underline;">Website</a>
              </p>
              <p style="margin:0;font-size:11px;color:${DIGEST_TEXT_DIM};">
                <a href="{{UNSUBSCRIBE_URL}}" style="color:${DIGEST_TEXT_DIM};text-decoration:underline;">Unsubscribe</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="${APP_URL}/settings/notifications" style="color:${DIGEST_TEXT_DIM};text-decoration:underline;">Email preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// --- Public API ---

export function generateWeeklyDigestEmail(data: WeeklyDigestData): string {
  let body = '';

  body += renderHeader(data);

  if (data.editorNote) {
    body += renderEditorNote(data.editorNote);
  }

  if (data.statHighlights.length > 0) {
    body += renderStatHighlights(data.statHighlights);
  }

  body += renderLaunches(data.launches);
  body += renderMarketMovers(data.marketMovers);
  body += renderTopStories(data.topStories);
  body += renderFeaturedArticles(data.featuredArticles);

  if (data.weekAhead && data.weekAhead.length > 0) {
    body += renderWeekAhead(data.weekAhead);
  }

  body += renderCTA();
  body += renderFooter();

  return wrapInEmailTemplate(
    body,
    `SpaceNexus Weekly Digest #${data.issueNumber} - ${data.weekLabel}`
  );
}

export function generateWeeklyDigestPlainText(data: WeeklyDigestData): string {
  let text = `SPACENEXUS WEEKLY DIGEST - Issue #${data.issueNumber}\n`;
  text += `${data.weekLabel}\n`;
  text += '='.repeat(50) + '\n\n';

  if (data.editorNote) {
    text += `${data.editorNote}\n\n`;
  }

  // Stat highlights
  if (data.statHighlights.length > 0) {
    text += '--- BY THE NUMBERS ---\n';
    for (const s of data.statHighlights) {
      text += `  ${s.value} - ${s.label}`;
      if (s.context) text += ` (${s.context})`;
      text += '\n';
    }
    text += '\n';
  }

  // Launches
  if (data.launches.length > 0) {
    text += '--- LAUNCH ACTIVITY ---\n';
    for (const l of data.launches) {
      text += `  * ${l.vehicle} - ${l.mission}`;
      if (l.outcome) text += ` [${l.outcome.toUpperCase()}]`;
      text += `\n    ${l.provider} | ${l.date}\n`;
    }
    text += '\n';
  }

  // Market movers
  if (data.marketMovers.length > 0) {
    text += '--- MARKET MOVERS ---\n';
    for (const m of data.marketMovers) {
      text += `  * ${m.ticker} ${m.name}: ${m.change}`;
      if (m.catalyst) text += ` - ${m.catalyst}`;
      text += '\n';
    }
    text += '\n';
  }

  // Top stories
  if (data.topStories.length > 0) {
    text += '--- TOP STORIES ---\n';
    for (const s of data.topStories) {
      text += `  * ${s.title}\n`;
      text += `    ${s.summary}\n`;
      if (s.source) text += `    Source: ${s.source}\n`;
      if (s.url) text += `    Read more: ${s.url}\n`;
      text += '\n';
    }
  }

  // Featured articles
  if (data.featuredArticles.length > 0) {
    text += '--- FROM THE SPACENEXUS BLOG ---\n';
    for (const a of data.featuredArticles) {
      text += `  * ${a.title} (${a.category}, ${a.readTime} min read)\n`;
      text += `    ${a.excerpt}\n`;
      text += `    Read: ${APP_URL}/blog/${a.slug}\n\n`;
    }
  }

  // Week ahead
  if (data.weekAhead && data.weekAhead.length > 0) {
    text += '--- THE WEEK AHEAD ---\n';
    for (const item of data.weekAhead) {
      text += `  * ${item}\n`;
    }
    text += '\n';
  }

  text += '---\n';
  text += `Open SpaceNexus Dashboard: ${APP_URL}/mission-control\n`;
  text += `Unsubscribe: {{UNSUBSCRIBE_URL}}\n`;
  text += `Email preferences: ${APP_URL}/settings/notifications\n`;

  return text;
}
