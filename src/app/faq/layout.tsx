import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ - Frequently Asked Questions',
  description: 'Find answers to common questions about SpaceNexus. Learn about our space industry intelligence platform, data sources, subscriptions, API access, and technical requirements.',
  keywords: ['SpaceNexus FAQ', 'space platform help', 'space data questions', 'satellite tracking help'],
  openGraph: {
    title: 'SpaceNexus FAQ - Frequently Asked Questions',
    description: 'Find answers to common questions about SpaceNexus space industry intelligence platform.',
    url: 'https://spacenexus.us/faq',
  },
  alternates: {
    canonical: 'https://spacenexus.us/faq',
  },
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return children;
}
