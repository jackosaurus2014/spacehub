'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const HOURLY_RATE = 85; // Fully-loaded space professional hourly rate
const TIME_SAVINGS_PERCENT = 0.6; // 60 % of research hours saved
const WEEKS_PER_MONTH = 4.33;
const TOOL_REPLACEMENT_PERCENT = 0.4; // 40 % replacement of existing tools

function getSpaceNexusCost(teamSize: number): number {
  if (teamSize <= 1) return 19.99;
  if (teamSize <= 5) return 49.99 * teamSize;
  return 49.99 * teamSize; // same rate for custom / enterprise estimate
}

/* ------------------------------------------------------------------ */
/*  Number formatting helpers                                          */
/* ------------------------------------------------------------------ */
function fmtDollars(n: number): string {
  if (n >= 1_000_000) {
    return '$' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  return (
    '$' +
    Math.round(n)
      .toLocaleString('en-US')
  );
}

function fmtHours(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

function fmtPercent(n: number): string {
  if (!isFinite(n) || isNaN(n)) return '0%';
  if (n >= 10_000) return Math.round(n / 1000) + ',000%+';
  return Math.round(n).toLocaleString('en-US') + '%';
}

/* ------------------------------------------------------------------ */
/*  Animated number hook                                               */
/* ------------------------------------------------------------------ */
function useAnimatedValue(target: number, duration = 400): number {
  const [display, setDisplay] = useState(target);
  const rafRef = useRef<number>(0);
  const startRef = useRef({ value: target, time: 0 });

  useEffect(() => {
    const from = display;
    if (from === target) return;

    startRef.current = { value: from, time: performance.now() };

    const animate = (now: number) => {
      const elapsed = now - startRef.current.time;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = startRef.current.value + (target - startRef.current.value) * eased;
      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return display;
}

/* ------------------------------------------------------------------ */
/*  Slider component                                                   */
/* ------------------------------------------------------------------ */
interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  onChange: (v: number) => void;
  'aria-label'?: string;
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  prefix = '',
  suffix = '',
  onChange,
  'aria-label': ariaLabel,
}: SliderFieldProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span className="text-sm font-semibold text-white tabular-nums">
          {prefix}
          {value.toLocaleString('en-US')}
          {suffix}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
        className="roi-slider w-full"
        style={
          {
            '--slider-pct': `${pct}%`,
          } as React.CSSProperties
        }
      />

      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>
          {prefix}
          {min.toLocaleString('en-US')}
          {suffix}
        </span>
        <span>
          {prefix}
          {max.toLocaleString('en-US')}
          {suffix}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Breakdown row                                                      */
/* ------------------------------------------------------------------ */
function BreakdownRow({
  label,
  value,
  detail,
  positive = true,
}: {
  label: string;
  value: string;
  detail?: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-700/30 last:border-0">
      <div className="min-w-0 mr-3">
        <p className="text-sm text-slate-300">{label}</p>
        {detail && <p className="text-xs text-slate-500 mt-0.5">{detail}</p>}
      </div>
      <span
        className={`text-sm font-semibold whitespace-nowrap tabular-nums ${
          positive ? 'text-emerald-400' : 'text-slate-400'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function ROICalculator() {
  const [teamSize, setTeamSize] = useState(3);
  const [researchHours, setResearchHours] = useState(10);
  const [currentSpend, setCurrentSpend] = useState(500);

  /* ---- Calculations ---- */
  const calc = useCallback(() => {
    const hoursSavedPerMonth = researchHours * TIME_SAVINGS_PERCENT * WEEKS_PER_MONTH * teamSize;
    const timeSavedValue = hoursSavedPerMonth * HOURLY_RATE;
    const toolSavings = currentSpend * TOOL_REPLACEMENT_PERCENT;
    const spacenexusCost = getSpaceNexusCost(teamSize);
    const netMonthlySavings = timeSavedValue + toolSavings - spacenexusCost;
    const annualSavings = netMonthlySavings * 12;
    const annualCost = spacenexusCost * 12;
    const roiPercent = annualCost > 0 ? (netMonthlySavings * 12) / annualCost * 100 : 0;

    return {
      hoursSavedPerMonth,
      timeSavedValue,
      toolSavings,
      spacenexusCost,
      netMonthlySavings,
      annualSavings,
      roiPercent,
    };
  }, [teamSize, researchHours, currentSpend]);

  const results = calc();

  /* ---- Animated values ---- */
  const animMonthlySavings = useAnimatedValue(results.netMonthlySavings);
  const animAnnualSavings = useAnimatedValue(results.annualSavings);
  const animROI = useAnimatedValue(results.roiPercent);
  const animHours = useAnimatedValue(results.hoursSavedPerMonth);

  return (
    <section className="w-full" aria-labelledby="roi-heading">
      {/* Inline styles for the custom range slider */}
      <style>{`
        .roi-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 9999px;
          background: linear-gradient(
            to right,
            #06b6d4 0%,
            #06b6d4 var(--slider-pct, 50%),
            #334155 var(--slider-pct, 50%),
            #334155 100%
          );
          outline: none;
          cursor: pointer;
        }
        .roi-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #06b6d4;
          border: 3px solid #0e1729;
          box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.3), 0 2px 8px rgba(0, 0, 0, 0.4);
          cursor: pointer;
          transition: box-shadow 0.2s, transform 0.15s;
        }
        .roi-slider::-webkit-slider-thumb:hover {
          box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.3), 0 2px 12px rgba(0, 0, 0, 0.5);
          transform: scale(1.1);
        }
        .roi-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #06b6d4;
          border: 3px solid #0e1729;
          box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.3), 0 2px 8px rgba(0, 0, 0, 0.4);
          cursor: pointer;
          transition: box-shadow 0.2s, transform 0.15s;
        }
        .roi-slider::-moz-range-thumb:hover {
          box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.3), 0 2px 12px rgba(0, 0, 0, 0.5);
          transform: scale(1.1);
        }
        .roi-slider::-moz-range-track {
          height: 6px;
          border-radius: 9999px;
          background: transparent;
        }
        .roi-slider:focus-visible::-webkit-slider-thumb {
          box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.5), 0 2px 12px rgba(0, 0, 0, 0.5);
        }
        .roi-slider:focus-visible::-moz-range-thumb {
          box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.5), 0 2px 12px rgba(0, 0, 0, 0.5);
        }
      `}</style>

      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 sm:px-8 sm:pt-8">
          <h2
            id="roi-heading"
            className="text-xl sm:text-2xl font-bold text-white mb-1"
          >
            ROI Calculator
          </h2>
          <p className="text-sm text-slate-400">
            See how much your team could save with SpaceNexus vs. traditional research tools.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-0">
          {/* ---- Left: Inputs ---- */}
          <div className="px-6 pb-6 sm:px-8 lg:border-r lg:border-slate-700/30">
            <SliderField
              label="Team size"
              value={teamSize}
              min={1}
              max={50}
              suffix={teamSize === 1 ? ' person' : ' people'}
              onChange={setTeamSize}
              aria-label="Team size: number of space professionals"
            />

            <SliderField
              label="Hours spent on research per week"
              value={researchHours}
              min={1}
              max={40}
              suffix={researchHours === 1 ? ' hr/week' : ' hrs/week'}
              onChange={setResearchHours}
              aria-label="Hours spent on research per week"
            />

            <SliderField
              label="Current tool spend per month"
              value={currentSpend}
              min={0}
              max={10000}
              step={50}
              prefix="$"
              suffix="/mo"
              onChange={setCurrentSpend}
              aria-label="Current monthly tool spend in dollars"
            />

            {/* Assumptions footnote */}
            <div className="mt-2 p-3 bg-slate-800/40 rounded-lg">
              <p className="text-xs text-slate-500 leading-relaxed">
                Based on $85/hr fully-loaded rate, 60% research time savings, and
                40% tool cost replacement. Actual results vary by use case.
              </p>
            </div>
          </div>

          {/* ---- Right: Results ---- */}
          <div className="px-6 pb-6 sm:px-8 pt-6 lg:pt-0 border-t lg:border-t-0 border-slate-700/30" aria-live="polite">
            {/* Hero savings number */}
            <div className="text-center lg:text-left mb-6">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
                Estimated monthly savings
              </p>
              <p
                className="text-4xl sm:text-5xl font-extrabold tabular-nums"
                style={{
                  background: results.netMonthlySavings > 0
                    ? 'linear-gradient(135deg, #06b6d4, #10b981)'
                    : 'linear-gradient(135deg, #94a3b8, #64748b)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {results.netMonthlySavings >= 0 ? '' : '-'}
                {fmtDollars(Math.abs(animMonthlySavings))}
              </p>
              <p className="text-xs text-slate-500 mt-1">per month</p>
            </div>

            {/* Breakdown */}
            <div className="mb-6">
              <BreakdownRow
                label="Time saved"
                value={`+${fmtDollars(results.timeSavedValue)}`}
                detail={`${fmtHours(results.hoursSavedPerMonth)} hrs/mo at $${HOURLY_RATE}/hr`}
                positive
              />
              <BreakdownRow
                label="Tool cost savings"
                value={`+${fmtDollars(results.toolSavings)}`}
                detail={`40% replacement of $${currentSpend.toLocaleString('en-US')}/mo spend`}
                positive
              />
              <BreakdownRow
                label="SpaceNexus cost"
                value={`-${fmtDollars(results.spacenexusCost)}`}
                detail={
                  teamSize <= 1
                    ? 'Starter plan'
                    : teamSize <= 5
                    ? `Pro plan ($49.99/user x ${teamSize})`
                    : `Enterprise estimate ($49.99/user x ${teamSize})`
                }
                positive={false}
              />
            </div>

            {/* Annual + ROI summary */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">Annual savings</p>
                <p className="text-lg sm:text-xl font-bold text-emerald-400 tabular-nums">
                  {results.annualSavings >= 0 ? '' : '-'}
                  {fmtDollars(Math.abs(animAnnualSavings))}
                </p>
                <p className="text-xs text-slate-500">per year</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">Return on investment</p>
                <p className="text-lg sm:text-xl font-bold text-slate-300 tabular-nums">
                  {fmtPercent(animROI)}
                </p>
                <p className="text-xs text-slate-500">ROI</p>
              </div>
            </div>

            {/* CTA */}
            <Link
              href="/pricing"
              className="block w-full text-center bg-gradient-to-r bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-black/20 hover:shadow-black/20 hover:-translate-y-0.5"
            >
              Start Your Free 14-Day Trial
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
