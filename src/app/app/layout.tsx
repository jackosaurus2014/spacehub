import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get the App - SpaceNexus on Google Play',
  description: 'Download SpaceNexus for Android on Google Play. Track rocket launches, satellite orbits, market data, and space weather on the go. Free to install.',
  alternates: {
    canonical: 'https://spacenexus.us/app',
  },
};

export default function AppDownloadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
