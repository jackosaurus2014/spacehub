import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Launch Window Calculator',
  description: 'Calculate optimal launch windows for LEO, GTO, lunar, and interplanetary missions. Orbital mechanics tools with delta-v budgets and transfer trajectory data.',
  keywords: [
    'launch window',
    'orbital mechanics',
    'transfer orbit',
    'delta-v calculator',
    'Hohmann transfer',
  ],
  openGraph: {
    title: 'Launch Window Calculator | SpaceNexus',
    description: 'Calculate optimal launch windows for LEO, GTO, lunar, and interplanetary missions. Orbital mechanics tools with delta-v budgets and transfer trajectory data.',
    url: 'https://spacenexus.us/launch-windows',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Launch Window Calculator | SpaceNexus',
    description: 'Calculate optimal launch windows for LEO, GTO, lunar, and interplanetary missions. Orbital mechanics tools with delta-v budgets and transfer trajectory data.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/launch-windows',
  },
};

export default function LaunchWindowsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
