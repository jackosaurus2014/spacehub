import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Documentation | SpaceNexus Developer API',
  description:
    'Complete API reference for the SpaceNexus space industry data API. Endpoints for satellite tracking, launch schedules, company profiles, space weather, regulatory intelligence, and more.',
  keywords: [
    'SpaceNexus API documentation',
    'space industry API',
    'satellite data API',
    'space weather API',
    'launch schedule API',
    'space company data',
    'space regulatory API',
    'government contracts API',
  ],
  openGraph: {
    title: 'API Documentation | SpaceNexus Developer API',
    description:
      'Complete API reference for the SpaceNexus space industry data API. Endpoints for satellite tracking, launch schedules, company profiles, space weather, and more.',
    url: 'https://spacenexus.us/developer/docs',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'API Documentation | SpaceNexus Developer API',
    description:
      'Complete API reference for the SpaceNexus space industry data API. Endpoints for satellite tracking, launch schedules, company profiles, space weather, and more.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/developer/docs',
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
