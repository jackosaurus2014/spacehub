import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Launch Site Database | SpaceNexus',
  description: 'Comprehensive guide to 27 launch sites and spaceports worldwide with capabilities and launch rates.',
  openGraph: {
    title: 'Launch Site Database | SpaceNexus',
    description: 'Comprehensive guide to 27 launch sites and spaceports worldwide with capabilities and launch rates.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
