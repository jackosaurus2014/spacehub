import { getLaunchCadence } from '@/lib/launch-cadence';
import { getSatelliteTotals } from '@/lib/satellite-counts';
import SpaceStatsClient from './SpaceStatsClient';

// Thin server wrapper (2026-09-01): the stats page is a client component, so
// the two live trackers it can honestly cite — launch cadence (Launch Library
// 2) and the SATCAT snapshot — are fetched here and passed down. Both helpers
// are unstable_cache'd for an hour and fail soft to null, in which case the
// client renders its dated reference figures. Railway's build container has
// no DB access, hence force-dynamic.
export const dynamic = 'force-dynamic';

export default async function SpaceStatsPage() {
  const [cadence, satellites] = await Promise.all([
    getLaunchCadence().catch(() => null),
    getSatelliteTotals().catch(() => null),
  ]);
  return <SpaceStatsClient cadence={cadence} satellites={satellites} />;
}
