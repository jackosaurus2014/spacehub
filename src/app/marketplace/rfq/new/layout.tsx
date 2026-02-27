import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Submit a Request for Quote | SpaceNexus',
  description: 'Post a Request for Quote (RFQ) to connect with verified space industry providers. Get competitive proposals for launch services, satellite components, engineering, and more.',
  openGraph: {
    title: 'Submit a Request for Quote | SpaceNexus',
    description: 'Post a Request for Quote (RFQ) to connect with verified space industry providers. Get competitive proposals for your space project needs.',
  },
};

export default function NewRFQLayout({ children }: { children: React.ReactNode }) {
  return children;
}
