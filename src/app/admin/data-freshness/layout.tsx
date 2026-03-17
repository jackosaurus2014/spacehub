import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Freshness Monitor | Admin',
  description: 'Monitor data freshness and staleness across all SpaceNexus modules. Track refresh schedules, TTL policies, circuit breakers, and data source health.',
  openGraph: {
    title: 'Data Freshness Monitor | SpaceNexus Admin',
    description: 'Monitor data freshness and staleness across all SpaceNexus modules. Track refresh schedules, TTL policies, circuit breakers, and data source health.',
  },
};

export default function DataFreshnessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
