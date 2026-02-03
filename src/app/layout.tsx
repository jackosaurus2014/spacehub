import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import Starfield from '@/components/Starfield';
import AuthProvider from '@/components/AuthProvider';
import SubscriptionProvider from '@/components/SubscriptionProvider';
import DataInitializer from '@/components/DataInitializer';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SpaceNexus - Space Industry News & Information',
  description: 'Your gateway to the latest space industry news, launches, and market insights',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <SubscriptionProvider>
            <DataInitializer />
            <Starfield />
            <div className="relative z-10 min-h-screen flex flex-col">
              <Navigation />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
          </SubscriptionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
