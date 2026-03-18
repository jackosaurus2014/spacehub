import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Legal Resources | Law Firms, Regulations & Treaties',
  description:
    'Curated directory of legal resources for space companies. Find space law firms, key regulations, government agencies, industry organizations, academic programs, and international treaties governing outer space activities.',
  keywords: [
    'space law resources',
    'space industry legal',
    'space law firms',
    'space regulations directory',
    'outer space treaty',
    'space industry compliance',
    'FCC space regulations',
    'FAA commercial space',
    'space law programs',
    'international space law',
  ],
  openGraph: {
    title: 'Space Industry Legal Resources | SpaceNexus',
    description:
      'Curated directory of legal resources for space companies — law firms, regulations, government agencies, treaties, and academic programs.',
    url: 'https://spacenexus.us/legal-resources',
    type: 'website',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Legal Resources | SpaceNexus',
    description:
      'Curated directory of legal resources for space companies — law firms, regulations, government agencies, treaties, and academic programs.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/legal-resources',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
