import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Export Control Classifications | SpaceNexus',
  description:
    'Searchable reference of ITAR USML categories and EAR ECCN codes for the space industry. Find export classifications for spacecraft, launch vehicles, satellite components, and space technology.',
  keywords: [
    'ITAR space',
    'USML Category IV',
    'USML Category XV',
    'USML Category XI',
    'EAR Category 9',
    'ECCN 9A004',
    'ECCN 9A515',
    'ECCN 9E003',
    'space export control',
    'spacecraft export classification',
    'satellite ECCN',
    'launch vehicle USML',
    'space technology export',
    '600 series spacecraft',
    'DDTC registration space',
    'BIS export license space',
  ],
  openGraph: {
    title: 'Space Industry Export Control Classifications | SpaceNexus',
    description:
      'Comprehensive reference of ITAR USML and EAR ECCN classifications for the space industry. Search by item type to find the right export control category.',
    url: 'https://spacenexus.us/export-classifications',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SpaceNexus' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Export Control Classifications | SpaceNexus',
    description:
      'ITAR USML categories and EAR ECCN codes for spacecraft, launch vehicles, satellite components, and space technology.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/export-classifications',
  },
};

export default function ExportClassificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
