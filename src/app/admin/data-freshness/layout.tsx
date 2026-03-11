import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Freshness Monitor',
  description: 'Monitor data freshness and staleness across all SpaceNexus modules. Track refresh schedules, TTL policies, and data source health.',
  openGraph: {
    title: 'Data Freshness Monitor | SpaceNexus',
    description: 'Monitor data freshness and staleness across all SpaceNexus modules. Track refresh schedules, TTL policies, and data source health.',
  },
};

export default function DataFreshnessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
