import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'User Management',
  description: 'Manage user accounts, roles, and permissions. View user activity, handle admin assignments, and review audit logs.',
  openGraph: {
    title: 'User Management | SpaceNexus',
    description: 'Manage user accounts, roles, and permissions. View user activity, handle admin assignments, and review audit logs.',
  },
};

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
