import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Orbital Slot Registry',
  description: 'Browse geostationary orbital slot allocations and satellite coordination filings. ITU registrations, slot availability, and orbital position directory.',
  keywords: [
    'orbital slots',
    'geostationary orbit',
    'GEO slots',
    'ITU filing',
    'satellite coordination',
    'orbital position',
  ],
  openGraph: {
    title: 'Orbital Slot Registry | SpaceNexus',
    description: 'Browse geostationary orbital slot allocations and satellite coordination filings.',
    url: 'https://spacenexus.us/orbital-slots',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Orbital Slot Registry | SpaceNexus',
    description: 'Browse geostationary orbital slot allocations and satellite coordination filings.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/orbital-slots',
  },
};

export default function OrbitalSlotsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
