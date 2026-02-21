// Weekly Intelligence Brief email template
// Dark-themed, table-based HTML for email client compatibility

import {
  wrapInEmailTemplate,
  escapeHtml,
  styles,
  APP_URL,
} from './email-templates';

export interface BriefItem {
  title: string;
  summary: string;
  source?: string;
  url?: string;
}

export interface BriefSection {
  id: string;
  title: string;
  items: BriefItem[];
  isPro: boolean;
}

// Section icons (emoji-based for email compatibility)
const SECTION_ICONS: Record<string, string> = {
  'executive-summary': '&#x1F4CA;',   // chart
  'top-stories': '&#x1F4F0;',         // newspaper
  'contract-awards': '&#x1F3C6;',     // trophy
  'launch-activity': '&#x1F680;',     // rocket
  'funding-ma': '&#x1F4B0;',          // money bag
  'regulatory-updates': '&#x2696;',   // scales
  'market-movers': '&#x1F4C8;',       // chart increasing
  'week-ahead': '&#x1F4C5;',          // calendar
};

// Brief-specific accent color (cyan)
const BRIEF_ACCENT = '#06b6d4';
const BRIEF_ACCENT_DARK = '#0891b2';
const BRIEF_BG = '#0f172a';
const BRIEF_CARD = '#1e293b';
const BRIEF_BORDER = '#334155';
const BRIEF_TEXT = '#f1f5f9';
const BRIEF_TEXT_MUTED = '#94a3b8';
const BRIEF_TEXT_DIM = '#64748b';

function renderSectionHeader(section: BriefSection): string {
  const icon = SECTION_ICONS[section.id] || '&#x2022;';
  const proLabel = section.isPro
    ? `<span style="display:inline-block;padding:2px 8px;background-color:#7c3aed;color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;border-radius:3px;margin-left:8px;vertical-align:middle;">PRO</span>`
    : '';

  return `
    <tr>
      <td style="padding:24px 30px 12px 30px;background-color:${BRIEF_CARD};">
        <h2 style="margin:0;font-size:18px;font-weight:600;color:${BRIEF_ACCENT};">
          <span style="margin-right:8px;">${icon}</span>
          ${escapeHtml(section.title)}${proLabel}
        </h2>
      </td>
    </tr>`;
}

function renderSectionItems(items: BriefItem[]): string {
  return items
    .map(
      (item) => `
    <tr>
      <td style="padding:8px 30px;background-color:${BRIEF_CARD};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid ${BRIEF_BORDER};">
              <p style="margin:0 0 6px 0;font-size:15px;font-weight:500;color:${BRIEF_TEXT};line-height:1.4;">
                ${item.url ? `<a href="${escapeHtml(item.url)}" style="color:${BRIEF_TEXT};text-decoration:none;">${escapeHtml(item.title)}</a>` : escapeHtml(item.title)}
              </p>
              <p style="margin:0;font-size:14px;color:${BRIEF_TEXT_MUTED};line-height:1.6;">
                ${escapeHtml(item.summary)}
              </p>
              ${item.source ? `<p style="margin:6px 0 0 0;font-size:12px;color:${BRIEF_TEXT_DIM};">${escapeHtml(item.source)}</p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    )
    .join('');
}

function renderLockedSection(section: BriefSection): string {
  // Show a blurred/locked preview for free users viewing pro sections
  const firstItem = section.items[0];
  return `
    <tr>
      <td style="padding:8px 30px 20px 30px;background-color:${BRIEF_CARD};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:16px;background-color:${BRIEF_BG};border-radius:8px;border:1px dashed ${BRIEF_BORDER};text-align:center;">
              ${firstItem ? `<p style="margin:0 0 12px 0;font-size:14px;color:${BRIEF_TEXT_DIM};line-height:1.5;filter:blur(0);-webkit-filter:blur(0);">${escapeHtml(firstItem.title.substring(0, 40))}...</p>` : ''}
              <p style="margin:0 0 4px 0;font-size:13px;color:${BRIEF_TEXT_DIM};">
                ${section.items.length} item${section.items.length !== 1 ? 's' : ''} available for Pro subscribers
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px auto 0 auto;">
                <tr>
                  <td style="background-color:${BRIEF_ACCENT};border-radius:6px;padding:10px 24px;">
                    <a href="${APP_URL}/pricing" style="color:${BRIEF_BG};text-decoration:none;font-weight:600;font-size:13px;">
                      Upgrade to Pro
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function generateIntelligenceBriefEmail(
  sections: BriefSection[],
  isPro: boolean,
  weekLabel: string
): string {
  let sectionsHtml = '';

  for (const section of sections) {
    sectionsHtml += renderSectionHeader(section);

    if (section.isPro && !isPro) {
      // Free user viewing a pro section -- show locked preview
      sectionsHtml += renderLockedSection(section);
    } else {
      // Show full content
      sectionsHtml += renderSectionItems(section.items);
      // Add bottom padding after items
      sectionsHtml += `
        <tr>
          <td style="padding:0 30px 16px 30px;background-color:${BRIEF_CARD};"></td>
        </tr>`;
    }
  }

  const content = `
    <!-- Header -->
    <tr>
      <td style="padding:32px 30px;text-align:center;background:linear-gradient(135deg,${BRIEF_BG} 0%,#1a1a2e 100%);border-radius:12px 12px 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <img src="${APP_URL}/spacenexus-logo.png" alt="SpaceNexus" width="160" style="display:block;margin:0 auto 12px auto;">
              <p style="margin:0 0 4px 0;font-size:12px;color:${BRIEF_ACCENT};text-transform:uppercase;letter-spacing:2px;font-weight:600;">
                Weekly Intelligence Brief
              </p>
              <h1 style="margin:8px 0 0 0;font-size:22px;font-weight:600;color:${BRIEF_TEXT};">
                ${escapeHtml(weekLabel)}
              </h1>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Sections -->
    ${sectionsHtml}

    <!-- CTA -->
    <tr>
      <td style="padding:30px;background-color:${BRIEF_CARD};text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            <td style="background:linear-gradient(135deg,${BRIEF_ACCENT} 0%,${BRIEF_ACCENT_DARK} 100%);border-radius:8px;padding:14px 32px;">
              <a href="${APP_URL}/mission-control" style="color:#fff;text-decoration:none;font-weight:600;font-size:15px;">
                Visit SpaceNexus Dashboard
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:30px;background-color:${BRIEF_CARD};border-radius:0 0 12px 12px;border-top:1px solid ${BRIEF_BORDER};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <img src="${APP_URL}/spacenexus-logo.png" alt="SpaceNexus" width="100" style="display:block;opacity:0.6;margin:0 auto 12px auto;">
              <p style="margin:0 0 8px 0;font-size:12px;color:${BRIEF_TEXT_DIM};">
                SpaceNexus - Your gateway to the space industry
              </p>
              <p style="margin:0 0 8px 0;font-size:11px;color:${BRIEF_TEXT_DIM};">
                <a href="https://www.linkedin.com/company/spacenexus-llc" style="color:${BRIEF_TEXT_DIM};text-decoration:underline;">LinkedIn</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="${APP_URL}" style="color:${BRIEF_TEXT_DIM};text-decoration:underline;">Website</a>
              </p>
              <p style="margin:0;font-size:11px;color:${BRIEF_TEXT_DIM};">
                <a href="{{UNSUBSCRIBE_URL}}" style="color:${BRIEF_TEXT_DIM};text-decoration:underline;">Unsubscribe</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="${APP_URL}/settings/notifications" style="color:${BRIEF_TEXT_DIM};text-decoration:underline;">Email preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  return wrapInEmailTemplate(content, `SpaceNexus Weekly Intelligence Brief - ${weekLabel}`);
}

export function generateIntelligenceBriefPlainText(
  sections: BriefSection[],
  isPro: boolean,
  weekLabel: string
): string {
  let text = `SPACENEXUS WEEKLY INTELLIGENCE BRIEF\n${weekLabel}\n\n`;

  for (const section of sections) {
    if (section.isPro && !isPro) {
      text += `--- ${section.title.toUpperCase()} [PRO] ---\n`;
      text += `${section.items.length} items available for Pro subscribers.\n`;
      text += `Upgrade: ${APP_URL}/pricing\n\n`;
    } else {
      text += `--- ${section.title.toUpperCase()} ---\n`;
      for (const item of section.items) {
        text += `* ${item.title}\n`;
        text += `  ${item.summary}\n`;
        if (item.source) text += `  Source: ${item.source}\n`;
        if (item.url) text += `  Read more: ${item.url}\n`;
        text += '\n';
      }
    }
  }

  text += `---\nVisit SpaceNexus: ${APP_URL}\n`;
  text += `Unsubscribe: {{UNSUBSCRIBE_URL}}\n`;

  return text;
}
