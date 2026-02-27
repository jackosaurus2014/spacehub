import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DMCA & Copyright Policy | SpaceNexus',
  description: 'SpaceNexus DMCA and copyright policy. Learn how to file a takedown notice, counter-notice, and our compliance with the TAKE IT DOWN Act.',
  openGraph: {
    title: 'DMCA & Copyright Policy | SpaceNexus',
    description: 'SpaceNexus DMCA and copyright policy. Learn how to file a takedown notice, counter-notice, and our compliance with the TAKE IT DOWN Act.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/legal/dmca',
  },
};

export default function DMCALayout({ children }: { children: React.ReactNode }) {
  return children;
}
