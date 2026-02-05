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
          <Link href="/mission-control" className="btn-primary text-base py-4 px-10 shadow-lg shadow-nebula-500/30">
            Mission Control
          </Link>
          <Link
            href="/news"
            className="text-base py-4 px-10 font-semibold rounded-xl transition-all duration-300 hover:-translate-y-0.5 active:scale-95 tracking-wide uppercase text-sm border-2 border-cyan-400/60 text-white bg-slate-900/60 backdrop-blur-sm hover:bg-cyan-900/60 hover:border-cyan-400 shadow-lg shadow-cyan-500/20"
          >
            Explore News
          </Link>
        </div>
        <div className="flex gap-6">
          <button
            onClick={() => setShowFeatureRequest(true)}
            className="text-cyan-300 hover:text-cyan-200 text-sm font-medium transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
          >
            Request Feature
          </button>
          <span className="text-cyan-400/50">|</span>
          <button
            onClick={() => setShowHelp(true)}
            className="text-cyan-300 hover:text-cyan-200 text-sm font-medium transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
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
