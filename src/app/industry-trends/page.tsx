import { getSatelliteTotals } from '@/lib/satellite-counts';
import IndustryTrendsClient from './IndustryTrendsClient';

// Thin server wrapper (2026-09-01): the trends page is a client component.
// The one figure in it the site tracks itself — objects in orbit, cited by
// the space-sustainability trend — is fetched here from the SATCAT snapshot
// and passed down; it fails soft to null, in which case the client keeps its
// dated reference figure. Railway's build container has no DB access, hence
// force-dynamic.
export const dynamic = 'force-dynamic';

export default async function IndustryTrendsPage() {
  const satellites = await getSatelliteTotals().catch(() => null);
  return <IndustryTrendsClient satellites={satellites} />;
}
