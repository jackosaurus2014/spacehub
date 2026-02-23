import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your SpaceNexus account to access space industry intelligence, market data, satellite tracking, and 30+ interactive modules.',
  alternates: { canonical: 'https://spacenexus.us/login' },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
