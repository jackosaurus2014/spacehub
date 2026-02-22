import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notifications',
  description: 'Stay updated with your SpaceNexus notifications, alerts, and activity updates.',
};

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
