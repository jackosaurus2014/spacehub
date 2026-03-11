import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Market Snapshot Widget',
  description: 'Embeddable market snapshot widget showing top space industry stock movers and market trends in real time.',
  openGraph: {
    title: 'Market Snapshot Widget | SpaceNexus',
    description: 'Embeddable market snapshot widget showing top space industry stock movers and market trends in real time.',
  },
};

export default function MarketSnapshotWidgetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
