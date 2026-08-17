import { getRecentDocketActivity, regulationsGovDocketUrl, type DocketSnapshotRecord } from '@/lib/docket-intel';
import { RADAR_CATEGORY_LABELS, type RadarCategory } from '@/lib/regulatory-categorizer';
import { daysUntil, getClosingCommentWindows, getRadarTimeline, type RadarEntry } from '@/lib/regulatory-radar';

/**
 * Weekly "Regulatory Radar" brief — generated entirely from the
 * RegulatoryAction table (congressional actions, Federal Register documents,
 * agency actions). No AI calls; deterministic and free to run. Modeled on
 * src/lib/weekly-economy-report.ts.
 *
 * Composition is a pure function (composeRegulatoryBrief) over collected
 * data so tests never need a database.
 */

export interface WeeklyRegulatoryBrief {
  title: string;
  slug: string;
  summary: string;
  content: string; // GFM markdown, rendered by /ai-insights/[slug]
}

export interface RegulatoryBriefData {
  /** Actions in the trailing 7-day window, reverse-chron. */
  weekActions: RadarEntry[];
  /** Comment windows closing in the next 14 days, soonest first. */
  closingWindows: RadarEntry[];
  /**
   * Docket comment activity from Regulations.gov snapshots (busiest first).
   * Optional — empty/absent when REGULATIONS_GOV_API_KEY isn't configured or
   * the DocketSnapshot table doesn't exist yet.
   */
  docketActivity?: DocketSnapshotRecord[];
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Query the radar for the brief's inputs. Fails soft to empty lists. */
export async function collectRegulatoryBriefData(now = new Date()): Promise<RegulatoryBriefData> {
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [weekActions, closingWindows, docketActivity] = await Promise.all([
    getRadarTimeline({ since: weekAgo, limit: 200 }),
    getClosingCommentWindows(14, now),
    getRecentDocketActivity(7, 5, now),
  ]);
  return { weekActions, closingWindows, docketActivity };
}

/**
 * Pure — composes the brief markdown from already-collected data. Returns
 * null when there is nothing to report (no actions this week AND no closing
 * comment windows) — the cron skips publishing rather than shipping an
 * empty brief.
 */
export function composeRegulatoryBrief(data: RegulatoryBriefData, now = new Date()): WeeklyRegulatoryBrief | null {
  const { weekActions, closingWindows } = data;
  if (weekActions.length === 0 && closingWindows.length === 0) return null;

  const weekOf = fmtDate(now);
  const slug = `regulatory-radar-week-of-${weekOf}`;
  const title = `Regulatory Radar — Week of ${weekOf}`;

  const congressional = weekActions.filter((a) => a.source === 'congress');
  const federalRegister = weekActions.filter((a) => a.source === 'federal-register');
  const rules = federalRegister.filter((a) => (a.documentType || '').toLowerCase() === 'rule');
  const proposedRules = federalRegister.filter((a) => (a.documentType || '').toLowerCase() === 'proposed rule');
  const notices = federalRegister.filter(
    (a) => !['rule', 'proposed rule'].includes((a.documentType || '').toLowerCase())
  );
  const significant = weekActions.filter((a) => a.significant);
  const enforcement = weekActions.filter((a) => a.category === 'enforcement');

  const byCategory = new Map<RadarCategory, RadarEntry[]>();
  for (const a of federalRegister) {
    if (a.category === 'enforcement') continue; // has its own section above
    const list = byCategory.get(a.category) || [];
    list.push(a);
    byCategory.set(a.category, list);
  }

  const lines: string[] = [];
  lines.push(
    `*A weekly digest of congressional actions, Federal Register publications, and agency actions relevant to the space industry, generated from SpaceNexus Regulatory Radar tracking over the seven days ending ${weekOf}.*`
  );
  lines.push('');

  lines.push('## The week in numbers');
  lines.push('');
  lines.push('| Metric | This week |');
  lines.push('| --- | --- |');
  lines.push(`| Regulatory actions tracked | ${weekActions.length} |`);
  lines.push(`| Congressional actions | ${congressional.length} |`);
  lines.push(`| Final rules | ${rules.length} |`);
  lines.push(`| Proposed rules | ${proposedRules.length} |`);
  lines.push(`| Notices & other documents | ${notices.length} |`);
  lines.push(`| Enforcement actions | ${enforcement.length} |`);
  lines.push(`| Comment windows closing in 14 days | ${closingWindows.length} |`);
  lines.push('');

  if (enforcement.length > 0) {
    lines.push('## Enforcement watch');
    lines.push('');
    lines.push('Penalties, denial orders, debarments, and settlements published this week:');
    lines.push('');
    for (const e of enforcement.slice(0, 8)) {
      // Penalty amounts, when parseable from the source document, are already
      // prefixed onto the summary by the fetcher ("Penalty: $X.").
      const penalty = e.summary?.match(/^Penalty: (.+?)\.(?:\s|$)/)?.[1];
      const detail = penalty ? ` — **${penalty}**` : '';
      lines.push(`- [${e.title}](${e.url}) — ${e.agency || 'Federal Register'}${detail} (${fmtDate(e.actionDate)})`);
    }
    if (enforcement.length > 8) {
      lines.push(`- …and ${enforcement.length - 8} more on the [Radar](/regulatory-radar?category=enforcement)`);
    }
    lines.push('');
  }

  if (closingWindows.length > 0) {
    lines.push('## Action windows closing soon');
    lines.push('');
    lines.push('Open comment periods are the single most actionable item on the radar — closing soonest first:');
    lines.push('');
    for (const w of closingWindows.slice(0, 8)) {
      const days = w.commentCloseDate ? daysUntil(w.commentCloseDate, now) : null;
      const closes = w.commentCloseDate
        ? `closes ${fmtDate(w.commentCloseDate)}${days !== null ? ` (${days} day${days === 1 ? '' : 's'})` : ''}`
        : 'closing soon';
      lines.push(`- [${w.title}](${w.url}) — ${w.agency || 'Federal Register'} — **${closes}**`);
    }
    lines.push('');
  }

  const docketActivity = data.docketActivity || [];
  if (docketActivity.length > 0) {
    lines.push('## Docket activity');
    lines.push('');
    lines.push('Public-comment activity on open dockets tracked by the Radar, from Regulations.gov:');
    lines.push('');
    for (const d of docketActivity) {
      const orgNames = d.organizations.slice(0, 3).map((o) => o.name);
      const incl = orgNames.length > 0 ? ` incl. ${orgNames.join(', ')}` : '';
      lines.push(
        `- [Docket ${d.docketId}](${regulationsGovDocketUrl(d.docketId)}): ${d.commentCount} comment${d.commentCount === 1 ? '' : 's'}${incl}`
      );
    }
    lines.push('');
    lines.push('*Organization names as filed with public comments; individual commenters are not listed.*');
    lines.push('');
  }

  if (significant.length > 0) {
    lines.push('## Significant rules');
    lines.push('');
    for (const s of significant.slice(0, 6)) {
      lines.push(`- [${s.title}](${s.url}) — ${s.agency || s.source} (${fmtDate(s.actionDate)})`);
    }
    lines.push('');
  }

  if (congressional.length > 0) {
    lines.push('## On the Hill');
    lines.push('');
    for (const c of congressional.slice(0, 10)) {
      const action = c.actionText ? ` — ${c.actionText}` : '';
      lines.push(`- [${c.title}](${c.url})${action} (${fmtDate(c.actionDate)})`);
    }
    lines.push('');
  }

  if (byCategory.size > 0) {
    lines.push('## Federal Register activity by category');
    lines.push('');
    const sorted = Array.from(byCategory.entries()).sort((a, b) => b[1].length - a[1].length);
    for (const [category, actions] of sorted) {
      lines.push(`### ${RADAR_CATEGORY_LABELS[category]} (${actions.length})`);
      lines.push('');
      for (const a of actions.slice(0, 5)) {
        const kind = a.documentType ? ` — *${a.documentType}*` : '';
        lines.push(`- [${a.title}](${a.url})${kind} (${fmtDate(a.actionDate)})`);
      }
      if (actions.length > 5) {
        lines.push(`- …and ${actions.length - 5} more`);
      }
      lines.push('');
    }
  }

  lines.push('## Go deeper');
  lines.push('');
  lines.push('- [Regulatory Radar — full timeline](/regulatory-radar)');
  lines.push('- [Compliance & Regulatory Hub](/compliance)');
  lines.push('- [Regulatory Calendar](/regulatory-calendar)');
  lines.push('');
  lines.push('*This brief is generated automatically every week from SpaceNexus Regulatory Radar tracking. It is regulatory information, not legal advice.*');

  const summary = `Space regulatory week of ${weekOf}: ${weekActions.length} tracked actions — ${congressional.length} congressional, ${rules.length} final rules, ${proposedRules.length} proposed rules, ${closingWindows.length} comment windows closing within 14 days.`;

  return { title, slug, summary, content: lines.join('\n') };
}

/** Collect + compose. Null when there is nothing to report this week. */
export async function buildWeeklyRegulatoryBrief(now = new Date()): Promise<WeeklyRegulatoryBrief | null> {
  const data = await collectRegulatoryBriefData(now);
  return composeRegulatoryBrief(data, now);
}
