import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Business Unit Economics Calculator - Revenue, Costs & Break-Even | SpaceNexus',
  description: 'Model unit economics for space businesses including satellite imagery, launch services, and space tourism. Calculate margins, burn rate, runway, CAC, LTV, and break-even timelines.',
  openGraph: {
    title: 'Space Business Unit Economics Calculator - Revenue, Costs & Break-Even | SpaceNexus',
    description: 'Model unit economics for space businesses including satellite imagery, launch services, and space tourism. Calculate margins, burn rate, runway, CAC, LTV, and break-even timelines.',
    type: 'website',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
