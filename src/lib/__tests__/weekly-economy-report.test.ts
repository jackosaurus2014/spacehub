/**
 * @jest-environment node
 */
import { buildMeanwhileIn2150Section, getTycoonWorldStats, type TycoonWorldStats } from '../weekly-economy-report';

// Standard jest hoisting idiom: variables referenced inside jest.mock's
// factory must be prefixed with "mock" so babel-plugin-jest-hoist allows
// them to be hoisted above their own declaration alongside the mock call.
const mockGameProfileCount = jest.fn();
const mockGameProfileFindFirst = jest.fn();
const mockAllianceCount = jest.fn();
const mockPublishedCorpReportFindFirst = jest.fn();

// The factory runs while '../weekly-economy-report' is being imported —
// before the consts above initialize — so reference them lazily.
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    gameProfile: {
      count: (...args: unknown[]) => mockGameProfileCount(...args),
      findFirst: (...args: unknown[]) => mockGameProfileFindFirst(...args),
    },
    alliance: { count: (...args: unknown[]) => mockAllianceCount(...args) },
    publishedCorpReport: { findFirst: (...args: unknown[]) => mockPublishedCorpReportFindFirst(...args) },
  },
}));

describe('buildMeanwhileIn2150Section', () => {
  it('includes the canonical in-game year heading and a leaderboard link', () => {
    const stats: TycoonWorldStats = {
      totalCorporations: 42,
      topCorp: { companyName: 'Orbital Dynamics', netWorth: 1_250_000_000, tier: 4 },
      allianceCount: 3,
      newestReport: { corpName: 'Orbital Dynamics', quarterLabel: 'Q4 2027' },
    };
    const section = buildMeanwhileIn2150Section(stats);

    expect(section).toContain('## Meanwhile, in 2150');
    expect(section).toContain('42');
    expect(section).toContain('Orbital Dynamics');
    expect(section).toContain('$1.3B');
    expect(section).toContain('**3** player alliances active');
    expect(section).toContain('Q4 2027');
    expect(section).toContain('[See the full leaderboard](/space-tycoon/leaderboard)');
  });

  it('never fabricates a top corp, alliance, or report line that was not provided', () => {
    const stats: TycoonWorldStats = {
      totalCorporations: 1,
      topCorp: null,
      allianceCount: 0,
      newestReport: null,
    };
    const section = buildMeanwhileIn2150Section(stats);

    expect(section).toContain('1');
    expect(section).toContain('corporation is competing');
    expect(section).not.toContain('Leading the pack');
    expect(section).not.toContain('alliance');
    expect(section).not.toContain('quarterly');
  });

  it('pluralizes corporations correctly', () => {
    const many = buildMeanwhileIn2150Section({
      totalCorporations: 5,
      topCorp: null,
      allianceCount: 0,
      newestReport: null,
    });
    expect(many).toContain('corporations are competing');

    const one = buildMeanwhileIn2150Section({
      totalCorporations: 1,
      topCorp: null,
      allianceCount: 0,
      newestReport: null,
    });
    expect(one).toContain('corporation is competing');
  });

  it('renders alliance count without a report line when only alliances are present', () => {
    const section = buildMeanwhileIn2150Section({
      totalCorporations: 10,
      topCorp: null,
      allianceCount: 1,
      newestReport: null,
    });
    expect(section).toContain('**1** player alliance active');
    expect(section).not.toContain('quarterly');
  });
});

describe('getTycoonWorldStats', () => {
  beforeEach(() => {
    mockGameProfileCount.mockReset();
    mockGameProfileFindFirst.mockReset();
    mockAllianceCount.mockReset();
    mockPublishedCorpReportFindFirst.mockReset();
  });

  it('returns null (never a fabricated stats object) when no corporations are registered', async () => {
    mockGameProfileCount.mockResolvedValue(0);
    const stats = await getTycoonWorldStats();
    expect(stats).toBeNull();
    // Should short-circuit before querying anything else.
    expect(mockGameProfileFindFirst).not.toHaveBeenCalled();
  });

  it('returns null when the count query throws, rather than fabricating stats', async () => {
    mockGameProfileCount.mockRejectedValue(new Error('db unreachable'));
    const stats = await getTycoonWorldStats();
    expect(stats).toBeNull();
  });

  it('returns real aggregate stats when the world is populated', async () => {
    mockGameProfileCount.mockResolvedValue(7);
    mockGameProfileFindFirst.mockResolvedValue({
      companyName: 'Helios Ventures',
      netWorth: 50_000_000,
      totalEarned: 50_000_000,
    });
    mockAllianceCount.mockResolvedValue(2);
    mockPublishedCorpReportFindFirst.mockResolvedValue(null);

    const stats = await getTycoonWorldStats();

    expect(stats).not.toBeNull();
    expect(stats?.totalCorporations).toBe(7);
    expect(stats?.topCorp?.companyName).toBe('Helios Ventures');
    expect(stats?.allianceCount).toBe(2);
    expect(stats?.newestReport).toBeNull();
  });

  it('degrades gracefully (non-null result) when the report lookup itself throws', async () => {
    mockGameProfileCount.mockResolvedValue(3);
    mockGameProfileFindFirst.mockResolvedValue({
      companyName: 'Solo Corp',
      netWorth: 1_000_000,
      totalEarned: 1_000_000,
    });
    mockAllianceCount.mockResolvedValue(0);
    mockPublishedCorpReportFindFirst.mockRejectedValue(new Error('table does not exist'));

    const stats = await getTycoonWorldStats();
    expect(stats).not.toBeNull();
    expect(stats?.newestReport).toBeNull();
  });
});
