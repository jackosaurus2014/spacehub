import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Contract Awards | Federal Procurement Intelligence',
  description:
    'Track federal contract awards in the space industry. Monitor NASA, DoD, and agency spending on space technology, satellites, and launch services.',
  alternates: {
    canonical: 'https://spacenexus.us/procurement/awards',
  },
  openGraph: {
    title: 'Space Contract Awards | SpaceNexus',
    description:
      'Real-time federal contract awards for the space industry.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
