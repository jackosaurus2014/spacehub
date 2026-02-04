'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import LegalDisclaimerModal from '@/components/LegalDisclaimerModal';

export default function Footer() {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  return (
    <>
      <footer className="bg-space-950/50 border-t border-white/[0.04] py-16 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Column 1: Logo & Tagline */}
            <div>
              <Image
                src="/spacenexus-logo.png"
                alt="SpaceNexus"
                width={140}
                height={70}
                className="h-9 w-auto mb-4 opacity-80"
              />
              <p className="text-star-400 text-sm leading-relaxed">
                Your gateway to the space industry. Real-time data, market intelligence, and expert insights.
              </p>
            </div>

            {/* Column 2: Platform */}
            <div>
              <h4 className="text-star-200 font-semibold text-sm uppercase tracking-wider mb-4">Platform</h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/mission-control" className="text-star-400 hover:text-white text-sm transition-colors">
                    Mission Control
                  </Link>
                </li>
                <li>
                  <Link href="/market-intel" className="text-star-400 hover:text-white text-sm transition-colors">
                    Market Intel
                  </Link>
                </li>
                <li>
                  <Link href="/news" className="text-star-400 hover:text-white text-sm transition-colors">
                    News
                  </Link>
                </li>
                <li>
                  <Link href="/solar-exploration" className="text-star-400 hover:text-white text-sm transition-colors">
                    Solar Exploration
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Resources */}
            <div>
              <h4 className="text-star-200 font-semibold text-sm uppercase tracking-wider mb-4">Resources</h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/blogs" className="text-star-400 hover:text-white text-sm transition-colors">
                    Blogs
                  </Link>
                </li>
                <li>
                  <Link href="/compliance" className="text-star-400 hover:text-white text-sm transition-colors">
                    Compliance
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-star-400 hover:text-white text-sm transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/business-opportunities" className="text-star-400 hover:text-white text-sm transition-colors">
                    Business Opportunities
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Company */}
            <div>
              <h4 className="text-star-200 font-semibold text-sm uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-2.5">
                <li>
                  <button
                    onClick={() => setDisclaimerOpen(true)}
                    className="text-star-400 hover:text-white text-sm transition-colors"
                  >
                    Legal Disclaimer
                  </button>
                </li>
                <li>
                  <Link href="/resource-exchange" className="text-star-400 hover:text-white text-sm transition-colors">
                    Resource Exchange
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-star-400 hover:text-white text-sm transition-colors">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/[0.04] pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-star-400 text-sm">
            <p>&copy; {new Date().getFullYear()} SpaceNexus. All rights reserved.</p>
            <p>Powered by Spaceflight News API</p>
          </div>
        </div>
      </footer>

      <LegalDisclaimerModal
        isOpen={disclaimerOpen}
        onClose={() => setDisclaimerOpen(false)}
      />
    </>
  );
}
