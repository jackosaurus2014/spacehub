/**
 * @jest-environment node
 */
import {
  EXPLAINER_DISCLAIMER,
  EXPLAINER_SLUG_PREFIX,
  buildExplainerPrompt,
  composeExplainerMarkdown,
  documentNumberFromDedupKey,
  explainerSlugForAction,
  isExplainerEligible,
  parseExplainerRaw,
  type ExplainerCandidate,
} from '../radar-explainers';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { aIInsight: { findFirst: jest.fn(), count: jest.fn() } },
}));

const RAW_PAYLOAD = {
  documentNumber: '2026-12345',
  abstract:
    'The Bureau of Industry and Security amends the Export Administration Regulations to revise license requirements for certain spacecraft components.',
  citation: '91 FR 45678',
  docketIds: ['BIS-2026-0007'],
  effectiveDate: '2026-10-01',
  agencies: ['Industry and Security Bureau'],
  agencySlugs: ['industry-and-security-bureau'],
};

function candidate(overrides: Partial<ExplainerCandidate> = {}): ExplainerCandidate {
  return {
    id: 'clx123abc',
    dedupKey: 'federal-register:2026-12345',
    source: 'federal-register',
    category: 'export-controls',
    title: 'Revisions to License Requirements for Spacecraft Components',
    summary: null,
    actionDate: new Date('2026-08-10T12:00:00Z'),
    url: 'https://www.federalregister.gov/documents/2026/08/10/2026-12345/revisions',
    agency: 'Industry and Security Bureau',
    documentType: 'Rule',
    actionText: 'Final rule.',
    commentUrl: 'https://www.regulations.gov/commenton/BIS-2026-0007',
    commentCloseDate: new Date('2026-09-15T23:59:59Z'),
    significant: true,
    raw: JSON.stringify(RAW_PAYLOAD),
    ...overrides,
  };
}

describe('documentNumberFromDedupKey / explainerSlugForAction', () => {
  it('extracts the FR document number', () => {
    expect(documentNumberFromDedupKey('federal-register:2026-12345')).toBe('2026-12345');
  });

  it('returns null for non-FR dedup keys', () => {
    expect(documentNumberFromDedupKey('congress:119-hr-3512:2026-08-12')).toBeNull();
    expect(explainerSlugForAction('congress:119-hr-3512:2026-08-12')).toBeNull();
  });

  it('builds a deterministic prefixed slug from the document number', () => {
    expect(explainerSlugForAction('federal-register:2026-12345')).toBe(
      `${EXPLAINER_SLUG_PREFIX}2026-12345`
    );
  });

  it('sanitizes unusual document numbers', () => {
    expect(explainerSlugForAction('federal-register:C1-2026-00123')).toBe(
      `${EXPLAINER_SLUG_PREFIX}c1-2026-00123`
    );
  });
});

describe('isExplainerEligible', () => {
  it('accepts any significant Federal Register document', () => {
    expect(isExplainerEligible(candidate({ significant: true, category: 'spectrum', documentType: 'Notice', agency: 'Federal Communications Commission' }))).toBe(true);
  });

  it('rejects non-Federal-Register sources even when significant', () => {
    expect(isExplainerEligible(candidate({ source: 'congress' }))).toBe(false);
  });

  it('accepts non-significant export-controls Rule / Proposed Rule from BIS', () => {
    expect(isExplainerEligible(candidate({ significant: false, documentType: 'Rule' }))).toBe(true);
    expect(isExplainerEligible(candidate({ significant: false, documentType: 'Proposed Rule' }))).toBe(true);
  });

  it('accepts DDTC (State Department) export-controls rules', () => {
    expect(
      isExplainerEligible(candidate({ significant: false, agency: 'State Department', raw: null }))
    ).toBe(true);
  });

  it('falls back to agencySlugs in raw when the display name is ambiguous', () => {
    expect(
      isExplainerEligible(candidate({ significant: false, agency: 'Commerce Department' }))
    ).toBe(true); // raw agencySlugs contains industry-and-security-bureau
  });

  it('rejects non-significant export-controls Notices', () => {
    expect(isExplainerEligible(candidate({ significant: false, documentType: 'Notice' }))).toBe(false);
  });

  it('rejects non-significant export-controls rules from non-BIS/DDTC agencies', () => {
    expect(
      isExplainerEligible(
        candidate({ significant: false, agency: 'Federal Communications Commission', raw: JSON.stringify({ agencySlugs: ['federal-communications-commission'] }) })
      )
    ).toBe(false);
  });

  it('rejects non-significant non-export-controls documents', () => {
    expect(isExplainerEligible(candidate({ significant: false, category: 'spectrum' }))).toBe(false);
  });
});

describe('buildExplainerPrompt — grounding guards', () => {
  it('embeds the source text (title, abstract, agency, dates, citation, URL)', () => {
    const prompt = buildExplainerPrompt(candidate());
    expect(prompt).toContain('Revisions to License Requirements for Spacecraft Components');
    expect(prompt).toContain(RAW_PAYLOAD.abstract);
    expect(prompt).toContain('Industry and Security Bureau');
    expect(prompt).toContain('2026-08-10'); // publication date
    expect(prompt).toContain('Public comments close: 2026-09-15');
    expect(prompt).toContain('Effective date: 2026-10-01');
    expect(prompt).toContain('91 FR 45678');
    expect(prompt).toContain('BIS-2026-0007');
    expect(prompt).toContain(candidate().url);
  });

  it('carries the forbids-invention instruction block', () => {
    const prompt = buildExplainerPrompt(candidate());
    expect(prompt).toContain('STRICT GROUNDING RULES');
    expect(prompt).toContain('Do NOT invent specifics');
    expect(prompt).toContain('no CFR citations');
    expect(prompt).toContain('no penalty or dollar amounts');
    expect(prompt).toContain('Do not speculate');
  });

  it('states plainly when no abstract exists rather than inviting invention', () => {
    const prompt = buildExplainerPrompt(candidate({ raw: JSON.stringify({ ...RAW_PAYLOAD, abstract: null }), summary: null }));
    expect(prompt).toContain('(No abstract provided by the Federal Register for this document.)');
  });
});

describe('composeExplainerMarkdown', () => {
  const sections = {
    title: 'BIS revises spacecraft component export licenses',
    summary: 'BIS amended the EAR license requirements for certain spacecraft components.',
    whatChanged: 'The rule revises license requirements for certain spacecraft components.',
    whoIsAffected: 'Satellite component exporters and their compliance teams.',
    whatToDo: '1. Read the full rule.\n2. Assess exposure.',
  };

  it('assembles all sections with deterministic key dates from the DB row', () => {
    const md = composeExplainerMarkdown(sections, candidate());
    expect(md).toContain('## What changed');
    expect(md).toContain("## Who's affected");
    expect(md).toContain('## Key dates');
    expect(md).toContain('- **Published:** 2026-08-10');
    expect(md).toContain('- **Public comments close:** 2026-09-15');
    expect(md).toContain('- **Effective date:** 2026-10-01');
    expect(md).toContain('## What to do about it');
  });

  it('links to the source document AND back to the Radar detail page', () => {
    const md = composeExplainerMarkdown(sections, candidate());
    expect(md).toContain(candidate().url);
    expect(md).toContain('/regulatory-radar/action/clx123abc');
  });

  it('always carries the not-legal-advice disclaimer', () => {
    const md = composeExplainerMarkdown(sections, candidate());
    expect(md).toContain(EXPLAINER_DISCLAIMER);
    expect(EXPLAINER_DISCLAIMER).toContain('not legal advice');
  });

  it('omits comment-close and effective-date lines when the source has none', () => {
    const md = composeExplainerMarkdown(
      sections,
      candidate({ commentCloseDate: null, commentUrl: null, raw: JSON.stringify({ ...RAW_PAYLOAD, effectiveDate: null }) })
    );
    expect(md).not.toContain('Public comments close');
    expect(md).not.toContain('Effective date');
    expect(md).toContain('- **Published:** 2026-08-10');
  });
});

describe('parseExplainerRaw', () => {
  it('fails soft on null / invalid JSON', () => {
    expect(parseExplainerRaw(null)).toEqual({});
    expect(parseExplainerRaw('not json')).toEqual({});
    expect(parseExplainerRaw('"a string"')).toEqual({});
  });
});
