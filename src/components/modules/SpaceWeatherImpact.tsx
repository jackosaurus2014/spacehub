'use client';

/**
 * Space Weather Impact Indicator
 * Translates raw space weather data into actionable impact assessments.
 * Shows what current conditions mean for GPS, radio, satellites, and aurora.
 */

interface ImpactLevel {
  level: 'low' | 'moderate' | 'high' | 'severe';
  color: string;
  bgColor: string;
  borderColor: string;
}

function getImpactLevel(kpIndex: number): ImpactLevel {
  if (kpIndex >= 7) return { level: 'severe', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' };
  if (kpIndex >= 5) return { level: 'high', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' };
  if (kpIndex >= 3) return { level: 'moderate', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20' };
  return { level: 'low', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20' };
}

interface SpaceWeatherImpactProps {
  kpIndex?: number;
  solarWindSpeed?: number;
  xrayFlux?: string;
}

export default function SpaceWeatherImpact({ kpIndex = 2, solarWindSpeed = 350, xrayFlux = 'B' }: SpaceWeatherImpactProps) {
  const impact = getImpactLevel(kpIndex);

  const impacts = [
    {
      system: 'GPS Accuracy',
      icon: '📍',
      status: kpIndex >= 5 ? 'Degraded (±10-100m)' : kpIndex >= 3 ? 'Minor errors possible' : 'Normal (±3-5m)',
      level: kpIndex >= 5 ? 'high' : kpIndex >= 3 ? 'moderate' : 'low',
    },
    {
      system: 'HF Radio',
      icon: '📻',
      status: xrayFlux >= 'M' ? 'Blackout possible' : xrayFlux >= 'C' ? 'Minor degradation' : 'Normal',
      level: xrayFlux >= 'M' ? 'high' : xrayFlux >= 'C' ? 'moderate' : 'low',
    },
    {
      system: 'Satellite Drag',
      icon: '🛰️',
      status: kpIndex >= 5 ? 'Increased (orbit changes)' : kpIndex >= 3 ? 'Slightly elevated' : 'Nominal',
      level: kpIndex >= 5 ? 'high' : kpIndex >= 3 ? 'moderate' : 'low',
    },
    {
      system: 'Aurora Visibility',
      icon: '🌌',
      status: kpIndex >= 7 ? 'Visible at mid-latitudes!' : kpIndex >= 5 ? 'Visible at high latitudes' : kpIndex >= 3 ? 'Possible at polar regions' : 'Not visible',
      level: kpIndex >= 5 ? 'high' : kpIndex >= 3 ? 'moderate' : 'low',
    },
  ];

  const levelColors: Record<string, string> = {
    low: 'text-green-400',
    moderate: 'text-yellow-400',
    high: 'text-amber-400',
    severe: 'text-red-400',
  };

  return (
    <div className={`rounded-xl border ${impact.borderColor} ${impact.bgColor} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">☀️</span>
          <div>
            <h3 className="text-white text-sm font-semibold">Space Weather Impact</h3>
            <p className="text-slate-500 text-[10px]">Current conditions assessment</p>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-full ${impact.bgColor} border ${impact.borderColor}`}>
          <span className={`text-xs font-bold uppercase ${impact.color}`}>{impact.level}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {impacts.map(item => (
          <div key={item.system} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm">{item.icon}</span>
              <span className="text-white text-xs font-medium">{item.system}</span>
            </div>
            <p className={`text-[10px] ${levelColors[item.level] || 'text-slate-400'}`}>
              {item.status}
            </p>
          </div>
        ))}
      </div>

      {kpIndex >= 5 && (
        <div className="mt-3 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
          <p className="text-red-400 text-[10px] font-medium">
            ⚠️ Operator Advisory: Consider postponing non-essential maneuvers. Monitor conjunction warnings closely.
          </p>
        </div>
      )}
    </div>
  );
}
