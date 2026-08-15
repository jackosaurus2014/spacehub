/**
 * @jest-environment node
 */

/**
 * Regression test for the daily-refresh partitioned chain
 * (src/lib/refresh-daily-chain.ts — refreshDaily(), consumed by
 * POST /api/refresh?type=daily in src/app/api/refresh/route.ts).
 *
 * Historical bug: refreshDaily() ran ~19 initialize*() calls as one
 * sequential await chain under a single outer try/catch. If any single
 * step threw, every step after it in the sequence silently never ran —
 * for the rest of that invocation, and (since the underlying cause
 * usually persisted) every day after, until someone noticed data had
 * gone stale. This test locks in the fix: each step must be isolated so
 * a thrown error in one step never prevents later steps from running.
 */

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// ── Stub every initializer refreshDaily() calls. "workforce" is the one
// that throws — chosen because it sits mid-chain, mirroring the real
// incident where a mid-chain throw froze every step after it. ──────────
jest.mock('@/lib/blogs-fetcher', () => ({
  initializeBlogSources: jest.fn().mockResolvedValue(undefined),
  fetchBlogPosts: jest.fn().mockResolvedValue(5),
}));
jest.mock('@/lib/company-roster', () => ({
  initializeCompanies: jest.fn().mockResolvedValue(10),
}));
jest.mock('@/lib/resources-data', () => ({
  initializeResources: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/opportunities-data', () => ({
  initializeOpportunities: jest.fn().mockResolvedValue(undefined),
  runAIAnalysis: jest.fn(),
}));
jest.mock('@/lib/compliance-data', () => ({
  initializeComplianceData: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/solar-exploration-data', () => ({
  initializeSolarExplorationData: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/spectrum-data', () => ({
  initializeSpectrumData: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/fetchers/spectrum-filings-fetcher', () => ({
  fetchAndStoreSpectrumFilings: jest.fn().mockResolvedValue(0),
}));
jest.mock('@/lib/space-insurance-data', () => ({
  initializeSpaceInsuranceData: jest.fn().mockResolvedValue(undefined),
}));
// The failing step: throws to simulate the real incident.
jest.mock('@/lib/workforce-data', () => ({
  initializeWorkforceData: jest.fn().mockRejectedValue(new Error('simulated workforce initializer failure')),
}));
jest.mock('@/lib/solar-flare-data', () => ({
  initializeSolarFlareData: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/orbital-slots-data', () => ({
  initializeOrbitalData: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/launch-windows-data', () => ({
  initializeLaunchWindowsData: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/debris-data', () => ({
  initializeDebrisData: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/operational-awareness-data', () => ({
  initializeOperationalAwarenessData: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/space-mining-data', () => ({
  initializeSpaceMiningData: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/blueprint-data', () => ({
  initializeBlueprintData: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/government-contracts-data', () => ({
  initializeGovernmentContracts: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/orbital-services-data', () => ({
  initializeOrbitalServices: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/regulatory-hub-data', () => ({
  initializeRegulatoryHubData: jest.fn().mockResolvedValue(undefined),
}));

import { initializeWorkforceData } from '@/lib/workforce-data';
import { initializeLaunchWindowsData } from '@/lib/launch-windows-data';
import { initializeRegulatoryHubData } from '@/lib/regulatory-hub-data';
import { refreshDaily } from '@/lib/refresh-daily-chain';

describe('refreshDaily() partitioned chain', () => {
  it('continues running later steps after an earlier step throws', async () => {
    const { results, stepResults } = await refreshDaily();

    expect(initializeWorkforceData).toHaveBeenCalled();
    // Steps *after* the failing "workforce" step must still have run —
    // this is the core regression check.
    expect(initializeLaunchWindowsData).toHaveBeenCalled();
    expect(initializeRegulatoryHubData).toHaveBeenCalled();

    // The failing step is reported as failed, not silently dropped.
    const workforceStep = stepResults.find((s) => s.step === 'workforce');
    expect(workforceStep?.ok).toBe(false);
    expect(workforceStep?.error).toContain('simulated workforce initializer failure');
    expect(results.workforce).toContain('FAILED');

    // Steps after the failure are reported as having succeeded.
    const launchWindowsStep = stepResults.find((s) => s.step === 'launchWindows');
    const regulatoryHubStep = stepResults.find((s) => s.step === 'regulatoryHub');
    expect(launchWindowsStep?.ok).toBe(true);
    expect(regulatoryHubStep?.ok).toBe(true);

    // Every step in the chain produced a result — none were skipped.
    const stepNames = stepResults.map((s) => s.step);
    expect(stepNames).toEqual([
      'blogs', 'companies', 'resources', 'opportunities', 'compliance',
      'solarExploration', 'spectrum', 'spaceInsurance', 'workforce',
      'solarFlares', 'orbitalSlots', 'launchWindows', 'debris',
      'operationalAwareness', 'spaceMining', 'blueprints',
      'governmentContracts', 'orbitalServices', 'regulatoryHub',
    ]);

    // Overall chain reports a mix — one failure, everything else ok.
    const failedCount = stepResults.filter((s) => !s.ok).length;
    expect(failedCount).toBe(1);
    expect(stepResults.length - failedCount).toBe(stepResults.length - 1);
  });

  it('reports full success when every step succeeds', async () => {
    (initializeWorkforceData as jest.Mock).mockResolvedValueOnce({ jobPostings: 1, trends: 1 });

    const { stepResults } = await refreshDaily();
    expect(stepResults.every((s) => s.ok)).toBe(true);
  });
});
