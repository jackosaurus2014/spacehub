// The daily-refresh chain used by POST /api/refresh?type=daily (and the
// default "run everything" path). Lives in its own module — rather than
// inline in src/app/api/refresh/route.ts — because Next.js App Router route
// files may only export HTTP method handlers plus a small whitelist of
// config constants (dynamic, revalidate, etc). Exporting `refreshDaily` and
// `DailyStepResult` directly from route.ts fails Next's typed-route check
// (`.next/types/app/api/refresh/route.ts` — "Property 'refreshDaily' is
// incompatible with index signature").
//
// Each entry in refreshDaily()'s sequential chain is independently
// try/caught: one step throwing must never prevent later steps from
// running. Historical bug: this used to be one big try/catch around all 19
// steps, so an exception at e.g. step 9 silently skipped steps 10-19 for
// the rest of that invocation — and every day after, until the underlying
// error was fixed, since nothing surfaced the partial failure.
import { fetchBlogPosts, initializeBlogSources } from '@/lib/blogs-fetcher';
import { initializeCompanies } from '@/lib/company-roster';
import { initializeResources } from '@/lib/resources-data';
import { initializeOpportunities } from '@/lib/opportunities-data';
import { initializeComplianceData } from '@/lib/compliance-data';
import { initializeSolarExplorationData } from '@/lib/solar-exploration-data';
import { initializeSpectrumData } from '@/lib/spectrum-data';
import { fetchAndStoreSpectrumFilings } from '@/lib/fetchers/spectrum-filings-fetcher';
import { initializeSpaceInsuranceData } from '@/lib/space-insurance-data';
import { initializeWorkforceData } from '@/lib/workforce-data';
import { initializeSolarFlareData } from '@/lib/solar-flare-data';
import { initializeOrbitalData } from '@/lib/orbital-slots-data';
import { initializeLaunchWindowsData } from '@/lib/launch-windows-data';
import { initializeDebrisData } from '@/lib/debris-data';
import { initializeOperationalAwarenessData } from '@/lib/operational-awareness-data';
import { initializeSpaceMiningData } from '@/lib/space-mining-data';
import { initializeBlueprintData } from '@/lib/blueprint-data';
import { initializeGovernmentContracts } from '@/lib/government-contracts-data';
import { initializeOrbitalServices } from '@/lib/orbital-services-data';
import { initializeRegulatoryHubData } from '@/lib/regulatory-hub-data';
import { logger } from '@/lib/logger';

export interface DailyStepResult {
  step: string;
  ok: boolean;
  error?: string;
  durationMs: number;
}

async function runDailyStep(
  step: string,
  fn: () => Promise<Record<string, string>>,
  results: Record<string, string>,
  stepResults: DailyStepResult[]
): Promise<void> {
  const start = Date.now();
  try {
    const stepOutput = await fn();
    Object.assign(results, stepOutput);
    stepResults.push({ step, ok: true, durationMs: Date.now() - start });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`refreshDaily: step "${step}" failed — continuing to next step`, { step, error: message });
    results[step] = `FAILED: ${message}`;
    stepResults.push({ step, ok: false, error: message, durationMs: Date.now() - start });
  }
}

export async function refreshDaily(): Promise<{ results: Record<string, string>; stepResults: DailyStepResult[] }> {
  const results: Record<string, string> = {};
  const stepResults: DailyStepResult[] = [];

  await runDailyStep('blogs', async () => {
    await initializeBlogSources();
    const blogCount = await fetchBlogPosts();
    return { blogs: `Refreshed ${blogCount} blog posts` };
  }, results, stepResults);

  await runDailyStep('companies', async () => {
    const companyCount = await initializeCompanies();
    return { companies: `CompanyProfile canonical (${companyCount} companies; refreshed via scripts)` };
  }, results, stepResults);

  await runDailyStep('resources', async () => {
    await initializeResources();
    return { resources: 'Refreshed' };
  }, results, stepResults);

  await runDailyStep('opportunities', async () => {
    await initializeOpportunities();
    return { opportunities: 'Refreshed' };
  }, results, stepResults);

  await runDailyStep('compliance', async () => {
    await initializeComplianceData();
    return { compliance: 'Refreshed' };
  }, results, stepResults);

  await runDailyStep('solarExploration', async () => {
    await initializeSolarExplorationData();
    return { solarExploration: 'Refreshed' };
  }, results, stepResults);

  await runDailyStep('spectrum', async () => {
    // initializeSpectrumData() only ensures the curated reference seed exists
    // (create-if-missing; a no-op once seeded). The actual daily "refresh" is
    // the live FCC ECFS filings feed fetched below.
    await initializeSpectrumData();
    const spectrumFilingsCount = await fetchAndStoreSpectrumFilings();
    return { spectrum: `Reference data ensured; fetched ${spectrumFilingsCount} recent FCC filings` };
  }, results, stepResults);

  await runDailyStep('spaceInsurance', async () => {
    await initializeSpaceInsuranceData();
    return { spaceInsurance: 'Refreshed' };
  }, results, stepResults);

  await runDailyStep('workforce', async () => {
    await initializeWorkforceData();
    return { workforce: 'Refreshed' };
  }, results, stepResults);

  await runDailyStep('solarFlares', async () => {
    await initializeSolarFlareData();
    return { solarFlares: 'Refreshed' };
  }, results, stepResults);

  await runDailyStep('orbitalSlots', async () => {
    await initializeOrbitalData();
    return { orbitalSlots: 'Refreshed' };
  }, results, stepResults);

  await runDailyStep('launchWindows', async () => {
    await initializeLaunchWindowsData();
    return { launchWindows: 'Refreshed' };
  }, results, stepResults);

  await runDailyStep('debris', async () => {
    await initializeDebrisData();
    return { debris: 'Refreshed' };
  }, results, stepResults);

  await runDailyStep('operationalAwareness', async () => {
    await initializeOperationalAwarenessData();
    return { operationalAwareness: 'Refreshed' };
  }, results, stepResults);

  await runDailyStep('spaceMining', async () => {
    await initializeSpaceMiningData();
    return { spaceMining: 'Refreshed' };
  }, results, stepResults);

  await runDailyStep('blueprints', async () => {
    await initializeBlueprintData();
    return { blueprints: 'Refreshed' };
  }, results, stepResults);

  await runDailyStep('governmentContracts', async () => {
    await initializeGovernmentContracts();
    return { governmentContracts: 'Refreshed' };
  }, results, stepResults);

  await runDailyStep('orbitalServices', async () => {
    await initializeOrbitalServices();
    return { orbitalServices: 'Refreshed' };
  }, results, stepResults);

  await runDailyStep('regulatoryHub', async () => {
    await initializeRegulatoryHubData();
    return { regulatoryHub: 'Refreshed' };
  }, results, stepResults);

  // Newsletter digest is now sent on its own schedule (Mon/Thu) via /api/newsletter/send-digest
  // Daily refresh only handles data seeding — no newsletter sending here
  results.newsletterNote = 'Newsletter sends on Mon/Thu schedule via dedicated endpoint';

  return { results, stepResults };
}
