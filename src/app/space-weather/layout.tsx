import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Weather Dashboard | SpaceNexus',
  description: 'Real-time space weather conditions, 7-day forecast, and impact assessments for satellite operations.',
  openGraph: {
    title: 'Space Weather Dashboard | SpaceNexus',
    description: 'Real-time space weather conditions, 7-day forecast, and impact assessments for satellite operations.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
