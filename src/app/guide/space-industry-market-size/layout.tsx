import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Market Size 2026: Data, Trends & Forecasts',
  description: 'Comprehensive guide to space industry market size with data, trends, and forecasts through 2035. Sector analysis and growth projections.',
  openGraph: {
    title: 'Space Industry Market Size 2026: Data, Trends & Forecasts | SpaceNexus Guide',
    description: 'Comprehensive guide to space industry market size with data, trends, and forecasts through 2035.',
    images: [
      {
        url: '/api/og?title=Space+Industry+Market+Size+2026&subtitle=Data%2C+trends%2C+and+forecasts+through+2035+with+sector+analysis&type=guide',
        width: 1200,
        height: 630,
        alt: 'Space Industry Market Size 2026: Data, Trends & Forecasts',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Market Size 2026 | SpaceNexus Guide',
    description: 'Market size data, trends, and forecasts through 2035 with sector analysis and growth projections.',
    images: ['/api/og?title=Space+Industry+Market+Size+2026&subtitle=Data%2C+trends%2C+and+forecasts+through+2035+with+sector+analysis&type=guide'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
