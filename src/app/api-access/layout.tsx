import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Access | SpaceNexus',
  description:
    'Build space intelligence into your applications with the SpaceNexus API. REST endpoints, JSON responses, 99.9% uptime. Free, Developer, and Enterprise tiers available.',
  alternates: { canonical: 'https://spacenexus.us/api-access' },
  openGraph: {
    title: 'SpaceNexus API - Space Intelligence for Developers',
    description:
      'REST API with real-time space industry data. Launch schedules, company intelligence, market data, and more.',
    url: 'https://spacenexus.us/api-access',
  },
};

export default function ApiAccessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
