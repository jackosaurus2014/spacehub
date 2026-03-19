import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Quiz - Test Your Knowledge',
  description: 'Test your space industry knowledge with our interactive quiz. 15 questions about orbits, rockets, satellites, and space history.',
  alternates: { canonical: 'https://spacenexus.us/space-quiz' },
};

export default function SpaceQuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
