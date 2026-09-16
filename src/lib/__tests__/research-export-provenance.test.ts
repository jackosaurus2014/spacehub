/**
 * @jest-environment node
 *
 * Provenance travels INSIDE the file.
 *
 * Two obligations meet here:
 *
 *  1. HONESTY. /research promises every dataset "ships with this statement
 *     attached to the file, not just printed on this page". Until now the
 *     coverage statement travelled only as the X-SpaceNexus-Coverage response
 *     header, which stops existing the moment the download finishes — so the
 *     promise was false for exactly the artefact it was made about.
 *
 *  2. LICENCE. UK Companies House data is Crown copyright released under the
 *     Open Government Licence v3.0. The OGL grants reuse ON CONDITION that the
 *     source is acknowledged, and says the granted rights "end automatically"
 *     otherwise. Register-derived facts reach our exports through
 *     CompanyProfile (companies-house-fetcher.ts fills foundedYear and
 *     legalName and creates KeyPersonnel rows), so the credit has to be in the
 *     file and on the pages that display it.
 */
import fs from 'fs';
import path from 'path';

jest.mock('@/lib/db', () => ({ __esModule: true, default: {} }));

import {
  RESEARCH_ATTRIBUTION_LINES,
  RESEARCH_SOURCE_CREDITS,
  csvProvenanceHeader,
  jsonProvenance,
} from '../research-export';
import {
  COMPANIES_HOUSE_LICENCE_NAME,
  COMPANIES_HOUSE_LICENCE_URL,
  UK_REGISTRY_SOURCE_LABEL,
} from '../uk-registry/attribution';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');

const CRLF = String.fromCharCode(13, 10);

describe('required source credits', () => {
  it('names the UK register, its licence and a link to that licence', () => {
    const ch = RESEARCH_SOURCE_CREDITS.find((c) => c.source === UK_REGISTRY_SOURCE_LABEL);
    expect(ch).toBeDefined();
    expect(ch!.licence).toBe(COMPANIES_HOUSE_LICENCE_NAME);
    expect(ch!.licenceUrl).toBe(COMPANIES_HOUSE_LICENCE_URL);
    // The OGL is conditional: the credit is the consideration, not a courtesy.
    expect(ch!.required).toBe(true);
  });

  it('is single-sourced from uk-registry/attribution.ts, never retyped', () => {
    const src = read('src/lib/research-export.ts');
    expect(src).toContain("from '@/lib/uk-registry/attribution'");
    expect(src).toContain('COMPANIES_HOUSE_ATTRIBUTION_LONG');
  });

  it('every attribution line carries the licence URL', () => {
    expect(RESEARCH_ATTRIBUTION_LINES.length).toBe(RESEARCH_SOURCE_CREDITS.length);
    for (const line of RESEARCH_ATTRIBUTION_LINES) {
      expect(line).toContain('Open Government Licence');
      expect(line).toContain('nationalarchives.gov.uk');
    }
  });
});

describe('csvProvenanceHeader', () => {
  const header = csvProvenanceHeader({
    title: 'SpaceNexus Research — Funding rounds (full history)',
    sourceUrl: 'https://spacenexus.us/research',
    citation: 'SpaceNexus, Most Active Investors, 2026-08.',
    notice: 'For informational purposes only — not investment advice.',
    coverage: [
      'Every round we hold, amounts as reported.',
      'Undisclosed rounds are blank, not dropped.',
    ],
    rowCount: 1234,
    generatedAt: new Date('2026-09-16T00:00:00.000Z'),
  });
  const lines = header.split(CRLF);

  it('starts with a comment row naming the file', () => {
    expect(lines[0]).toContain('# SpaceNexus Research');
  });

  it('puts the coverage limits in the file, one row each', () => {
    const coverage = lines.filter((l) => l.includes('# Coverage:'));
    expect(coverage).toHaveLength(2);
    expect(header).toContain('Undisclosed rounds are blank');
  });

  it('puts the licence acknowledgement in the file', () => {
    expect(header).toContain('# Attribution:');
    expect(header).toContain('Open Government Licence v3.0');
    expect(header).toContain(COMPANIES_HOUSE_LICENCE_URL);
  });

  it('carries the citation, the standing notice and the row count', () => {
    expect(header).toContain('# Cite as: SpaceNexus, Most Active Investors, 2026-08.');
    expect(header).toContain('# Notice: For informational purposes only');
    expect(header).toContain('# Rows: 1234');
    expect(header).toContain('# Generated: 2026-09-16T00:00:00.000Z');
  });

  it('uses CRLF rows and ends with one, so the data header lands on its own row', () => {
    expect(header.endsWith(CRLF)).toBe(true);
    // No bare LF anywhere: a lone newline would split a comment row in Excel.
    const bareLf = new RegExp('[^' + String.fromCharCode(13) + ']' + String.fromCharCode(10));
    expect(bareLf.test(header)).toBe(false);
  });

  it('quotes any comment containing a comma so a parser sees ONE column', () => {
    // 'Every round we hold, amounts as reported.' contains a comma.
    const row = lines.find((l) => l.includes('Every round we hold'))!;
    expect(row.startsWith('"')).toBe(true);
    expect(row.endsWith('"')).toBe(true);
  });
});

describe('jsonProvenance', () => {
  it('exposes the credits as a top-level field for JSON exports', () => {
    const p = jsonProvenance();
    expect(p.attribution).toEqual(RESEARCH_ATTRIBUTION_LINES);
    expect(p.sources[0].licence).toBe(COMPANIES_HOUSE_LICENCE_NAME);
  });
});

describe('every gated export actually emits it', () => {
  const routes = [
    'src/app/api/research/export/[dataset]/route.ts',
    'src/app/api/research/reports/[report]/[period]/route.ts',
    'src/app/api/research/gov-awards/route.ts',
  ];

  it.each(routes)('%s prepends the provenance block to its CSV', (rel) => {
    const src = read(rel);
    expect(src).toContain('csvProvenanceHeader(');
    // The block is concatenated ahead of the rows, after the BOM.
    expect(src).toContain('${provenance}${csv}');
  });

  it.each(routes)('%s puts the credits in its JSON body', (rel) => {
    expect(read(rel)).toContain('...jsonProvenance()');
  });

  it.each(routes)('%s keeps the coverage header too — this ADDS, it does not move', (rel) => {
    expect(read(rel)).toContain('X-SpaceNexus-Coverage');
  });
});

describe('the pages that display the data show the credit', () => {
  it('release editions render the licence note', () => {
    expect(read('src/components/reports/ReleaseEditionView.tsx')).toContain('<DataLicenceNote />');
  });

  it('the Hiring Index and Space Score pages get it through the shared footer note', () => {
    expect(read('src/components/reports/ReleaseFooterNote.tsx')).toContain('<DataLicenceNote />');
  });

  it('the note links the licence, as the OGL requires "where possible"', () => {
    const src = read('src/components/reports/DataLicenceNote.tsx');
    expect(src).toContain('credit.licenceUrl');
    expect(src).toContain('RESEARCH_SOURCE_CREDITS');
  });
});

// ── The byline says what actually produced the release ──────────────────────

describe('release editions are not bylined as AI-drafted', () => {
  const editionPages = [
    'src/app/releases/[series]/[period]/page.tsx',
    'src/app/rankings/space-score-top-25/[quarter]/page.tsx',
  ];

  it.each(editionPages)('%s uses ComputedByline, not DeskByline', (rel) => {
    const src = read(rel);
    expect(src).toContain('<ComputedByline');
    expect(src).not.toContain('<DeskByline');
  });

  it('the computed byline never claims a model drafted anything', () => {
    const src = read('src/components/reports/ComputedByline.tsx');
    // The rendered sub-line, not the file comment (which quotes the old one
    // in order to explain why it was wrong here).
    const role = src.slice(src.indexOf('export const COMPUTED_ROLE'));
    expect(role.slice(0, 200)).toContain('no model is involved');
    expect(role.slice(0, 200)).not.toContain('AI-drafted');
    expect(src).not.toContain('DESK_ROLE');
  });

  it('the AI desk byline is untouched where a model really does draft', () => {
    // /ai-insights is drafted by a model and must keep saying so.
    expect(read('src/components/desk/DeskByline.tsx')).toContain('AI-drafted, fact-checked');
    expect(read('src/app/ai-insights/[slug]/page.tsx')).toContain('<DeskByline />');
  });
});

// ── The marquee is decorative ───────────────────────────────────────────────

describe('the industry ticker is out of the tab order', () => {
  const src = read('src/components/ui/IndustryTicker.tsx');

  it('marks the scrolling strip aria-hidden', () => {
    expect(src).toContain('aria-hidden="true"');
  });

  it('takes its links out of the tab order — it renders every item twice', () => {
    expect(src).toContain('tabIndex={-1}');
  });

  it('leaves the hide control focusable, so it can still be dismissed by keyboard', () => {
    const hideButton = src.slice(src.indexOf('aria-label="Hide market ticker"'));
    expect(hideButton.slice(0, 200)).not.toContain('tabIndex={-1}');
  });
});
