import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us - Get in Touch',
  description: 'Contact the SpaceNexus team for support, partnership inquiries, or enterprise pricing. We respond within 24 hours.',
  keywords: ['contact SpaceNexus', 'space platform support', 'aerospace data help'],
  openGraph: {
    title: 'Contact SpaceNexus',
    description: 'Get in touch with the SpaceNexus team for support, partnerships, or enterprise pricing.',
    url: 'https://spacenexus.us/contact',
  },
  alternates: {
    canonical: 'https://spacenexus.us/contact',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
