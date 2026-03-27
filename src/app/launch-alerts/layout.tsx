import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Launch Alerts',
  description: 'Get notified about upcoming rocket launches. Set up custom alerts for SpaceX, NASA, and other launch providers.',
  alternates: {
    canonical: 'https://spacenexus.us/launch-alerts',
  },
};

export default function LaunchAlertsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
