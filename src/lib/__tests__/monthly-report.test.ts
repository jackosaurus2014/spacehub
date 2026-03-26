/**
 * @jest-environment node
 */

// Mock Prisma before importing the module under test
jest.mock('../db', () => ({
  __esModule: true,
  default: {
    spaceEvent: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    fundingRound: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    companyProfile: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    companyEvent: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    newsArticle: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  },
}));

// Mock logger to suppress output during tests
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { generateMonthlyReport } from '../monthly-report-generator';
import type { MonthlyReport, MonthlyReportSection } from '../monthly-report-generator';
import prisma from '../db';

// ===========================================================================
// 1. Report Structure
// ===========================================================================
describe('generateMonthlyReport — structure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a report with correct top-level fields', async () => {
    const report = await generateMonthlyReport();

    expect(report).toHaveProperty('month');
    expect(report).toHaveProperty('monthShort');
    expect(report).toHaveProperty('year');
    expect(report).toHaveProperty('generatedAt');
    expect(report).toHaveProperty('reportNumber');
    expect(report).toHaveProperty('heroStat');
    expect(report).toHaveProperty('sections');
  });

  it('generatedAt is a valid ISO date string', async () => {
    const report = await generateMonthlyReport();
    const parsed = new Date(report.generatedAt);
    expect(parsed.getTime()).not.toBeNaN();
  });

  it('heroStat has value and label fields', async () => {
    const report = await generateMonthlyReport();
    expect(report.heroStat).toHaveProperty('value');
    expect(report.heroStat).toHaveProperty('label');
    expect(report.heroStat.label).toBe('Launches This Month');
  });

  it('year is the current year', async () => {
    const report = await generateMonthlyReport();
    expect(report.year).toBe(new Date().getFullYear());
  });

  it('monthShort is a valid short month string', async () => {
    const report = await generateMonthlyReport();
    const validMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    expect(validMonths).toContain(report.monthShort);
  });
});

// ===========================================================================
// 2. Report Number Calculation
// ===========================================================================
describe('generateMonthlyReport — reportNumber', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('computes reportNumber as months since Jan 2026', async () => {
    const report = await generateMonthlyReport();
    const now = new Date();
    const expected = (now.getFullYear() - 2026) * 12 + now.getMonth() + 1;
    expect(report.reportNumber).toBe(expected);
  });

  it('reportNumber is a positive integer for dates after Jan 2026', async () => {
    const report = await generateMonthlyReport();
    // Current date is 2026-03-26 per the context, so reportNumber = 3
    expect(report.reportNumber).toBeGreaterThan(0);
    expect(Number.isInteger(report.reportNumber)).toBe(true);
  });
});

// ===========================================================================
// 3. Report Sections
// ===========================================================================
describe('generateMonthlyReport — sections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('contains at least 5 sections', async () => {
    const report = await generateMonthlyReport();
    // Expected sections: launch-activity, funding-investment, market-movers,
    // regulatory-watch, technology-milestones, month-ahead, industry-pulse
    expect(report.sections.length).toBeGreaterThanOrEqual(5);
  });

  it('each section has required fields: id, title, icon, stats, narrative', async () => {
    const report = await generateMonthlyReport();
    for (const section of report.sections) {
      expect(section).toHaveProperty('id');
      expect(section).toHaveProperty('title');
      expect(section).toHaveProperty('icon');
      expect(section).toHaveProperty('stats');
      expect(section).toHaveProperty('narrative');
      expect(typeof section.id).toBe('string');
      expect(typeof section.title).toBe('string');
      expect(typeof section.icon).toBe('string');
      expect(typeof section.narrative).toBe('string');
      expect(Array.isArray(section.stats)).toBe(true);
    }
  });

  it('includes a launch-activity section', async () => {
    const report = await generateMonthlyReport();
    const launchSection = report.sections.find(s => s.id === 'launch-activity');
    expect(launchSection).toBeDefined();
    expect(launchSection!.title).toBe('Launch Activity');
    expect(launchSection!.icon).toBe('rocket');
  });

  it('includes a funding-investment section', async () => {
    const report = await generateMonthlyReport();
    const fundingSection = report.sections.find(s => s.id === 'funding-investment');
    expect(fundingSection).toBeDefined();
    expect(fundingSection!.title).toBe('Funding & Investment');
  });

  it('includes a market-movers section', async () => {
    const report = await generateMonthlyReport();
    const marketSection = report.sections.find(s => s.id === 'market-movers');
    expect(marketSection).toBeDefined();
    expect(marketSection!.title).toBe('Market Movers');
  });

  it('includes a regulatory-watch section', async () => {
    const report = await generateMonthlyReport();
    const regSection = report.sections.find(s => s.id === 'regulatory-watch');
    expect(regSection).toBeDefined();
    expect(regSection!.title).toBe('Regulatory Watch');
  });

  it('includes a technology-milestones section', async () => {
    const report = await generateMonthlyReport();
    const techSection = report.sections.find(s => s.id === 'technology-milestones');
    expect(techSection).toBeDefined();
    expect(techSection!.title).toBe('Technology Milestones');
  });

  it('includes a month-ahead section', async () => {
    const report = await generateMonthlyReport();
    const aheadSection = report.sections.find(s => s.id === 'month-ahead');
    expect(aheadSection).toBeDefined();
    expect(aheadSection!.title).toBe('Month Ahead');
  });

  it('includes an industry-pulse section', async () => {
    const report = await generateMonthlyReport();
    const pulseSection = report.sections.find(s => s.id === 'industry-pulse');
    expect(pulseSection).toBeDefined();
    expect(pulseSection!.title).toBe('Industry Pulse');
  });
});

// ===========================================================================
// 4. Report with Prisma data
// ===========================================================================
describe('generateMonthlyReport — with data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses launch count as heroStat value', async () => {
    // Mock spaceEvent.count to return 12 for the first call (this month's launches)
    (prisma.spaceEvent.count as jest.Mock)
      .mockResolvedValueOnce(12) // thisMonthLaunches
      .mockResolvedValueOnce(10) // thisMonthSuccessful
      .mockResolvedValueOnce(8); // lastMonthLaunches

    (prisma.spaceEvent.findMany as jest.Mock)
      .mockResolvedValueOnce([]) // notableLaunches
      .mockResolvedValueOnce([]); // upcomingEvents

    const report = await generateMonthlyReport();
    expect(report.heroStat.value).toBe('12');
  });

  it('launch section stats reflect mocked data', async () => {
    (prisma.spaceEvent.count as jest.Mock)
      .mockResolvedValueOnce(20) // thisMonthLaunches
      .mockResolvedValueOnce(18) // thisMonthSuccessful
      .mockResolvedValueOnce(15); // lastMonthLaunches

    (prisma.spaceEvent.findMany as jest.Mock)
      .mockResolvedValueOnce([]) // notableLaunches
      .mockResolvedValueOnce([]); // upcomingEvents

    const report = await generateMonthlyReport();
    const launchSection = report.sections.find(s => s.id === 'launch-activity');
    expect(launchSection).toBeDefined();

    const totalStat = launchSection!.stats.find(s => s.label === 'Total Launches');
    expect(totalStat).toBeDefined();
    expect(totalStat!.value).toBe('20');

    const successStat = launchSection!.stats.find(s => s.label === 'Successful');
    expect(successStat).toBeDefined();
    expect(successStat!.value).toBe('18');
  });

  it('handles Prisma errors gracefully with fallback sections', async () => {
    // Make all Prisma calls reject
    (prisma.spaceEvent.count as jest.Mock).mockRejectedValue(new Error('DB error'));
    (prisma.spaceEvent.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));
    (prisma.fundingRound.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));
    (prisma.companyProfile.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));
    (prisma.companyProfile.count as jest.Mock).mockRejectedValue(new Error('DB error'));
    (prisma.companyEvent.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));
    (prisma.newsArticle.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));
    (prisma.newsArticle.count as jest.Mock).mockRejectedValue(new Error('DB error'));

    // Should not throw — each section catches errors independently
    const report = await generateMonthlyReport();

    // Report should still have sections (with fallback "Collecting..." data)
    expect(report.sections.length).toBeGreaterThanOrEqual(5);

    // Each section should have at least a narrative
    for (const section of report.sections) {
      expect(typeof section.narrative).toBe('string');
      expect(section.narrative.length).toBeGreaterThan(0);
    }
  });
});

// ===========================================================================
// 5. Section stat cards
// ===========================================================================
describe('generateMonthlyReport — stat cards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stat cards have at least label and value', async () => {
    const report = await generateMonthlyReport();
    for (const section of report.sections) {
      for (const stat of section.stats) {
        expect(stat).toHaveProperty('label');
        expect(stat).toHaveProperty('value');
        expect(typeof stat.label).toBe('string');
        expect(typeof stat.value).toBe('string');
      }
    }
  });

  it('changeType is one of positive, negative, neutral, or undefined', async () => {
    const report = await generateMonthlyReport();
    const validTypes = ['positive', 'negative', 'neutral', undefined];
    for (const section of report.sections) {
      for (const stat of section.stats) {
        expect(validTypes).toContain(stat.changeType);
      }
    }
  });
});
