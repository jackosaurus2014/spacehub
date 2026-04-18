'use client';

import { useEffect, useState } from 'react';

export type CountdownTheme = 'dark' | 'light' | 'minimal' | 'retro';

interface CountdownProps {
  targetTime: string | Date;
  missionName: string;
  theme?: CountdownTheme;
  /** When true, renders in compact embed mode (no outer padding, full-bleed) */
  compact?: boolean;
}

interface TimeParts {
  days: number;
  hours: number;
  mins: number;
  secs: number;
  launched: boolean;
}

function pad(n: number): string {
  return String(Math.max(0, n)).padStart(2, '0');
}

function computeTime(target: number): TimeParts {
  const diff = target - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, mins: 0, secs: 0, launched: true };
  }
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    mins: Math.floor((diff % 3_600_000) / 60_000),
    secs: Math.floor((diff % 60_000) / 1000),
    launched: false,
  };
}

const THEME_STYLES: Record<
  CountdownTheme,
  {
    container: string;
    heading: string;
    sub: string;
    unitBox: string;
    unitNumber: string;
    unitLabel: string;
    launched: string;
  }
> = {
  dark: {
    container: 'bg-black text-white border border-white/10',
    heading: 'text-white',
    sub: 'text-white/60',
    unitBox: 'bg-white/[0.05] border border-white/10',
    unitNumber: 'text-white font-mono',
    unitLabel: 'text-white/50',
    launched: 'text-emerald-400',
  },
  light: {
    container: 'bg-white text-slate-900 border border-slate-200',
    heading: 'text-slate-900',
    sub: 'text-slate-600',
    unitBox: 'bg-slate-100 border border-slate-200',
    unitNumber: 'text-slate-900 font-mono',
    unitLabel: 'text-slate-500',
    launched: 'text-emerald-600',
  },
  minimal: {
    container: 'bg-transparent text-slate-900 border-0',
    heading: 'text-slate-900',
    sub: 'text-slate-500',
    unitBox: 'bg-transparent border-b border-slate-300 rounded-none',
    unitNumber: 'text-slate-900 font-mono tracking-tight',
    unitLabel: 'text-slate-400',
    launched: 'text-slate-900',
  },
  retro: {
    container:
      'bg-gradient-to-br from-indigo-950 via-purple-950 to-black text-amber-300 border border-amber-400/30',
    heading: 'text-amber-300',
    sub: 'text-amber-200/70',
    unitBox:
      'bg-black/60 border border-amber-400/40 shadow-[0_0_20px_rgba(251,191,36,0.15)]',
    unitNumber: 'text-amber-300 font-mono',
    unitLabel: 'text-amber-200/60',
    launched: 'text-amber-300',
  },
};

export default function Countdown({
  targetTime,
  missionName,
  theme = 'dark',
  compact = false,
}: CountdownProps) {
  const target = new Date(targetTime).getTime();
  const [time, setTime] = useState<TimeParts>(() => computeTime(target));

  useEffect(() => {
    setTime(computeTime(target));
    const id = setInterval(() => {
      setTime(computeTime(target));
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  const styles = THEME_STYLES[theme];
  const padding = compact ? 'p-4 sm:p-6' : 'p-6 sm:p-10';
  const units = [
    { val: time.days, label: 'DAYS' },
    { val: time.hours, label: 'HRS' },
    { val: time.mins, label: 'MIN' },
    { val: time.secs, label: 'SEC' },
  ];

  return (
    <div
      className={`rounded-2xl ${padding} ${styles.container} w-full max-w-3xl mx-auto`}
      data-theme={theme}
    >
      <div className="text-center mb-6">
        <p className={`text-xs sm:text-sm uppercase tracking-[0.3em] ${styles.sub} mb-2`}>
          {time.launched ? 'Mission Launched' : 'T-minus'}
        </p>
        <h2 className={`text-2xl sm:text-4xl font-bold ${styles.heading} break-words`}>
          {missionName}
        </h2>
      </div>

      {time.launched ? (
        <div className={`text-center py-8 ${styles.launched}`}>
          <div className="text-5xl sm:text-7xl font-bold font-mono mb-2">LIFTOFF</div>
          <p className={`text-sm ${styles.sub}`}>
            Target time reached {new Date(target).toLocaleString()}
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-4 gap-2 sm:gap-4"
          aria-label={`T-minus ${time.days} days ${time.hours} hours ${time.mins} minutes ${time.secs} seconds`}
          role="timer"
        >
          {units.map((u) => (
            <div
              key={u.label}
              className={`rounded-xl ${styles.unitBox} py-4 sm:py-8 text-center`}
            >
              <div
                className={`text-3xl sm:text-6xl leading-none ${styles.unitNumber} font-bold`}
              >
                {pad(u.val)}
              </div>
              <div
                className={`text-[10px] sm:text-xs tracking-widest mt-2 sm:mt-3 ${styles.unitLabel}`}
              >
                {u.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {!time.launched && (
        <p className={`text-center text-xs sm:text-sm ${styles.sub} mt-6`}>
          {new Date(target).toLocaleString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
          })}
        </p>
      )}
    </div>
  );
}
