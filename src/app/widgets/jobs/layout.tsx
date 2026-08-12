import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Jobs Widget',
  description: 'Embeddable widget showing the live count of open space industry jobs and how many are at private/pre-IPO companies, sourced from the SpaceNexus jobs board.',
  openGraph: {
    title: 'Space Jobs Widget | SpaceNexus',
    description: 'Embeddable widget showing the live count of open space industry jobs and how many are at private/pre-IPO companies, sourced from the SpaceNexus jobs board.',
  },
};

export default function JobsWidgetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
