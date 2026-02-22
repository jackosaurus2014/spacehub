import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Provider Dashboard',
  description: 'Manage your service listings, proposals, reviews, and business opportunities on SpaceNexus Marketplace.',
};

export default function ProviderDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
