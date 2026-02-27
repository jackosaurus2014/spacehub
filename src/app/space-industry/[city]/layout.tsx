import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: 'Space Industry in %s | SpaceNexus',
    default: 'Space Industry by City | SpaceNexus',
  },
  description: 'Explore the space industry ecosystem by city. Discover local companies, facilities, job opportunities, and economic impact in key space hubs.',
  openGraph: {
    title: 'Space Industry by City | SpaceNexus',
    description: 'Explore the space industry ecosystem by city. Discover local companies, facilities, job opportunities, and economic impact in key space hubs.',
    siteName: 'SpaceNexus',
  },
};

export default function SpaceIndustryCityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
