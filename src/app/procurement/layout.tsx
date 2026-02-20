import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SAM.gov Procurement Intelligence',
  description: 'Search federal space contracts and SBIR opportunities from SAM.gov. Filter by agency, NAICS code, value, and deadline. Track NASA, Space Force, and DARPA awards.',
  keywords: [
    'SAM.gov space',
    'space contracts',
    'SBIR space',
    'NASA procurement',
    'Space Force contracts',
    'federal space',
  ],
  openGraph: {
    title: 'SAM.gov Procurement Intelligence | SpaceNexus',
    description: 'Search federal space contracts and SBIR opportunities from SAM.gov. Filter by agency, NAICS code, value, and deadline. Track NASA, Space Force, and DARPA awards.',
    url: 'https://spacenexus.us/procurement',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SAM.gov Procurement Intelligence | SpaceNexus',
    description: 'Search federal space contracts and SBIR opportunities from SAM.gov. Filter by agency, NAICS code, value, and deadline. Track NASA, Space Force, and DARPA awards.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/procurement',
  },
};

export default function ProcurementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
