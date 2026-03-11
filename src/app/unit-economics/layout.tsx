import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Business Unit Economics Calculator - Revenue, Costs & Break-Even',
  description: 'Model unit economics for space businesses including satellite imagery, launch services, and space tourism. Calculate margins, burn rate, runway, CAC, LTV, and break-even timelines.',
  openGraph: {
    title: 'Space Business Unit Economics Calculator - Revenue, Costs & Break-Even | SpaceNexus',
    description: 'Model unit economics for space businesses including satellite imagery, launch services, and space tourism. Calculate margins, burn rate, runway, CAC, LTV, and break-even timelines.',
    type: 'website',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Space Business Unit Economics Calculator - Revenue, Costs & Break-Even | SpaceNexus',
    description: 'Model unit economics for space businesses including satellite imagery, launch services, and space tourism. Calculate margins, burn rate, runway, CAC, LTV, and break-even timelines.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/unit-economics',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
