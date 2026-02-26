import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Industry Trends & Analysis | SpaceNexus',
  description: 'Data-backed analysis of the top trends shaping the space industry from reusability to AI operations.',
  openGraph: {
    title: 'Industry Trends & Analysis | SpaceNexus',
    description: 'Data-backed analysis of the top trends shaping the space industry from reusability to AI operations.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
