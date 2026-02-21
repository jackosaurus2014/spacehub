import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Explorer | SpaceNexus Developer API',
  description:
    'Interactive API explorer for the SpaceNexus space industry data API. Test endpoints, inspect responses, and build integration code in real-time.',
  keywords: [
    'SpaceNexus API explorer',
    'space API testing tool',
    'satellite data API test',
    'interactive API console',
  ],
  openGraph: {
    title: 'API Explorer | SpaceNexus Developer API',
    description:
      'Interactive API explorer for the SpaceNexus space industry data API. Test endpoints, inspect responses, and build integration code in real-time.',
    url: 'https://spacenexus.us/developer/explorer',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'API Explorer | SpaceNexus Developer API',
    description:
      'Interactive API explorer for the SpaceNexus space industry data API. Test endpoints, inspect responses, and build integration code in real-time.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/developer/explorer',
  },
};

export default function ExplorerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
