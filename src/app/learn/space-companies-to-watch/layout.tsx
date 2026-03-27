import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Top Space Companies to Watch',
  description: 'Discover the most innovative and influential space companies to watch. Profiles, funding data, and key milestones for leading aerospace firms.',
  alternates: {
    canonical: 'https://spacenexus.us/learn/space-companies-to-watch',
  },
  openGraph: {
    title: 'Top Space Companies to Watch | SpaceNexus',
    description: 'Discover the most innovative and influential space companies to watch. Profiles, funding data, and key milestones for leading aerospace firms.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
