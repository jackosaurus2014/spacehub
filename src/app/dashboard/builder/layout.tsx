import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard Builder',
  description: 'Build custom dashboards with widgets for satellite tracking, market data, launch schedules, and space weather monitoring.',
};

export default function DashboardBuilderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
