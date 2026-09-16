/**
 * @jest-environment node
 */

/**
 * The Most Active Space Investors edition, built over the rows that actually
 * produced the bad Q2 2026 page.
 *
 * WHAT THAT PAGE SAID. "DISCLOSED CAPITAL $84.9B" for one quarter of space
 * funding, roughly ten times the real market — $75.0B of it a SpaceX IPO and
 * $5.0B an Anduril defence round. And the ranking beneath it was meaningless:
 * "Eclipse / Riot Ventures" was stored as one investor, so co-leads never
 * aggregated and the most active investor in space had led two rounds.
 *
 * The fixtures below are the real shapes: same companies, same stages, same
 * lead strings, amounts rounded to keep the arithmetic readable.
 */

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { fundingRound: { findMany: jest.fn() } },
}));

import prisma from '@/lib/db';
import { buildInvestorsEdition } from '../research-report-investors';

const findMany = prisma.fundingRound.findMany as jest.Mock;

type Row = {
  id: string;
  date: Date;
  amount: number | null;
  amountUndisclosed: boolean;
  seriesLabel: string | null;
  roundType: string | null;
  leadInvestor: string | null;
  investors: string[];
  source: string | null;
  sourceUrl: string | null;
  company: {
    slug: string;
    name: string;
    sector: string | null;
    subsector: string | null;
    isPublic: boolean | null;
  } | null;
};

let seq = 0;
function round(
  date: string,
  amount: number | null,
  stage: string,
  type: string,
  lead: string | null,
  company: { name: string; sector: string | null; subsector?: string | null; isPublic?: boolean },
  investors: string[] = []
): Row {
  seq += 1;
  return {
    id: `r${seq}`,
    date: new Date(`${date}T00:00:00Z`),
    amount,
    amountUndisclosed: amount === null,
    seriesLabel: stage,
    roundType: type,
    leadInvestor: lead,
    investors,
    source: 'Press',
    sourceUrl: 'https://example.invalid/round',
    company: {
      slug: company.name.toLowerCase().replace(/\W+/g, '-'),
      name: company.name,
      sector: company.sector,
      subsector: company.subsector ?? null,
      isPublic: company.isPublic ?? false,
    },
  };
}

// The Q2 2026 row set, in miniature.
const Q2: Row[] = [
  // Counted: real private rounds into companies our records call space.
  round('2026-04-28', 650_000_000, 'Series D', 'equity', 'Eclipse / Riot Ventures', {
    name: 'True Anomaly',
    sector: 'defense',
    subsector: 'space-domain-awareness',
  }),
  round('2026-06-04', 525_000_000, 'Growth', 'equity', 'Type One Ventures / Qatar Investment Authority', {
    name: 'Axiom Space',
    sector: 'infrastructure',
  }),
  round('2026-06-02', 500_000_000, 'Series D', 'equity', '137 Ventures / Banner VC', {
    name: 'Impulse Space',
    sector: 'infrastructure',
  }),
  round('2026-04-15', 75_000_000, 'Series B', 'equity', 'Washington Harbour Partners', {
    name: 'Turion Space',
    sector: 'infrastructure',
  }),
  round('2026-05-20', 40_000_000, 'Series A', 'equity', 'Washington Harbour Partners', {
    name: 'Scout Space',
    sector: 'analytics',
    subsector: 'space-surveillance',
  }),
  round('2026-05-28', 90_000_000, 'Debut Round', 'equity', 'Lux Capital', { name: 'Observable Space', sector: 'satellite' }, [
    'a16z (Andreessen Horowitz)',
    'Lux Capital',
  ]),

  // Excluded by the instrument test.
  round('2026-06-12', 75_000_000_000, 'IPO', 'ipo', null, { name: 'SpaceX', sector: 'launch', subsector: 'heavy-lift', isPublic: true }),
  round('2026-05-07', 416_000_000, 'IPO', 'ipo', null, { name: 'HawkEye 360', sector: 'analytics', isPublic: true }),
  round('2026-05-27', 100_000_000, 'Registered Direct', 'equity', null, { name: 'Sidus Space', sector: 'manufacturing', isPublic: true }),
  round('2026-06-11', 13_400_000, 'Grant', 'grant', 'ESA / UK Space Agency', { name: 'Space Forge', sector: 'manufacturing' }),

  // Excluded by the recipient test.
  round('2026-05-13', 5_000_000_000, 'Series H', 'equity', 'Thrive Capital', {
    name: 'Anduril Industries',
    sector: 'defense',
    subsector: 'autonomous-defense',
  }),
  round('2026-04-07', 350_000_000, 'Growth', 'equity', 'Khosla Ventures', {
    name: 'Hermeus',
    sector: 'defense',
    subsector: 'hypersonic-systems',
  }),
];

// One extra counted round in an earlier quarter, so the TTM table differs.
const EARLIER: Row[] = [
  round('2025-12-15', 10_000_000_000, 'Tender Offer', 'equity', 'Fidelity Investments', {
    name: 'SpaceX',
    sector: 'launch',
    subsector: 'heavy-lift',
    isPublic: true,
  }),
  round('2025-10-09', 510_000_000, 'Series D', 'equity', 'US Innovative Technology Fund', { name: 'Stoke Space', sector: 'launch' }),
  round('2026-01-20', 60_000_000, 'Series B', 'equity', 'Eclipse Ventures', { name: 'Ursa Major', sector: 'manufacturing' }),
];

/**
 * findMany is called four times in a fixed order: quarter, TTM, lookback,
 * prior quarter. Feed each its own slice.
 */
function mockWindows() {
  findMany
    .mockResolvedValueOnce(Q2)
    .mockResolvedValueOnce([...EARLIER, ...Q2])
    .mockResolvedValueOnce(EARLIER)
    .mockResolvedValueOnce([]);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockWindows();
});

const figure = (edition: Awaited<ReturnType<typeof buildInvestorsEdition>>, label: string) =>
  edition.headline.find((f) => f.label === label);
const table = (edition: Awaited<ReturnType<typeof buildInvestorsEdition>>, id: string) =>
  edition.tables.find((t) => t.id === id)!;

describe('the disclosed-capital headline', () => {
  it('no longer sums a $75B IPO and a defence round into "space funding"', async () => {
    const edition = await buildInvestorsEdition('2026-Q2');
    // Everything recorded: $81.9B. Everything the rule counts: $1.88B.
    const counted = 650 + 525 + 500 + 75 + 40 + 90;
    expect(figure(edition, 'Disclosed capital')!.value).toBe(`$${(counted / 1000).toFixed(2)}B`);
    expect(figure(edition, 'Space rounds counted')!.value).toBe('6');
  });

  it('says how much it left out rather than quietly shrinking', async () => {
    const edition = await buildInvestorsEdition('2026-Q2');
    expect(figure(edition, 'Disclosed capital')!.detail).toMatch(/\$80\.9B|\$80\.88B/);
    expect(figure(edition, 'Space rounds counted')!.detail).toContain('6 of 12');
  });

  it('publishes every excluded transaction with the reason', async () => {
    const edition = await buildInvestorsEdition('2026-Q2');
    const exclusions = table(edition, 'exclusions');
    expect(exclusions.rows).toHaveLength(6);
    const byCompany = Object.fromEntries(exclusions.rows.map((r) => [r.company as string, r]));
    expect(byCompany['SpaceX'].instrument).toBe('public-market');
    expect(byCompany['SpaceX'].reason).toMatch(/public-market offering/i);
    expect(byCompany['Anduril Industries'].instrument).toBe('venture');
    expect(byCompany['Anduril Industries'].recipient).toBe('adjacent');
    expect(byCompany['Anduril Industries'].reason).toMatch(/autonomous-defense/);
    expect(byCompany['Space Forge'].instrument).toBe('grant');
  });

  it('carries the rule itself in the coverage block, verbatim', async () => {
    const edition = await buildInvestorsEdition('2026-Q2');
    const coverage = edition.coverage.join('\n');
    expect(coverage).toContain('WHAT THE CAPITAL FIGURE COUNTS');
    expect(coverage).toContain('FIRST, THE INSTRUMENT');
    expect(coverage).toContain('SECOND, THE RECIPIENT');
    expect(coverage).toMatch(/conservative floor/);
    expect(coverage).toMatch(/12 transactions are recorded/);
  });
});

describe('the investor ranking', () => {
  it('aggregates co-leads that used to be stored as one string', async () => {
    const edition = await buildInvestorsEdition('2026-Q2');
    const rows = table(edition, 'leads-quarter').rows;
    const names = rows.map((r) => r.investor as string);
    // The string is gone; both firms inside it are present.
    expect(names).not.toContain('Eclipse / Riot Ventures');
    expect(names).toContain('Eclipse Ventures');
    expect(names).toContain('Riot Ventures');
    expect(names).toContain('Type One Ventures');
    expect(names).toContain('Qatar Investment Authority');
    expect(names).toContain('137 Ventures');
    expect(names).toContain('Banner VC');
  });

  it('gives the trailing-twelve-month table a leader with more than one round', async () => {
    const edition = await buildInvestorsEdition('2026-Q2');
    const ttm = table(edition, 'leads-ttm').rows;
    // Eclipse led True Anomaly (as a co-lead) and Ursa Major.
    const eclipse = ttm.find((r) => r.investor === 'Eclipse Ventures')!;
    expect(eclipse.roundCount).toBe(2);
    expect(ttm[0].roundCount).toBeGreaterThan(1);
  });

  it('drops the $10B tender offer that made Fidelity the top investor', async () => {
    const edition = await buildInvestorsEdition('2026-Q2');
    const ttm = table(edition, 'leads-ttm').rows.map((r) => r.investor as string);
    expect(ttm).not.toContain('Fidelity Investments');
    expect(table(edition, 'leads-quarter').rows.map((r) => r.investor)).not.toContain('Thrive Capital');
  });

  it('merges a variant spelling in the participation table', async () => {
    const edition = await buildInvestorsEdition('2026-Q2');
    const names = table(edition, 'participation').rows.map((r) => r.investor as string);
    expect(names).toContain('Andreessen Horowitz');
    expect(names).not.toContain('a16z (Andreessen Horowitz)');
  });

  it('warns that a co-led round is credited in full to each co-lead', async () => {
    const edition = await buildInvestorsEdition('2026-Q2');
    expect(table(edition, 'leads-quarter').note).toMatch(/sums to more than the quarter/i);
    expect(edition.coverage.join('\n')).toMatch(/HOW CO-LED ROUNDS ARE READ/);
  });

  it('publishes an audit of every string it rewrote', async () => {
    const edition = await buildInvestorsEdition('2026-Q2');
    const audit = table(edition, 'investor-name-normalisation');
    const recorded = audit.rows.map((r) => r.recorded as string);
    expect(recorded).toContain('Eclipse / Riot Ventures');
    expect(recorded).toContain('a16z (Andreessen Horowitz)');
    // Untouched names are not listed — there is nothing to check.
    expect(recorded).not.toContain('Lux Capital');
    expect(audit.note).toMatch(/slash with whitespace on both sides/i);
  });

  it('keeps the round table pointing at the string as it is actually stored', async () => {
    const edition = await buildInvestorsEdition('2026-Q2');
    const trueAnomaly = table(edition, 'rounds').rows.find((r) => r.company === 'True Anomaly')!;
    expect(trueAnomaly.leadInvestor).toBe('Eclipse Ventures; Riot Ventures');
    expect(trueAnomaly.leadInvestorAsRecorded).toBe('Eclipse / Riot Ventures');
  });
});

describe('a quarter where nothing passes the rule', () => {
  it('says which kind of empty it is', async () => {
    findMany.mockReset();
    const onlyExcluded = Q2.filter((r) => r.company?.name === 'SpaceX');
    findMany
      .mockResolvedValueOnce(onlyExcluded)
      .mockResolvedValueOnce(onlyExcluded)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const edition = await buildInvestorsEdition('2026-Q2');
    expect(edition.empty).toBe(true);
    expect(edition.emptyReason).toMatch(/none of them is a private space funding round/);
    expect(edition.coverage.join('\n')).toContain('WHAT THE CAPITAL FIGURE COUNTS');
  });

  it('still distinguishes "we recorded nothing"', async () => {
    findMany.mockReset();
    findMany.mockResolvedValue([]);
    const edition = await buildInvestorsEdition('2026-Q2');
    expect(edition.emptyReason).toBe('No funding rounds are recorded for this quarter.');
  });
});
