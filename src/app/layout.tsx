import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import Starfield from '@/components/Starfield';
import AuthProvider from '@/components/AuthProvider';
import SubscriptionProvider from '@/components/SubscriptionProvider';
import DataInitializer from '@/components/DataInitializer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SpaceHub - Space Industry News & Information',
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
              <footer className="border-t border-space-600/50 py-6 mt-auto">
                <div className="container mx-auto px-4 text-center text-star-300 text-sm">
                  <p>&copy; {new Date().getFullYear()} SpaceHub. All rights reserved.</p>
                  <p className="mt-1">Powered by Spaceflight News API</p>
                </div>
              </footer>
            </div>
          </SubscriptionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
