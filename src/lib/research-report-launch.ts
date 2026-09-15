/**
 * SpaceNexus Launch Cadence and Slip Report — monthly.
 *
 * Two datasets, one release:
 *   CADENCE — SpaceEvent rows carrying a Launch Library 2 identifier and a
 *             terminal outcome. Counting these is arithmetic.
 *   SLIP    — the LaunchDateChange ledger, which records every manifest date
 *             move we observe. It starts on 2026-08-29 and CANNOT be
 *             backfilled by anyone, us included, because Launch Library keeps
 *             no revision history. That scarcity is the interesting part of
 *             this report and it is also the thing most likely to mislead, so
 *             every edition prints the ledger's start date beside the slips.
 *
 * The competitor sells a "launch cadence forecast". We do not forecast: a
 * forecast is a judgement and we have no analyst behind it. What we publish is
 * the record — attempts, outcomes, provider mix, and how much the manifest
 * moved — which is the input a reader forecasts FROM.
 */

import prisma from '@/lib/db';
import { isLaunchLibraryId } from '@/lib/charts/data';
import { PROVIDER_STATS_THRESHOLD, RECORDING_SINCE } from '@/lib/launch-slips';
import { VEHICLE_STATUS, statusAgeDays } from '@/lib/vehicle-status';
import {
  fmtCount,
  fmtShare,
  fmtSigned,
  hashEditionContent,
  median,
  type ReportFigure,
  type ReportTable,
  type ResearchReportEdition,
} from '@/lib/research-report-types';
import {
  getRelease,
  periodEndDate,
  periodLabel,
  periodRange,
  previousPeriod,
} from '@/lib/research-releases';

const RELEASE_ID = 'launch-cadence';

/** Terminal outcomes. 'scrubbed' and 'upcoming' are not attempts. */
const TERMINAL = ['completed', 'failed'];

interface LaunchRow {
  id: string;
  externalId: string | null;
  name: string;
  status: string;
  launchDate: Date | null;
  agency: string | null;
  rocket: string | null;
  location: string | null;
  country: string | null;
  orbitType: string | null;
}

const LAUNCH_SELECT = {
  id: true,
  externalId: true,
  name: true,
  status: true,
  launchDate: true,
  agency: true,
  rocket: true,
  location: true,
  country: true,
  orbitType: true,
} as const;

/** Launch Library rows only. Curated seed events are not launches to count. */
function realLaunches(rows: LaunchRow[]): LaunchRow[] {
  return rows.filter((r) => isLaunchLibraryId(r.externalId));
}

async function countAttempts(start: Date, end: Date): Promise<number> {
  const rows = (await prisma.spaceEvent.findMany({
    where: {
      externalId: { not: null },
      status: { in: TERMINAL },
      launchDate: { gte: start, lt: end },
    },
    select: { externalId: true },
  })) as { externalId: string | null }[];
  return rows.filter((r) => isLaunchLibraryId(r.externalId)).length;
}

export async function buildLaunchCadenceEdition(period: string): Promise<ResearchReportEdition> {
  const release = getRelease(RELEASE_ID)!;
  const range = periodRange('monthly', period);
  if (!range) throw new Error(`Invalid month: ${period}`);

  const priorKey = previousPeriod('monthly', period);
  const priorRange = priorKey ? periodRange('monthly', priorKey)! : null;
  const yearAgoKey = `${range.start.getUTCFullYear() - 1}-${String(range.start.getUTCMonth() + 1).padStart(2, '0')}`;
  const yearAgoRange = periodRange('monthly', yearAgoKey)!;

  // Year to date through the END of this month, and the same window last year.
  const ytdStart = new Date(Date.UTC(range.start.getUTCFullYear(), 0, 1));
  const priorYtdStart = new Date(Date.UTC(range.start.getUTCFullYear() - 1, 0, 1));
  const priorYtdEnd = new Date(Date.UTC(range.end.getUTCFullYear() - 1, range.end.getUTCMonth(), 1));

  const [monthRows, priorAttempts, yearAgoAttempts, ytdAttempts, priorYtdAttempts, slipRows] =
    await Promise.all([
      prisma.spaceEvent.findMany({
        where: {
          externalId: { not: null },
          status: { in: TERMINAL },
          launchDate: { gte: range.start, lt: range.end },
        },
        orderBy: { launchDate: 'asc' },
        select: LAUNCH_SELECT,
      }) as Promise<LaunchRow[]>,
      priorRange ? countAttempts(priorRange.start, priorRange.end) : Promise.resolve(0),
      countAttempts(yearAgoRange.start, yearAgoRange.end),
      countAttempts(ytdStart, range.end),
      countAttempts(priorYtdStart, priorYtdEnd),
      prisma.launchDateChange.findMany({
        where: { observedAt: { gte: range.start, lt: range.end } },
        orderBy: { observedAt: 'asc' },
        include: { event: { select: { name: true, agency: true, rocket: true } } },
      }),
    ]);

  const launches = realLaunches(monthRows);
  const attempts = launches.length;
  const successes = launches.filter((l) => l.status === 'completed').length;
  const failures = launches.filter((l) => l.status === 'failed').length;

  const computedAt = new Date().toISOString();
  const asOf = periodEndDate('monthly', period)!;
  const title = `${release.title}, ${periodLabel('monthly', period)}`;

  // --- Slips ---------------------------------------------------------------
  // The ledger is live-recorded only. A month that ends before recording
  // started has no slip data, and the report says so rather than reporting 0.
  const ledgerStart = new Date(`${RECORDING_SINCE}T00:00:00Z`);
  const slipLedgerCoversMonth = range.end.getTime() > ledgerStart.getTime();
  const slipLedgerPartial =
    slipLedgerCoversMonth && range.start.getTime() < ledgerStart.getTime();

  const slipDeltas = slipRows.map(
    (c) => (c.toDate.getTime() - c.fromDate.getTime()) / 86_400_000
  );
  const slipsLater = slipDeltas.filter((d) => d > 0);
  const slipsEarlier = slipDeltas.filter((d) => d < 0);
  const netDays = slipDeltas.reduce((s, d) => s + d, 0);
  const distinctSlipped = new Set(slipRows.map((r) => r.eventId)).size;

  const providerSlips = new Map<string, { changes: number; sum: number; later: number }>();
  for (const c of slipRows) {
    const provider = c.event?.agency || 'Unknown';
    const delta = (c.toDate.getTime() - c.fromDate.getTime()) / 86_400_000;
    const bucket = providerSlips.get(provider) ?? { changes: 0, sum: 0, later: 0 };
    bucket.changes += 1;
    bucket.sum += delta;
    if (delta > 0) bucket.later += 1;
    providerSlips.set(provider, bucket);
  }
  const slipStatsUnlocked = slipRows.length >= PROVIDER_STATS_THRESHOLD;

  if (attempts === 0 && slipRows.length === 0) {
    const coverage = [
      slipLedgerCoversMonth
        ? 'No launches and no manifest changes are recorded for this month.'
        : `No launches are recorded for this month, and the slip ledger did not start until ${RECORDING_SINCE}, so no schedule movement can be reported for it.`,
      'This describes our tracker, not the world. A month with no recorded launches means our launch history does not reach it.',
    ];
    return {
      releaseId: RELEASE_ID,
      period,
      periodLabel: periodLabel('monthly', period),
      title,
      asOf,
      computedAt,
      headline: [],
      tables: [],
      coverage,
      inputHash: hashEditionContent([], []),
      empty: true,
      emptyReason: 'Our launch history holds no launches for this month.',
    };
  }

  // --- Provider and vehicle mix -------------------------------------------
  const byProvider = new Map<string, { attempts: number; successes: number; failures: number }>();
  const byVehicle = new Map<string, { attempts: number; successes: number; failures: number }>();
  for (const l of launches) {
    const p = l.agency || 'Unattributed';
    const provider = byProvider.get(p) ?? { attempts: 0, successes: 0, failures: 0 };
    provider.attempts += 1;
    if (l.status === 'completed') provider.successes += 1;
    if (l.status === 'failed') provider.failures += 1;
    byProvider.set(p, provider);

    const v = l.rocket || 'Unrecorded';
    const vehicle = byVehicle.get(v) ?? { attempts: 0, successes: 0, failures: 0 };
    vehicle.attempts += 1;
    if (l.status === 'completed') vehicle.successes += 1;
    if (l.status === 'failed') vehicle.failures += 1;
    byVehicle.set(v, vehicle);
  }

  const providerRows = Array.from(byProvider.entries())
    .map(([provider, v]) => ({
      provider,
      attempts: v.attempts,
      successes: v.successes,
      failures: v.failures,
      sharePercent: Math.round((v.attempts / attempts) * 1000) / 10,
    }))
    .sort((a, b) => b.attempts - a.attempts || a.provider.localeCompare(b.provider));

  const vehicleRows = Array.from(byVehicle.entries())
    .map(([vehicle, v]) => ({
      vehicle,
      attempts: v.attempts,
      successes: v.successes,
      failures: v.failures,
    }))
    .sort((a, b) => b.attempts - a.attempts || a.vehicle.localeCompare(b.vehicle));

  // --- Vehicle standings, from the dated fact sheet ------------------------
  const now = new Date();
  const standingRows = Object.values(VEHICLE_STATUS)
    .filter((v) => v.standing !== 'flying')
    .map((v) => ({
      vehicle: v.name,
      standing: v.standing,
      headline: v.headline,
      nextMilestone: v.nextMilestone ?? '',
      asOf: v.asOf,
      sheetAgeDays: statusAgeDays(v, now),
    }))
    .sort((a, b) => a.vehicle.localeCompare(b.vehicle));

  const headline: ReportFigure[] = [
    {
      label: 'Launch attempts',
      value: fmtCount(attempts),
      detail:
        priorKey && priorAttempts > 0
          ? `${fmtSigned(attempts - priorAttempts)} vs ${periodLabel('monthly', priorKey)}`
          : 'No comparable prior month in our records',
    },
    {
      label: 'Outcomes',
      value: `${fmtCount(successes)} / ${fmtCount(failures)}`,
      detail:
        attempts > 0
          ? `${fmtShare(successes, attempts)} success rate this month`
          : 'No attempts recorded',
    },
    {
      label: 'Year to date',
      value: fmtCount(ytdAttempts),
      detail:
        priorYtdAttempts > 0
          ? `${fmtSigned(ytdAttempts - priorYtdAttempts)} vs the same point in ${range.start.getUTCFullYear() - 1}`
          : `No comparable ${range.start.getUTCFullYear() - 1} window in our records`,
    },
    {
      label: 'Manifest changes observed',
      value: slipLedgerCoversMonth ? fmtCount(slipRows.length) : 'Not recorded',
      detail: slipLedgerCoversMonth
        ? `${fmtCount(distinctSlipped)} launches moved, net ${fmtSigned(Math.round(netDays))} days`
        : `The slip ledger starts ${RECORDING_SINCE}`,
    },
  ];

  const tables: ReportTable[] = [
    {
      id: 'providers',
      label: 'Attempts by provider',
      description:
        'Every provider with a recorded launch attempt in the month, with outcomes and share of the month.',
      columns: [
        { key: 'rank', label: '#', numeric: true },
        { key: 'provider', label: 'Provider' },
        { key: 'attempts', label: 'Attempts', numeric: true },
        { key: 'successes', label: 'Successes', numeric: true },
        { key: 'failures', label: 'Failures', numeric: true },
        { key: 'sharePercent', label: 'Share of month', numeric: true },
      ],
      rows: providerRows.map((r, i) => ({ rank: i + 1, ...r })),
      publicRowLimit: 10,
      note: 'Provider names are as Launch Library records them; no names are merged, so a group launching under two recorded names appears twice.',
    },
    {
      id: 'vehicles',
      label: 'Attempts by vehicle',
      description: 'Launch vehicles flown in the month, by attempts.',
      columns: [
        { key: 'rank', label: '#', numeric: true },
        { key: 'vehicle', label: 'Vehicle' },
        { key: 'attempts', label: 'Attempts', numeric: true },
        { key: 'successes', label: 'Successes', numeric: true },
        { key: 'failures', label: 'Failures', numeric: true },
      ],
      rows: vehicleRows.map((r, i) => ({ rank: i + 1, ...r })),
      publicRowLimit: 10,
    },
    {
      id: 'launches',
      label: 'Launches behind these tables',
      description:
        'Every recorded launch attempt in the month, in date order. This is the row set the tables above are computed from.',
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'mission', label: 'Mission' },
        { key: 'provider', label: 'Provider' },
        { key: 'vehicle', label: 'Vehicle' },
        { key: 'outcome', label: 'Outcome' },
        { key: 'site', label: 'Site' },
      ],
      rows: launches.map((l) => ({
        date: l.launchDate ? l.launchDate.toISOString().slice(0, 10) : '',
        mission: l.name,
        provider: l.agency ?? '',
        vehicle: l.rocket ?? '',
        outcome: l.status === 'completed' ? 'success' : 'failure',
        site: l.location ?? '',
        country: l.country ?? '',
        orbit: l.orbitType ?? '',
        eventId: l.id,
      })),
      publicRowLimit: 10,
    },
    {
      id: 'slips',
      label: 'Manifest changes observed in the month',
      description: slipLedgerCoversMonth
        ? 'Every launch date move our ledger recorded inside the month. Positive days moved later; negative days moved earlier.'
        : `The slip ledger began recording on ${RECORDING_SINCE}, after this month ended. There is nothing to report, which is different from nothing having happened.`,
      columns: [
        { key: 'observedAt', label: 'Observed' },
        { key: 'mission', label: 'Mission' },
        { key: 'provider', label: 'Provider' },
        { key: 'fromDate', label: 'From' },
        { key: 'toDate', label: 'To' },
        { key: 'deltaDays', label: 'Days moved', numeric: true },
      ],
      rows: slipRows
        .slice()
        .sort(
          (a, b) =>
            Math.abs(b.toDate.getTime() - b.fromDate.getTime()) -
            Math.abs(a.toDate.getTime() - a.fromDate.getTime())
        )
        .map((c) => ({
          observedAt: c.observedAt.toISOString().slice(0, 10),
          mission: c.event?.name ?? 'Unknown mission',
          provider: c.event?.agency ?? '',
          vehicle: c.event?.rocket ?? '',
          fromDate: c.fromDate.toISOString().slice(0, 10),
          toDate: c.toDate.toISOString().slice(0, 10),
          deltaDays: Math.round(((c.toDate.getTime() - c.fromDate.getTime()) / 86_400_000) * 10) / 10,
          eventId: c.eventId,
        })),
      publicRowLimit: 10,
      note: slipLedgerPartial
        ? `Recording started ${RECORDING_SINCE}, part-way through this month. The figures cover ${RECORDING_SINCE} to month end only.`
        : undefined,
    },
    {
      id: 'slips-by-provider',
      label: 'Schedule movement by provider',
      description: slipStatsUnlocked
        ? 'Providers whose launches moved, by number of observed changes.'
        : `Held back until the month's ledger holds at least ${PROVIDER_STATS_THRESHOLD} observations. This month holds ${slipRows.length}, and a rate computed from that many would not mean anything.`,
      columns: [
        { key: 'provider', label: 'Provider' },
        { key: 'changes', label: 'Changes', numeric: true },
        { key: 'movedLater', label: 'Moved later', numeric: true },
        { key: 'avgDays', label: 'Mean days', numeric: true },
        { key: 'netDays', label: 'Net days', numeric: true },
      ],
      rows: slipStatsUnlocked
        ? Array.from(providerSlips.entries())
            .map(([provider, v]) => ({
              provider,
              changes: v.changes,
              movedLater: v.later,
              avgDays: Math.round((v.sum / v.changes) * 10) / 10,
              netDays: Math.round(v.sum),
            }))
            .sort((a, b) => b.changes - a.changes || a.provider.localeCompare(b.provider))
        : [],
      publicRowLimit: 10,
    },
    {
      id: 'vehicle-standing',
      label: 'Vehicles not currently flying',
      description:
        'From the hand-maintained vehicle status sheet. Each row carries the date the entry was last checked, so a stale sheet is visible rather than silently trusted.',
      columns: [
        { key: 'vehicle', label: 'Vehicle' },
        { key: 'standing', label: 'Standing' },
        { key: 'headline', label: 'Where it stands' },
        { key: 'asOf', label: 'Sheet as of' },
        { key: 'sheetAgeDays', label: 'Days since checked', numeric: true },
      ],
      rows: standingRows,
      publicRowLimit: 10,
      note: 'Standings are editorial fact-keeping, not computed from the tracker. They are the one hand-maintained input on this page and they are labelled as such.',
    },
  ];

  const coverage = [
    `This edition counts ${attempts} launch attempts recorded for ${periodLabel('monthly', period)} — rows carrying a Launch Library identifier and a terminal outcome. Scrubbed and still-upcoming launches are not attempts and are not counted.`,
    'Launch counts describe our tracker. A month our launch history does not reach reports zero attempts, which is why every edition prints the count rather than only a rate.',
    slipLedgerCoversMonth
      ? `Schedule movement comes from a ledger that began recording on ${RECORDING_SINCE} and cannot be backfilled — Launch Library keeps no revision history, so no one can reconstruct moves observed before that date.${slipLedgerPartial ? ' Recording started part-way through this month, so the slip figures cover only part of it.' : ''}`
      : `Schedule movement is not available for this month: the ledger began recording on ${RECORDING_SINCE}, after the month ended.`,
    slipStatsUnlocked
      ? `Per-provider slip statistics are computed over ${slipRows.length} observations this month.`
      : `Per-provider slip statistics are withheld this month: ${slipRows.length} observations is below the ${PROVIDER_STATS_THRESHOLD} needed for a rate to mean anything.`,
    slipDeltas.length > 0
      ? `Of ${slipDeltas.length} observed changes, ${slipsLater.length} moved a launch later and ${slipsEarlier.length} moved one earlier. The median move was ${median(slipDeltas.map((d) => Math.round(d * 10) / 10)) ?? 0} days.`
      : 'No manifest changes were observed inside this month.',
    'No figure on this page is a forecast. This release publishes the record; it does not project cadence.',
  ];

  return {
    releaseId: RELEASE_ID,
    period,
    periodLabel: periodLabel('monthly', period),
    title,
    asOf,
    computedAt,
    headline,
    tables,
    coverage,
    inputHash: hashEditionContent(headline, tables),
    empty: false,
  };
}
