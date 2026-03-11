import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Overview Guide',
  description: 'Comprehensive overview of the global space industry. Key sectors, major players, market trends, and the future of commercial space.',
  openGraph: {
    title: 'Space Industry Overview Guide | SpaceNexus',
    description: 'Comprehensive overview of the global space industry. Key sectors, major players, market trends, and the future of commercial space.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
