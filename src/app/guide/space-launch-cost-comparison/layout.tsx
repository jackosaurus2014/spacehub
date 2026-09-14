import type { Metadata } from 'next';

export const metadata: Metadata = {
  // CTR pass (2026-09-14): the old title ran 107 visible characters with the
  // section suffix, so Google cut it mid-phrase. `absolute` keeps the brand
  // off and the exact query ("how much does it cost to launch a satellite")
  // at the front, inside the ~60-character budget.
  title: { absolute: 'How Much Does It Cost to Launch a Satellite? 2026 Prices' },
  description: 'Falcon 9 lists at about $74M, or $3,246/kg. SpaceX rideshare starts at $350k for 50 kg; Electron about $8M. Every 2026 launch price, compared.',
  alternates: {
    canonical: 'https://spacenexus.us/guide/space-launch-cost-comparison',
  },
  openGraph: {
    title: 'How Much Does It Cost to Launch a Satellite? 2026 Prices | SpaceNexus',
    description: 'Falcon 9 lists at about $74M, or $3,246/kg. SpaceX rideshare starts at $350k for 50 kg; Electron about $8M. Every 2026 launch price, compared.',
    images: [
      {
        url: '/api/og?title=Space+Launch+Cost+Comparison&subtitle=Cost+per+kilogram+data+for+SpaceX%2C+ULA%2C+Arianespace%2C+Rocket+Lab%2C+and+more&type=guide',
        width: 1200,
        height: 630,
        alt: 'Space Launch Cost Comparison Guide',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How Much Does It Cost to Launch a Satellite? 2026 Prices | SpaceNexus',
    description: 'Falcon 9 lists at about $74M, or $3,246/kg. SpaceX rideshare starts at $350k for 50 kg; Electron about $8M. Every 2026 launch price, compared.',
    images: ['/api/og?title=Space+Launch+Cost+Comparison&subtitle=Cost+per+kilogram+data+for+SpaceX%2C+ULA%2C+Arianespace%2C+Rocket+Lab%2C+and+more&type=guide'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
