import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Safety',
  description: 'Learn how SpaceNexus handles your data. Transparent disclosure of data collection, sharing, security practices, and your choices — aligned with Google Play Data Safety requirements.',
  alternates: {
    canonical: 'https://spacenexus.us/data-safety',
  },
};

export default function DataSafetyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
