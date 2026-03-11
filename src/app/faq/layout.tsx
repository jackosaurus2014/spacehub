import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ - Frequently Asked Questions',
  description:
    'Get answers about SpaceNexus space industry intelligence platform. Learn about satellite tracking, AI market analysis, company profiles, investment tools, regulatory compliance, API access, and more.',
  keywords: [
    'SpaceNexus FAQ',
    'space industry platform help',
    'satellite tracking questions',
    'space investment tools',
    'space market analysis',
    'space startup resources',
    'space regulatory compliance',
    'space API access',
  ],
  openGraph: {
    title: 'SpaceNexus FAQ - Frequently Asked Questions',
    description:
      'Find answers about satellite tracking, AI market analysis, company intelligence, investment tools, and more on SpaceNexus.',
    url: 'https://spacenexus.us/faq',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'SpaceNexus FAQ',
    description:
      'Get answers about SpaceNexus space industry intelligence platform features, pricing, and technical details.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/faq',
  },
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return children;
}
