import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Welcome to SpaceNexus Pro!',
  description: 'Your SpaceNexus subscription is active. Get started with your space industry intelligence dashboard.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://spacenexus.us/checkout/success' },
};

export default function CheckoutSuccessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
