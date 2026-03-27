import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Launch Dashboard',
  description: 'Real-time rocket launch tracking with live telemetry, mission phases, and community commentary for upcoming and past launches.',
  alternates: {
    canonical: 'https://spacenexus.us/launch',
  },
};

export default function LaunchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
