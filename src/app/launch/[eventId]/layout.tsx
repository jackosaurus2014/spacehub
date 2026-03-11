import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | SpaceNexus Launch Tracker',
    default: 'Launch Event Details',
  },
  description: 'Real-time launch event details including countdown, mission parameters, vehicle information, and live status updates.',
  openGraph: {
    title: 'Launch Event Details | SpaceNexus',
    description: 'Real-time launch event details including countdown, mission parameters, vehicle information, and live status updates.',
    siteName: 'SpaceNexus',
  },
};

export default function LaunchEventLayout({ children }: { children: React.ReactNode }) {
  return children;
}
