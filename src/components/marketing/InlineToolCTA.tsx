'use client';

import Link from 'next/link';

interface InlineToolCTAProps {
  toolName: string;
  toolPath: string;
  description: string;
  icon?: string;
}

/**
 * Inline CTA embedded in blog articles linking to a SpaceNexus tool.
 * Designed to look native to the article flow, not like an ad.
 */
export default function InlineToolCTA({ toolName, toolPath, description, icon = '🔧' }: InlineToolCTAProps) {
  return (
    <div className="my-6 rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 p-4 not-prose">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold mb-0.5">
            Try it: {toolName}
          </p>
          <p className="text-slate-400 text-xs leading-relaxed mb-2.5">
            {description}
          </p>
          <Link
            href={`${toolPath}?utm_source=blog&utm_medium=inline_cta&utm_content=${encodeURIComponent(toolName)}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 rounded-lg transition-all"
          >
            Open {toolName}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Map of tool CTAs keyed by topic keyword for auto-insertion */
export const TOOL_CTA_MAP: Record<string, InlineToolCTAProps> = {
  'satellite tracking': { toolName: 'Satellite Tracker', toolPath: '/satellites', description: 'Track 10,000+ satellites in real time including ISS, Starlink, and GPS constellations.', icon: '🛰️' },
  'orbital mechanics': { toolName: 'Orbital Calculator', toolPath: '/orbital-calculator', description: 'Calculate orbital parameters, delta-V, and Hohmann transfers.', icon: '🌍' },
  'link budget': { toolName: 'Link Budget Calculator', toolPath: '/link-budget-calculator', description: 'Calculate RF link performance including path loss and received signal strength.', icon: '📡' },
  'thermal': { toolName: 'Thermal Calculator', toolPath: '/thermal-calculator', description: 'Estimate spacecraft thermal environment based on orbit and surface properties.', icon: '🌡️' },
  'radiation': { toolName: 'Radiation Calculator', toolPath: '/radiation-calculator', description: 'Estimate total ionizing dose and single-event effects for different orbits.', icon: '☢️' },
  'mission cost': { toolName: 'Mission Cost Simulator', toolPath: '/mission-cost', description: 'Estimate total mission cost including launch, spacecraft, and operations.', icon: '💰' },
  'constellation': { toolName: 'Constellation Designer', toolPath: '/constellation-designer', description: 'Design Walker patterns, visualize coverage, and export orbital elements.', icon: '🛸' },
  'space weather': { toolName: 'Space Weather Dashboard', toolPath: '/space-weather', description: 'Monitor solar flares, Kp index, CMEs, and aurora forecasts.', icon: '☀️' },
  'launch schedule': { toolName: 'Mission Control', toolPath: '/mission-control', description: 'Live launch countdowns and mission status for every orbital launch.', icon: '🚀' },
  'company profiles': { toolName: 'Company Profiles', toolPath: '/company-profiles', description: 'Browse 200+ space company profiles with funding data and SpaceNexus Score.', icon: '🏢' },
  'space tycoon': { toolName: 'Space Tycoon Game', toolPath: '/space-tycoon', description: 'Build your space empire — research, launch, mine, and expand across the solar system.', icon: '🎮' },
  'power budget': { toolName: 'Power Budget Calculator', toolPath: '/power-budget-calculator', description: 'Size solar arrays and batteries for your spacecraft.', icon: '⚡' },
  'space mining': { toolName: 'Space Mining Intelligence', toolPath: '/space-mining', description: 'Track asteroid mining companies, lunar resources, and ISRU technology.', icon: '⛏️' },
};
