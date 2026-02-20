import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Deal Room',
  description: 'Secure document sharing for investor-startup interactions in the space industry. Manage NDAs, share pitch decks, and streamline due diligence with virtual data rooms built for space deals.',
  keywords: ['space deal room', 'virtual data room space', 'space startup pitch', 'investor data room', 'space NDA'],
  openGraph: {
    title: 'SpaceNexus - Space Industry Deal Room',
    description: 'Secure document sharing for investor-startup interactions in the space industry. Manage NDAs, share pitch decks, and streamline due diligence with virtual data rooms.',
    url: 'https://spacenexus.us/deal-rooms',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus - Space Industry Deal Room',
    description: 'Secure document sharing for investor-startup interactions in the space industry. Manage NDAs, share pitch decks, and streamline due diligence with virtual data rooms.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/deal-rooms',
  },
};

export default function DealRoomsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
