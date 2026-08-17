/**
 * @jest-environment node
 */
import type { RadarEntry } from '../regulatory-radar';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { regulatoryAction: { count: jest.fn(), findMany: jest.fn() } },
}));

import { composeRegulatoryBrief, type RegulatoryBriefData } from '../weekly-regulatory-brief';

const NOW = new Date('2026-08-17T14:30:00Z');

function entry(overrides: Partial<RadarEntry> = {}): RadarEntry {
  return {
    id: Math.random().toString(36).slice(2),
    dedupKey: `federal-register:${Math.random().toString(36).slice(2)}`,
    source: 'federal-register',
    category: 'launch-licensing',
    title: 'Launch licensing update',
    summary: null,
    actionDate: new Date('2026-08-14T12:00:00Z'),
    url: 'https://www.federalregister.gov/documents/x',
    agency: 'Federal Aviation Administration',
    documentType: 'Rule',
    actionText: null,
    commentUrl: null,
    commentCloseDate: null,
    significant: false,
    ...overrides,
  };
}

describe('composeRegulatoryBrief', () => {
  it('returns null when there is nothing to report — the cron must skip, not publish an empty brief', () => {
    const data: RegulatoryBriefData = { weekActions: [], closingWindows: [] };
    expect(composeRegulatoryBrief(data, NOW)).toBeNull();
  });

  it('composes title/slug keyed to the publish date', () => {
    const brief = composeRegulatoryBrief({ weekActions: [entry()], closingWindows: [] }, NOW);
    expect(brief).not.toBeNull();
    expect(brief!.slug).toBe('regulatory-radar-week-of-2026-08-17');
    expect(brief!.title).toBe('Regulatory Radar — Week of 2026-08-17');
  });

  it('splits the week-in-numbers table by source and document type', () => {
    const data: RegulatoryBriefData = {
      weekActions: [
        entry({ documentType: 'Rule' }),
        entry({ documentType: 'Proposed Rule' }),
        entry({ documentType: 'Notice' }),
        entry({
          source: 'congress',
          category: 'export-controls',
          title: 'H.R. 1 — Export Control Reform Act',
          actionText: 'Passed the House.',
          documentType: 'hr',
          agency: 'U.S. House',
        }),
      ],
      closingWindows: [],
    };
    const brief = composeRegulatoryBrief(data, NOW)!;
    expect(brief.content).toContain('| Regulatory actions tracked | 4 |');
    expect(brief.content).toContain('| Congressional actions | 1 |');
    expect(brief.content).toContain('| Final rules | 1 |');
    expect(brief.content).toContain('| Proposed rules | 1 |');
    expect(brief.content).toContain('| Notices & other documents | 1 |');
  });

  it('leads with comment windows closing soon, including days remaining', () => {
    const closing = entry({
      title: 'NGSO spectrum sharing proposed rule',
      category: 'spectrum',
      documentType: 'Proposed Rule',
      commentCloseDate: new Date('2026-08-24T23:59:59Z'),
      commentUrl: 'https://www.regulations.gov/comment/x',
    });
    const brief = composeRegulatoryBrief({ weekActions: [closing], closingWindows: [closing] }, NOW)!;
    expect(brief.content).toContain('## Action windows closing soon');
    expect(brief.content).toContain('closes 2026-08-24');
    expect(brief.content).toMatch(/\(\d+ days?\)/);
  });

  it('includes On the Hill and significant-rule sections only when populated', () => {
    const noHill = composeRegulatoryBrief({ weekActions: [entry()], closingWindows: [] }, NOW)!;
    expect(noHill.content).not.toContain('## On the Hill');
    expect(noHill.content).not.toContain('## Significant rules');

    const withBoth = composeRegulatoryBrief(
      {
        weekActions: [
          entry({ significant: true, title: 'ITAR USML Category IV revision', category: 'export-controls' }),
          entry({
            source: 'congress',
            title: 'S. 42 — Space Licensing Act',
            actionText: 'Passed the Senate.',
            documentType: 's',
          }),
        ],
        closingWindows: [],
      },
      NOW
    )!;
    expect(withBoth.content).toContain('## On the Hill');
    expect(withBoth.content).toContain('Passed the Senate.');
    expect(withBoth.content).toContain('## Significant rules');
    expect(withBoth.content).toContain('ITAR USML Category IV revision');
  });

  it('groups Federal Register activity by category with labels', () => {
    const brief = composeRegulatoryBrief(
      {
        weekActions: [
          entry({ category: 'spectrum' }),
          entry({ category: 'spectrum' }),
          entry({ category: 'export-controls' }),
        ],
        closingWindows: [],
      },
      NOW
    )!;
    expect(brief.content).toContain('### Spectrum (2)');
    expect(brief.content).toContain('### Export Controls (1)');
  });

  it('summary reports real counts only', () => {
    const brief = composeRegulatoryBrief({ weekActions: [entry()], closingWindows: [] }, NOW)!;
    expect(brief.summary).toContain('1 tracked action');
    expect(brief.summary).toContain('0 congressional');
  });
});
