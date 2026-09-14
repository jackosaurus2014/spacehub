/**
 * The SpaceNexus Desk — the standing byline on machine-drafted analysis
 * (competitor review 2026-09-10, Tier 2 #7: "Named voices").
 *
 * WHY A BYLINE AT ALL
 * -------------------
 * Every serious competitor is a person: Berger at Ars, Payload's reporters,
 * SpaceNews's beat writers. Our analysis had no name on it at all, which
 * reads as "who is this?" rather than as a masthead. A consistent byline
 * with a stated standing view and a published method fixes the trust gap.
 *
 * WHAT THE BYLINE MUST NOT DO
 * ---------------------------
 * It must never imply a human wrote the piece. "SpaceNexus Desk" is the
 * name of a PROCESS, not a person, and every surface that shows it also
 * shows DESK_DISCLOSURE_SHORT and links to DESK_ABOUT_HREF, where the
 * pipeline, the review rule and the correction route are spelled out. No
 * portrait, no first-person "I", no @type: Person in structured data.
 */

/** The name that appears on every insight. Never a person's name. */
export const DESK_BYLINE = 'SpaceNexus Desk';

/** Sub-line under the byline (mirrors blog-content.ts's authorRole slot). */
export const DESK_ROLE = 'AI-drafted analysis, fact-checked before it publishes';

/** Canonical about page for the desk. Linked from every byline. */
export const DESK_ABOUT_HREF = '/editorial';

/** One line, shown inline next to the byline wherever space allows. */
export const DESK_DISCLOSURE_SHORT =
  'Drafted by AI, fact-checked before publishing, corrected in public.';

/**
 * The standing view — the desk's priors, stated once so readers can discount
 * them. Deliberately short, deliberately falsifiable, and deliberately about
 * method rather than about any single company.
 */
export const DESK_STANDING_VIEW: readonly string[] = [
  'Cadence is the honest measure of a launch company. Announcements are not flights, and a manifest is not a record.',
  'Cost per kilogram is a marketing number until someone publishes a price list. We quote prices, and say when we are quoting an estimate.',
  'Schedules slip. We track the slip rather than reprinting the newest date as though the last one never existed.',
  'Hiring is the least-gameable public signal a private space company emits. Job counts move before press releases do.',
  'Government demand still underwrites most of this industry. A commercial market that depends on one anchor customer should be described that way.',
];

/** Provenance steps shown on the about page and summarised on every byline. */
export interface DeskPipelineStep {
  title: string;
  detail: string;
}

export const DESK_PIPELINE: readonly DeskPipelineStep[] = [
  {
    title: 'Selection',
    detail:
      'A daily job at 01:00 UTC (retried at 07:00 UTC) reads the last 24 hours of the aggregated news pool plus our own structured data — launch records, hiring snapshots, funding rounds, regulatory filings — and picks the stories worth an analysis piece. Titles published in the previous 14 days, including ones that were rejected, are shown to the selector so killed stories stay killed.',
  },
  {
    title: 'Drafting',
    detail:
      'Claude Sonnet writes the draft against the selected sources. It is given the source articles and our data; it is not given a house line to argue.',
  },
  {
    title: 'Fact-check',
    detail:
      'A second, separate model pass checks every claim in the draft against the cited sources and returns one of three verdicts: pass, minor issues, or major issues.',
  },
  {
    title: 'Publication gate',
    detail:
      'Pass and minor-issues drafts publish automatically. Major-issues drafts are held as pending_review and emailed to the founder, who approves or rejects each one by hand. Nothing with a major-issues verdict reaches the site unread by a person.',
  },
  {
    title: 'Sourcing',
    detail:
      'Every published piece lists the sources it was written from, and each carries a confidence badge derived from how many independent sources it stands on.',
  },
];

/** Who reviews, in plain words. */
export const DESK_REVIEWER =
  'SpaceNexus is a one-person company. Jay Griffiths, the founder, is the responsible editor: he receives the held-article queue, approves or rejects every major-issues draft, and answers corrections.';

/** How to get something fixed. */
export const DESK_CORRECTIONS_HREF = '/contact?topic=correction';
export const DESK_CORRECTIONS = [
  'Tell us what is wrong and, if you can, what the right figure or date is and where it comes from.',
  'Factual errors are fixed in place and the piece gets a dated correction note at the foot. We do not quietly re-edit a claim out of existence.',
  'If a piece is wrong in its premise rather than its details, it is withdrawn and the URL says so instead of 404ing.',
  'Corrections are handled by the founder directly, not by the pipeline that wrote the piece.',
];

/**
 * The one thing this file cannot supply: the weekly opinion column.
 * /editorial/column renders whatever DESK_COLUMNS holds (src/lib/desk-column.ts);
 * an empty registry renders the honest "not published yet" state.
 */
export const DESK_COLUMN_COMMITMENT =
  'One signed opinion column a week, written by a person, published Fridays.';
