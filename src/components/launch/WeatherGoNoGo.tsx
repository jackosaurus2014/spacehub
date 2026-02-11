'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';

interface WeatherData {
  windSpeed: number;
  windDirection: string;
  temperature: number;
  cloudCover: number;
  lightningRisk: string;
  precipitation: number;
  visibility: number;
  humidity: number;
}

interface GoNoGoCriterion {
  name: string;
  status: 'go' | 'caution' | 'no_go';
  detail: string;
}

interface WeatherGoNoGoProps {
  eventId: string;
}

function StatusIcon({ status }: { status: 'go' | 'caution' | 'no_go' }) {
  if (status === 'go') {
    return (
      <span className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center flex-shrink-0">
        <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === 'caution') {
    return (
      <span className="w-5 h-5 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center flex-shrink-0">
        <svg className="w-3 h-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01" />
        </svg>
      </span>
    );
  }
  return (
    <span className="w-5 h-5 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center flex-shrink-0">
      <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </span>
  );
}

export default function WeatherGoNoGo({ eventId }: WeatherGoNoGoProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [criteria, setCriteria] = useState<GoNoGoCriterion[]>([]);
  const [rangeStatus, setRangeStatus] = useState<'green' | 'yellow' | 'red'>('green');
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch(`/api/launch-day/${eventId}/weather`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setWeather(data.data.weather);
        setCriteria(data.data.criteria);
        setRangeStatus(data.data.rangeStatus);
      }
    } catch {
      // Silent fail on poll
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchWeather();
    pollRef.current = setInterval(fetchWeather, 60000); // Poll every 60s
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchWeather]);

  const rangeColors = {
    green: 'bg-green-500/20 text-green-400 border-green-500/40',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    red: 'bg-red-500/20 text-red-400 border-red-500/40',
  };

  const rangeLabels = {
    green: 'GO FOR LAUNCH',
    yellow: 'CAUTION',
    red: 'NO-GO',
  };

  if (loading) {
    return (
      <div className="bg-slate-900/95 rounded-xl border border-slate-700/50 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-700 rounded w-1/3" />
          <div className="h-20 bg-slate-800 rounded" />
          <div className="h-32 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/95 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50 flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
          Weather & Range Status
        </h3>
        <motion.span
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${rangeColors[rangeStatus]}`}
        >
          {rangeLabels[rangeStatus]}
        </motion.span>
      </div>

      <div className="p-3 space-y-3">
        {/* Weather Conditions Grid */}
        {weather && (
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-slate-800/50 rounded-lg p-2 text-center border border-slate-700/30">
              <div className="text-slate-400 text-[10px] uppercase">Wind</div>
              <div className="text-white font-mono text-sm font-bold">{weather.windSpeed}</div>
              <div className="text-slate-500 text-[10px]">kts {weather.windDirection}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2 text-center border border-slate-700/30">
              <div className="text-slate-400 text-[10px] uppercase">Temp</div>
              <div className="text-white font-mono text-sm font-bold">{weather.temperature}</div>
              <div className="text-slate-500 text-[10px]">&deg;F</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2 text-center border border-slate-700/30">
              <div className="text-slate-400 text-[10px] uppercase">Clouds</div>
              <div className="text-white font-mono text-sm font-bold">{weather.cloudCover}%</div>
              <div className="text-slate-500 text-[10px]">coverage</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2 text-center border border-slate-700/30">
              <div className="text-slate-400 text-[10px] uppercase">Visibility</div>
              <div className="text-white font-mono text-sm font-bold">{weather.visibility}</div>
              <div className="text-slate-500 text-[10px]">mi</div>
            </div>
          </div>
        )}

        {/* Go/No-Go Checklist */}
        <div className="space-y-1.5">
          <div className="text-slate-400 text-xs uppercase tracking-wider px-1 font-medium">Go/No-Go Criteria</div>
          {criteria.map((criterion, i) => (
            <motion.div
              key={criterion.name}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
            >
              <StatusIcon status={criterion.status} />
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs font-medium">{criterion.name}</div>
                <div className="text-slate-500 text-[10px] truncate">{criterion.detail}</div>
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${
                criterion.status === 'go' ? 'text-green-400' :
                criterion.status === 'caution' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {criterion.status === 'no_go' ? 'NO-GO' : criterion.status.toUpperCase()}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
