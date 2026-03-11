import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'SpaceNexus administration dashboard for managing users, content, and platform settings.',
  openGraph: {
    title: 'Admin Dashboard | SpaceNexus',
    description: 'SpaceNexus administration dashboard for managing users, content, and platform settings.',
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
