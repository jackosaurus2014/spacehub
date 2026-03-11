import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Next Launch Widget',
  description: 'Embeddable countdown widget for the next upcoming space launch. Shows mission details, rocket type, launch site, and live countdown timer.',
  openGraph: {
    title: 'Next Launch Widget | SpaceNexus',
    description: 'Embeddable countdown widget for the next upcoming space launch. Shows mission details, rocket type, launch site, and live countdown timer.',
  },
};

export default function NextLaunchWidgetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
