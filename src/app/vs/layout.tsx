import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Platform Comparisons',
  description: 'Compare space industry platforms. See how SpaceNexus compares to alternatives for space intelligence.',
  alternates: {
    canonical: 'https://spacenexus.us/vs',
  },
};

export default function VsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
