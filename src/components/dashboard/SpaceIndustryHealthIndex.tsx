'use client';

export default function SpaceIndustryHealthIndex() {
  // Simulated data for the composite index
  const launchSuccessRate = 96;
  const marketSentiment: string = 'Bullish';
  const fundingActivity: string = 'High';
  const regulatoryClimate: string = 'Moderate';

  // Composite score: weighted average of sub-indicators (0-100)
  const sentimentScore = marketSentiment === 'Bullish' ? 85 : marketSentiment === 'Neutral' ? 50 : 25;
  const fundingScore = fundingActivity === 'High' ? 90 : fundingActivity === 'Moderate' ? 60 : 30;
  const regulatoryScore = regulatoryClimate === 'Favorable' ? 90 : regulatoryClimate === 'Moderate' ? 65 : 35;
  const compositeScore = Math.round(
    launchSuccessRate * 0.3 + sentimentScore * 0.25 + fundingScore * 0.25 + regulatoryScore * 0.2
  );

  // Color coding: green > 70, yellow > 40, red <= 40
  const scoreColor = compositeScore > 70 ? 'text-emerald-400' : compositeScore > 40 ? 'text-amber-400' : 'text-red-400';
  const scoreBgRing = compositeScore > 70 ? 'stroke-emerald-400' : compositeScore > 40 ? 'stroke-amber-400' : 'stroke-red-400';
  const scoreLabel = compositeScore > 70 ? 'Healthy' : compositeScore > 40 ? 'Mixed' : 'Stressed';

  // SVG circular progress values
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (compositeScore / 100) * circumference;

  return (
    <div className="card p-5 mb-8 border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-emerald-500/[0.04]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
          </svg>
          Space Industry Health Index
        </h2>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-500/20 text-violet-400 border border-violet-500/30">
          Preview
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* Circular progress gauge */}
        <div className="relative shrink-0">
          <svg width="100" height="100" className="-rotate-90">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-white/[0.06]"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              className={scoreBgRing}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 1s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${scoreColor}`}>{compositeScore}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{scoreLabel}</span>
          </div>
        </div>

        {/* Sub-indicators */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 flex-1 min-w-0">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Launch Success Rate</p>
            <p className="text-sm font-semibold text-emerald-400">{launchSuccessRate}%</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Market Sentiment</p>
            <p className="text-sm font-semibold text-emerald-400">{marketSentiment}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Funding Activity</p>
            <p className="text-sm font-semibold text-emerald-400">{fundingActivity}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Regulatory Climate</p>
            <p className="text-sm font-semibold text-amber-400">{regulatoryClimate}</p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 mt-4 flex items-center gap-1.5">
        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        Full historical index with daily updates coming soon in SpaceNexus Pro
      </p>
    </div>
  );
}
