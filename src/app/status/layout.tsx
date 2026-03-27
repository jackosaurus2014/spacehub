import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'System Status',
  description: 'SpaceNexus system status. Check platform uptime, API availability, and service health.',
  alternates: {
    canonical: 'https://spacenexus.us/status',
  },
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
