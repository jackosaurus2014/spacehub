'use client';

import { useState } from 'react';
import Link from 'next/link';
import FeatureRequestModal from '@/components/FeatureRequestModal';
import HelpRequestModal from '@/components/HelpRequestModal';

export default function HeroActions() {
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/mission-control" className="btn-primary text-lg py-3 px-8">
          Mission Control
        </Link>
        <Link href="/news" className="btn-secondary text-lg py-3 px-8">
          Explore News
        </Link>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
        <button
          onClick={() => setFeatureModalOpen(true)}
          className="border border-nebula-500/50 text-nebula-300 hover:bg-nebula-500/10 hover:border-nebula-400 transition-colors rounded-lg py-2 px-6 text-sm font-medium"
        >
          Feature Request
        </button>
        <button
          onClick={() => setHelpModalOpen(true)}
          className="border border-rocket-500/50 text-rocket-400 hover:bg-rocket-500/10 hover:border-rocket-400 transition-colors rounded-lg py-2 px-6 text-sm font-medium"
        >
          Help!
        </button>
      </div>

      <FeatureRequestModal
        isOpen={featureModalOpen}
        onClose={() => setFeatureModalOpen(false)}
      />
      <HelpRequestModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />
    </>
  );
}
