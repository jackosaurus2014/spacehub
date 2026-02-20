import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Advertise on SpaceNexus',
  description: 'Reach space industry professionals with targeted advertising. Banner, native, and sponsored content placements across SpaceNexus intelligence modules.',
  keywords: [
    'space advertising',
    'aerospace marketing',
    'B2B space ads',
    'space industry advertising',
  ],
  openGraph: {
    title: 'Advertise on SpaceNexus | SpaceNexus',
    description: 'Reach space industry professionals with targeted advertising. Banner, native, and sponsored content placements across SpaceNexus intelligence modules.',
    url: 'https://spacenexus.us/advertise',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Advertise on SpaceNexus | SpaceNexus',
    description: 'Reach space industry professionals with targeted advertising. Banner, native, and sponsored content placements across SpaceNexus intelligence modules.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/advertise',
  },
};

export default function AdvertiseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
