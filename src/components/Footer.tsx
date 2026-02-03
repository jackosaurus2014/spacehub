'use client';

import { useState } from 'react';
import LegalDisclaimerModal from '@/components/LegalDisclaimerModal';

export default function Footer() {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  return (
    <>
      <footer className="border-t border-space-600/50 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-star-300 text-sm">
          <p>&copy; {new Date().getFullYear()} SpaceNexus. All rights reserved.</p>
          <p className="mt-1">Powered by Spaceflight News API</p>
          <button
            onClick={() => setDisclaimerOpen(true)}
            className="mt-2 text-nebula-400 hover:text-nebula-300 transition-colors font-medium underline underline-offset-2"
          >
            Legal Disclaimer
          </button>
        </div>
      </footer>

      <LegalDisclaimerModal
        isOpen={disclaimerOpen}
        onClose={() => setDisclaimerOpen(false)}
      />
    </>
  );
}
