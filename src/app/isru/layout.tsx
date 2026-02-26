import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'In-Situ Resource Utilization (ISRU) - Space Resource Technologies',
  description:
    'Comprehensive guide to In-Situ Resource Utilization technologies, locations, companies, and economics. From lunar water ice extraction to Mars oxygen production and asteroid mining.',
  keywords: [
    'ISRU',
    'in-situ resource utilization',
    'space mining',
    'lunar water ice',
    'MOXIE',
    'regolith processing',
    'space resources',
    'asteroid mining',
    'Mars ISRU',
    'lunar ISRU',
    'Sabatier process',
    'space propellant production',
  ],
  openGraph: {
    title: 'In-Situ Resource Utilization (ISRU) | SpaceNexus',
    description:
      'Technologies, locations, companies, and economics of harvesting resources in space. From water ice extraction to 3D printing with regolith.',
    url: 'https://spacenexus.us/isru',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus ISRU - In-Situ Resource Utilization',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'In-Situ Resource Utilization (ISRU) | SpaceNexus',
    description:
      'Technologies, locations, companies, and economics of harvesting resources in space.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/isru',
  },
};

export default function ISRULayout({ children }: { children: React.ReactNode }) {
  return children;
}
