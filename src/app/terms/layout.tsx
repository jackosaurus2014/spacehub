import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | SpaceNexus',
  description: 'Read the SpaceNexus terms of service governing the use of our space industry intelligence platform.',
  openGraph: {
    title: 'Terms of Service | SpaceNexus',
    description: 'Read the SpaceNexus terms of service governing the use of our space industry intelligence platform.',
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
