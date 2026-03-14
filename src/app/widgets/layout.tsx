import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Embeddable Space Widgets - Free Real-Time Space Data for Your Website | SpaceNexus',
  description:
    'Add real-time space data to your website with free embeddable widgets. Market snapshot, launch countdown, and space weather widgets. Just copy and paste the iframe code.',
  keywords: [
    'space widgets',
    'embeddable space data',
    'space market widget',
    'launch countdown widget',
    'space weather widget',
    'free space widgets',
    'iframe space data',
    'SpaceNexus widgets',
    'real-time space data',
    'space industry embed',
  ],
  openGraph: {
    title: 'Embeddable Space Widgets | SpaceNexus',
    description:
      'Add real-time space data to your website with free embeddable widgets. Market data, launch countdowns, and space weather.',
    type: 'website',
    url: 'https://spacenexus.us/widgets',
    siteName: 'SpaceNexus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Embeddable Space Widgets | SpaceNexus',
    description:
      'Add real-time space data to your website with free embeddable widgets. Market data, launch countdowns, and space weather.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/widgets',
  },
};

export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body style={{ margin: 0, padding: 0, background: '#000000', color: 'rgba(255,255,255,0.9)', fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
