import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analytics | Admin Dashboard',
  description: 'SpaceNexus user analytics - registrations, subscription tiers, and growth metrics.',
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
