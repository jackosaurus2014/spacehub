'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { TelemetryPoint } from '@/lib/launch/telemetry-simulator';

interface TelemetryDisplayProps {
  eventId: string;
  isLive: boolean;
}

// Animated number counter
function AnimatedValue({ value, decimals = 1, className }: { value: number; decimals?: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const duration = 800; // ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(start + (end - start) * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    prevValue.current = value;
  }, [value]);

  return <span className={className}>{displayValue.toFixed(decimals)}</span>;
}

// Mini sparkline chart
function Sparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 100;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: `${height}px` }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Stage/Fairing status badge
function StatusBadge({ status, type }: { status: string; type: 'stage' | 'fairing' }) {
  const colors: Record<string, string> = {
    attached: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    separated: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    landing: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    landed: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  const labels: Record<string, string> = {
    attached: type === 'stage' ? 'S1 Attached' : 'Fairing On',
    separated: type === 'stage' ? 'S1 Separated' : 'Fairing Jettisoned',
    landing: 'S1 Landing',
    landed: 'S1 Landed',
  };

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${colors[status] || colors.attached}`}>
      {labels[status] || status}
    </span>
  );
}

export default function TelemetryDisplay({ eventId, isLive }: TelemetryDisplayProps) {
  const [telemetry, setTelemetry] = useState<TelemetryPoint | null>(null);
  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [error, setError] = useState(false);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await fetch(`/api/launch-day/${eventId}/telemetry?limit=60`);
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = await res.json();
      if (data.success && data.data.telemetry.length > 0) {
        const points = data.data.telemetry as TelemetryPoint[];
        setHistory(points);
        setTelemetry(points[points.length - 1]);
        setError(false);
      }
    } catch {
      setError(true);
    }
  }, [eventId]);

  useEffect(() => {
    if (!isLive) return;

    fetchTelemetry();
    pollInterval.current = setInterval(fetchTelemetry, 2000);

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [isLive, fetchTelemetry]);

  const machNumber = telemetry ? (telemetry.velocity / 0.343).toFixed(1) : '0.0'; // velocity in km/s, mach = v(m/s)/343

  const altitudeHistory = history.map(p => p.altitude);
  const velocityHistory = history.map(p => p.velocity);
  const downrangeHistory = history.map(p => p.downrange);
  const accelerationHistory = history.map(p => p.acceleration);
  const dynamicPressureHistory = history.map(p => p.dynamicPressure ?? 0);
  const fuelHistory = history.map(p => p.fuelRemaining ?? 100);

  if (!isLive) {
    return (
      <div className="bg-slate-900/95 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Telemetry
        </h3>
        <div className="text-slate-400 text-sm text-center py-8 bg-slate-800/30 rounded-lg">
          Telemetry data will display when the launch is live
        </div>
      </div>
    );
  }

  if (error && !telemetry) {
    return (
      <div className="bg-slate-900/95 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-white font-semibold mb-4">Telemetry</h3>
        <div className="text-red-400 text-sm text-center py-4">
          Unable to load telemetry data
        </div>
      </div>
    );
  }

  const isMaxQ = telemetry?.isMaxQ ?? false;

  return (
    <div className="bg-slate-900/95 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50 flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Live Telemetry
        </h3>
        <div className="flex items-center gap-2">
          {/* Max-Q Badge */}
          {isMaxQ && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/30 text-red-300 font-bold uppercase tracking-wider border border-red-500/40"
              style={{ boxShadow: '0 0 12px rgba(239,68,68,0.4), 0 0 24px rgba(239,68,68,0.2)' }}
            >
              MAX Q
            </motion.span>
          )}
          {/* Stage/Fairing Status */}
          {telemetry && (
            <div className="flex items-center gap-1.5">
              <StatusBadge status={telemetry.stageStatus} type="stage" />
              <StatusBadge status={telemetry.fairingStatus} type="fairing" />
            </div>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-medium uppercase tracking-wider">
            Simulated Data
          </span>
          <span className="flex items-center gap-1 text-xs text-green-400">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            LIVE
          </span>
        </div>
      </div>

      {/* Telemetry Grid */}
      <div className="p-3 grid grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Altitude */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
            <span className="text-slate-400 text-xs uppercase tracking-wider">Altitude</span>
          </div>
          <div className="text-xl font-mono font-bold text-white" style={{ textShadow: '0 0 8px rgba(168,85,247,0.4)' }}>
            <AnimatedValue value={telemetry?.altitude ?? 0} />
            <span className="text-slate-400 text-xs ml-1 font-sans">km</span>
          </div>
          <Sparkline data={altitudeHistory} color="#a855f7" height={24} />
        </motion.div>

        {/* Velocity */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-slate-400 text-xs uppercase tracking-wider">Velocity</span>
          </div>
          <div className="text-xl font-mono font-bold text-white" style={{ textShadow: '0 0 8px rgba(34,211,238,0.4)' }}>
            <AnimatedValue value={telemetry?.velocity ?? 0} decimals={3} />
            <span className="text-slate-400 text-xs ml-1 font-sans">km/s</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Mach {machNumber}
          </div>
          <Sparkline data={velocityHistory} color="#22d3ee" height={24} />
        </motion.div>

        {/* Downrange */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            <span className="text-slate-400 text-xs uppercase tracking-wider">Downrange</span>
          </div>
          <div className="text-xl font-mono font-bold text-white" style={{ textShadow: '0 0 8px rgba(96,165,250,0.4)' }}>
            <AnimatedValue value={telemetry?.downrange ?? 0} />
            <span className="text-slate-400 text-xs ml-1 font-sans">km</span>
          </div>
          <Sparkline data={downrangeHistory} color="#60a5fa" height={24} />
        </motion.div>

        {/* Acceleration */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <svg className="w-3.5 h-3.5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-slate-400 text-xs uppercase tracking-wider">G-Force</span>
          </div>
          <div className="text-xl font-mono font-bold text-white" style={{ textShadow: '0 0 8px rgba(251,146,60,0.4)' }}>
            <AnimatedValue value={telemetry?.acceleration ?? 0} decimals={2} />
            <span className="text-slate-400 text-xs ml-1 font-sans">G</span>
          </div>
          <Sparkline data={accelerationHistory} color="#fb923c" height={24} />
        </motion.div>

        {/* Dynamic Pressure */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`bg-slate-800/50 rounded-lg p-3 border ${isMaxQ ? 'border-red-500/50' : 'border-slate-700/30'} relative overflow-hidden`}
        >
          {isMaxQ && (
            <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />
          )}
          <div className="flex items-center gap-1.5 mb-1 relative">
            <svg className={`w-3.5 h-3.5 ${isMaxQ ? 'text-red-400' : 'text-rose-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className={`text-xs uppercase tracking-wider ${isMaxQ ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
              Q (Dynamic Pressure)
            </span>
          </div>
          <div className="text-xl font-mono font-bold text-white relative" style={{ textShadow: isMaxQ ? '0 0 12px rgba(239,68,68,0.6)' : '0 0 8px rgba(244,63,94,0.4)' }}>
            <AnimatedValue value={telemetry?.dynamicPressure ?? 0} decimals={1} />
            <span className="text-slate-400 text-xs ml-1 font-sans">kPa</span>
          </div>
          <Sparkline data={dynamicPressureHistory} color={isMaxQ ? '#ef4444' : '#f43f5e'} height={24} />
        </motion.div>

        {/* Fuel Remaining */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            </svg>
            <span className="text-slate-400 text-xs uppercase tracking-wider">Fuel</span>
            <span className={`ml-auto font-mono text-sm font-bold ${
              (telemetry?.fuelRemaining ?? 100) > 50 ? 'text-green-400' :
              (telemetry?.fuelRemaining ?? 100) > 20 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {(telemetry?.fuelRemaining ?? 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-2.5 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                (telemetry?.fuelRemaining ?? 100) > 50 ? 'bg-gradient-to-r from-green-500 to-green-400' :
                (telemetry?.fuelRemaining ?? 100) > 20 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                'bg-gradient-to-r from-red-500 to-red-400'
              }`}
              initial={{ width: '100%' }}
              animate={{ width: `${telemetry?.fuelRemaining ?? 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <Sparkline data={fuelHistory} color="#f59e0b" height={20} />
        </motion.div>

        {/* Throttle - spans 2 columns */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30 col-span-2 lg:col-span-3"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-slate-400 text-xs uppercase tracking-wider">Throttle</span>
            <span className="ml-auto font-mono text-green-400 text-sm font-bold">
              {(telemetry?.throttle ?? 0).toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400"
              initial={{ width: 0 }}
              animate={{ width: `${telemetry?.throttle ?? 0}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                boxShadow: (telemetry?.throttle ?? 0) > 50 ? '0 0 8px rgba(74,222,128,0.4)' : 'none',
              }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
