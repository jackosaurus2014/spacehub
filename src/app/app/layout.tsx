import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Download the App',
  description: 'Download the SpaceNexus app. Space industry intelligence on your phone — available on Google Play.',
  alternates: {
    canonical: 'https://spacenexus.us/app',
  },
};

export default function AppDownloadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
