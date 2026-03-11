import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Weather Widget',
  description: 'Embeddable space weather widget displaying Kp index, solar wind speed, geomagnetic storm alerts, and current space weather conditions.',
  openGraph: {
    title: 'Space Weather Widget | SpaceNexus',
    description: 'Embeddable space weather widget displaying Kp index, solar wind speed, geomagnetic storm alerts, and current space weather conditions.',
  },
};

export default function SpaceWeatherWidgetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
