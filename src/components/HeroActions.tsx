'use client';

import { useState } from 'react';
import Link from 'next/link';
import FeatureRequestModal from './FeatureRequestModal';
import HelpRequestModal from './HelpRequestModal';

export default function HeroActions() {
  const [showFeatureRequest, setShowFeatureRequest] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/mission-control" className="btn-primary text-base py-4 px-10">
            Mission Control
          </Link>
          <Link href="/news" className="btn-secondary text-base py-4 px-10">
            Explore News
          </Link>
        </div>
        <div className="flex gap-6">
          <button
            onClick={() => setShowFeatureRequest(true)}
            className="text-star-400 hover:text-nebula-300 text-sm transition-colors"
          >
            Request Feature
          </button>
          <span className="text-star-400/30">|</span>
          <button
            onClick={() => setShowHelp(true)}
            className="text-star-400 hover:text-nebula-300 text-sm transition-colors"
          >
            Help
          </button>
        </div>
      </div>

      <FeatureRequestModal
        isOpen={showFeatureRequest}
        onClose={() => setShowFeatureRequest(false)}
      />
      <HelpRequestModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </>
  );
}
