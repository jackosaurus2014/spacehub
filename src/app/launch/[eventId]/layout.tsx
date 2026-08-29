import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | SpaceNexus Launch Tracker',
    default: 'Launch Event Details',
  },
  description: 'Real-time launch event details including countdown, mission parameters, vehicle information, and live status updates.',
  // openGraph deliberately NOT set here: page.tsx's generateMetadata builds a
  // per-launch card. A static one here used to win for every launch (2026-08-29).
};

export default function LaunchEventLayout({ children }: { children: React.ReactNode }) {
  return children;
}
