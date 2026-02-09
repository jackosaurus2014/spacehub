'use client';

interface TrajectoryFallbackProps {
  altitude: number; // km
  downrange: number; // km
  missionTimeSeconds: number;
}

/**
 * 2D SVG fallback trajectory visualization for devices that cannot run Three.js.
 */
export default function TrajectoryFallback({
  altitude,
  downrange,
  missionTimeSeconds,
}: TrajectoryFallbackProps) {
  const width = 400;
  const height = 200;
  const padding = 30;

  // Scale values
  const maxAlt = 300; // km
  const maxDown = 2500; // km

  const scaleX = (v: number) => padding + (v / maxDown) * (width - 2 * padding);
  const scaleY = (v: number) => height - padding - (v / maxAlt) * (height - 2 * padding);

  // Generate trajectory path points
  const pathPoints: string[] = [];
  const steps = 50;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Simplified trajectory curve
    const alt = maxAlt * (t < 0.3 ? t * t * 10 : 0.9 + 0.1 * t);
    const dr = maxDown * t * t;
    pathPoints.push(`${scaleX(dr)},${scaleY(alt)}`);
  }
  const trajectoryPath = `M ${pathPoints.join(' L ')}`;

  // Current position
  const progress = Math.min(1, Math.max(0, missionTimeSeconds / 600));
  const currentAlt = Math.min(altitude, maxAlt);
  const currentDown = Math.min(downrange, maxDown);
  const cx = scaleX(currentDown);
  const cy = scaleY(currentAlt);

  return (
    <div className="bg-slate-900/95 rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50 flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Trajectory
        </h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-medium uppercase tracking-wider">
          Simulated
        </span>
      </div>

      <div className="p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Grid lines */}
          {[0, 100, 200, 300].map(alt => (
            <g key={`alt-${alt}`}>
              <line
                x1={padding}
                y1={scaleY(alt)}
                x2={width - padding}
                y2={scaleY(alt)}
                stroke="#334155"
                strokeWidth="0.5"
                strokeDasharray="4,4"
              />
              <text
                x={padding - 5}
                y={scaleY(alt)}
                fill="#64748b"
                fontSize="8"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {alt}km
              </text>
            </g>
          ))}
          {[0, 500, 1000, 1500, 2000, 2500].map(dr => (
            <g key={`dr-${dr}`}>
              <line
                x1={scaleX(dr)}
                y1={padding}
                x2={scaleX(dr)}
                y2={height - padding}
                stroke="#334155"
                strokeWidth="0.5"
                strokeDasharray="4,4"
              />
              <text
                x={scaleX(dr)}
                y={height - padding + 12}
                fill="#64748b"
                fontSize="8"
                textAnchor="middle"
              >
                {dr}km
              </text>
            </g>
          ))}

          {/* Ground line */}
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="#475569"
            strokeWidth="1"
          />

          {/* Planned trajectory */}
          <path
            d={trajectoryPath}
            fill="none"
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray="6,4"
          />

          {/* Actual trajectory (up to current position) */}
          {missionTimeSeconds > 0 && (
            <path
              d={trajectoryPath}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
              strokeDasharray={`${progress * 100}% 100%`}
              style={{ filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.4))' }}
            />
          )}

          {/* Current position */}
          {missionTimeSeconds > 0 && (
            <>
              <circle cx={cx} cy={cy} r="6" fill="#22d3ee" opacity="0.2">
                <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.2;0.05;0.2" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={cx} cy={cy} r="3" fill="#22d3ee" style={{ filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.6))' }} />
            </>
          )}

          {/* Launch site marker */}
          <circle cx={scaleX(0)} cy={scaleY(0)} r="3" fill="#f97316" />
          <text
            x={scaleX(0)}
            y={scaleY(0) + 12}
            fill="#f97316"
            fontSize="7"
            textAnchor="middle"
          >
            Launch Site
          </text>

          {/* Axis labels */}
          <text x={width / 2} y={height - 2} fill="#94a3b8" fontSize="9" textAnchor="middle">
            Downrange Distance
          </text>
          <text
            x={8}
            y={height / 2}
            fill="#94a3b8"
            fontSize="9"
            textAnchor="middle"
            transform={`rotate(-90, 8, ${height / 2})`}
          >
            Altitude
          </text>
        </svg>
      </div>
    </div>
  );
}
