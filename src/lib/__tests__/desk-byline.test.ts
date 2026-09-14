/**
 * @jest-environment node
 */
/**
 * The SpaceNexus Desk byline and its disclosure (competitor review
 * 2026-09-10, Tier 2 #7: "Named voices").
 *
 * The trust gap the byline fixes is "who is this?". The trap it could create
 * is worse: a masthead that reads as a person when a model wrote the piece.
 * These tests are the structural guard on that — the byline never travels
 * without the disclosure and the link to /editorial, the masthead says in
 * plain words that no human typed the analysis, and the weekly column refuses
 * a non-human byline.
 */

import fs from 'fs';
import path from 'path';
import {
  DESK_BYLINE,
  DESK_ROLE,
  DESK_ABOUT_HREF,
  DESK_DISCLOSURE_SHORT,
  DESK_STANDING_VIEW,
  DESK_PIPELINE,
  DESK_REVIEWER,
  DESK_CORRECTIONS,
  DESK_CORRECTIONS_HREF,
  DESK_COLUMN_COMMITMENT,
} from '@/lib/ai-insights-desk';
import {
  DESK_COLUMNS,
  NON_HUMAN_BYLINES,
  COLUMN_REQUIREMENTS,
  columnIsHumanWritten,
  listColumns,
  getColumn,
  type DeskColumn,
} from '@/lib/desk-column';

const ROOT = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ── The byline itself ────────────────────────────────────────────────────

describe('desk identity', () => {
  it('is a desk, not a person', () => {
    expect(DESK_BYLINE).toBe('SpaceNexus Desk');
    // A first name + last name byline would be the exact misrepresentation
    // this feature has to avoid.
    expect(DESK_BYLINE).toContain('SpaceNexus');
    expect(DESK_ROLE.toLowerCase()).toContain('ai');
  });

  it('carries a one-line disclosure that names the AI drafting', () => {
    const d = DESK_DISCLOSURE_SHORT.toLowerCase();
    expect(d).toContain('ai');
    expect(d).toContain('fact-check');
  });

  it('points every byline at a real masthead route', () => {
    expect(DESK_ABOUT_HREF).toBe('/editorial');
    expect(fs.existsSync(path.join(ROOT, 'src/app/editorial/page.tsx'))).toBe(true);
  });

  it('publishes a standing view with real, arguable positions', () => {
    expect(DESK_STANDING_VIEW.length).toBeGreaterThanOrEqual(4);
    for (const view of DESK_STANDING_VIEW) expect(view.length).toBeGreaterThan(60);
  });

  it('documents the pipeline end to end, including the human gate', () => {
    const titles = DESK_PIPELINE.map((s) => s.title.toLowerCase());
    expect(titles).toEqual(expect.arrayContaining(['drafting', 'fact-check', 'publication gate', 'sourcing']));
    const gate = DESK_PIPELINE.find((s) => s.title === 'Publication gate')!;
    expect(gate.detail.toLowerCase()).toContain('pending_review');
  });

  it('names who is accountable and how to correct a piece', () => {
    expect(DESK_REVIEWER.length).toBeGreaterThan(60);
    expect(DESK_CORRECTIONS.length).toBeGreaterThanOrEqual(3);
    expect(DESK_CORRECTIONS_HREF.startsWith('/contact')).toBe(true);
  });
});

// ── The byline never travels alone ───────────────────────────────────────

describe('DeskByline component', () => {
  const src = read('src/components/desk/DeskByline.tsx');

  it('renders the byline from the constant, never a hardcoded string', () => {
    expect(src).toContain('DESK_BYLINE');
    expect(src).not.toContain("'SpaceNexus Desk'");
  });

  it('links to the masthead in BOTH variants', () => {
    expect(src).toContain('DESK_ABOUT_HREF');
    // Two <Link href={DESK_ABOUT_HREF}> — the compact and the full byline.
    expect(src.match(/href=\{DESK_ABOUT_HREF\}/g)?.length).toBe(2);
  });

  it('shows a disclosure in both variants', () => {
    expect(src).toContain('DESK_DISCLOSURE_SHORT');
    expect(src).toContain('AI-drafted, fact-checked');
  });
});

describe('the insight surfaces carry the byline', () => {
  it('the hub renders it and exposes the standing view', () => {
    const src = read('src/app/ai-insights/page.tsx');
    expect(src).toContain('DeskByline');
    expect(src).toContain('DESK_STANDING_VIEW');
    expect(src).toContain('DESK_ABOUT_HREF');
  });

  it('the article page renders it and repeats the disclosure at the foot', () => {
    const src = read('src/app/ai-insights/[slug]/page.tsx');
    expect(src).toContain('<DeskByline />');
    expect(src).toContain('DESK_CORRECTIONS_HREF');
    expect(src).toContain('No human typed this article');
  });

  it("the article's structured data credits an Organization, never a Person", () => {
    const src = read('src/app/ai-insights/[slug]/page.tsx');
    const authorBlock = src.slice(src.indexOf('author: {'), src.indexOf('datePublished'));
    expect(authorBlock).toContain("'@type': 'Organization'");
    expect(authorBlock).not.toContain('Person');
    expect(authorBlock).toContain('DESK_BYLINE');
  });
});

describe('the masthead states the machine authorship in plain words', () => {
  const src = read('src/app/editorial/page.tsx');

  it('says the desk is not a person', () => {
    expect(src).toContain('not a person');
  });

  it('says no human typed the analysis', () => {
    expect(src.toLowerCase()).toContain('was typed by a human');
  });

  it('renders the pipeline, the reviewer and the corrections route', () => {
    expect(src).toContain('DESK_PIPELINE');
    expect(src).toContain('DESK_REVIEWER');
    expect(src).toContain('DESK_CORRECTIONS_HREF');
  });
});

// ── The weekly column ────────────────────────────────────────────────────

describe('weekly column', () => {
  it('states the commitment', () => {
    expect(DESK_COLUMN_COMMITMENT.toLowerCase()).toContain('week');
  });

  it('ships empty — a machine must not fill the opinion slot', () => {
    expect(DESK_COLUMNS).toEqual([]);
    expect(listColumns()).toEqual([]);
    expect(getColumn('anything')).toBeNull();
  });

  it('spells out what a human still has to supply', () => {
    expect(COLUMN_REQUIREMENTS.length).toBeGreaterThanOrEqual(3);
    for (const r of COLUMN_REQUIREMENTS) expect(r.length).toBeGreaterThan(40);
  });

  const column = (author: string): DeskColumn => ({
    slug: 'x',
    title: 'T',
    dek: 'D',
    author,
    authorRole: 'R',
    publishedAt: '2026-09-18',
    body: 'Body',
  });

  it('rejects every reserved non-human byline', () => {
    for (const name of NON_HUMAN_BYLINES) {
      expect(columnIsHumanWritten(column(name))).toBe(false);
      expect(columnIsHumanWritten(column(name.toUpperCase()))).toBe(false);
    }
  });

  it('rejects an empty byline', () => {
    expect(columnIsHumanWritten(column('   '))).toBe(false);
  });

  it('accepts a real person', () => {
    expect(columnIsHumanWritten(column('Jay Griffiths'))).toBe(true);
  });

  it('the column route renders the author as a Person, unlike the desk', () => {
    const src = read('src/app/editorial/column/[slug]/page.tsx');
    expect(src).toContain("'@type': 'Person'");
    expect(src).toContain('column.author');
    // And it must not be silently prerenderable into existence: the empty
    // registry plus dynamicParams:false is what 404s unknown slugs.
    expect(src).toContain('export const dynamicParams = false');
    expect(src).toContain('generateStaticParams');
  });
});
