'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  SolarFlare,
  SolarForecast,
  SolarActivity,
  FLARE_CLASSIFICATIONS,
  RISK_LEVEL_INFO,
  IMPACT_LEVEL_INFO,
} from '@/types';

interface SolarFlareData {
  flares: SolarFlare[];
  forecasts: SolarForecast[];
  activity: SolarActivity | null;
  stats: {
    totalFlares: number;
    last30Days: { xClass: number; mClass: number };
    largestRecent: { classification: string; intensity: number; date: Date } | null;
    upcomingDangerDays: number;
  };
}

export default function SolarFlareTrackerModule() {
  const [data, setData] = useState<SolarFlareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Initialize data first
        await fetch('/api/solar-flares/init', { method: 'POST' });

        // Fetch all data
        const res = await fetch('/api/solar-flares');
        const result = await res.json();

        if (result.error) {
          throw new Error(result.error);
        }

        setData(result);
      } catch (err) {
        console.error('Failed to fetch solar flare data:', err);
        setError('Failed to load solar activity data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-slate-800 flex items-center">
            <span className="text-3xl mr-3">☀️</span>
            Solar Flare Tracker
          </h2>
        </div>
        <div className="card p-8 text-center">
          <div className="w-10 h-10 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderWidth: '3px' }} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-slate-800 flex items-center">
            <span className="text-3xl mr-3">☀️</span>
            Solar Flare Tracker
          </h2>
        </div>
        <div className="card p-8 text-center">
          <span className="text-4xl block mb-4">⚠️</span>
          <p className="text-slate-500">{error || 'No data available'}</p>
        </div>
      </div>
    );
  }

  // Find danger periods in forecasts
  const dangerForecasts = data.forecasts.filter(
    f => ['high', 'severe', 'extreme'].includes(f.riskLevel)
  );

  // Get current risk level (today's forecast)
  const todayForecast = data.forecasts[0];
  const currentRisk = todayForecast ? RISK_LEVEL_INFO[todayForecast.riskLevel] : RISK_LEVEL_INFO.low;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-white flex items-center">
          <span className="text-3xl mr-3">☀️</span>
          Solar Flare Tracker
        </h2>
        <Link
          href="/solar-flares"
          className="text-nebula-300 hover:text-nebula-200 transition-colors text-sm"
        >
          Full Dashboard →
        </Link>
      </div>

      {/* Current Status Alert */}
      {todayForecast && (
        <div className={`rounded-lg p-4 border ${
          todayForecast.riskLevel === 'extreme' ? 'bg-red-900/30 border-red-500' :
          todayForecast.riskLevel === 'severe' ? 'bg-red-800/20 border-red-400' :
          todayForecast.riskLevel === 'high' ? 'bg-orange-900/20 border-orange-500' :
          todayForecast.riskLevel === 'moderate' ? 'bg-yellow-900/20 border-yellow-500' :
          'bg-green-900/20 border-green-500'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{currentRisk.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${currentRisk.color}`}>
                    {currentRisk.label} Risk
                  </span>
                  {todayForecast.alertActive && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded animate-pulse">
                      ALERT
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-sm">Current solar activity status</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-slate-600 text-sm">X-Class Probability</div>
              <div className={`text-2xl font-bold ${
                todayForecast.probX >= 20 ? 'text-red-400' :
                todayForecast.probX >= 10 ? 'text-orange-400' :
                'text-slate-600'
              }`}>
                {todayForecast.probX}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">
            {data.stats.last30Days.xClass}
          </div>
          <div className="text-slate-500 text-sm">X-Class (30d)</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">
            {data.stats.last30Days.mClass}
          </div>
          <div className="text-slate-500 text-sm">M-Class (30d)</div>
        </div>
        <div className="card p-4 text-center">
          <div className={`text-2xl font-bold ${
            data.stats.upcomingDangerDays >= 10 ? 'text-red-400' :
            data.stats.upcomingDangerDays >= 5 ? 'text-orange-400' :
            'text-yellow-400'
          }`}>
            {data.stats.upcomingDangerDays}
          </div>
          <div className="text-slate-500 text-sm">Danger Days (90d)</div>
        </div>
        <div className="card p-4 text-center">
          {data.stats.largestRecent ? (
            <>
              <div className="text-2xl font-bold text-red-400">
                {data.stats.largestRecent.classification}{data.stats.largestRecent.intensity}
              </div>
              <div className="text-slate-500 text-sm">Largest Recent</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-slate-500">-</div>
              <div className="text-slate-500 text-sm">Largest Recent</div>
            </>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Flares */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span>🔥</span> Recent Solar Flares
          </h3>
          <div className="space-y-3">
            {data.flares.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No recent flares</p>
            ) : (
              data.flares.slice(0, 5).map((flare) => {
                const classInfo = FLARE_CLASSIFICATIONS.find(c => c.value === flare.classification);
                return (
                  <div key={flare.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${classInfo?.color || 'bg-gray-500'}`}>
                        {flare.classification}{flare.intensity}
                      </div>
                      <div>
                        <div className="text-slate-800 text-sm font-medium">
                          {flare.activeRegion || 'Unknown Region'}
                        </div>
                        <div className="text-slate-500 text-xs">
                          {new Date(flare.startTime).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                    {flare.linkedCME && (
                      <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                        CME
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Danger Forecast */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span>⚠️</span> 90-Day Danger Forecast
          </h3>
          {dangerForecasts.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl block mb-2">✓</span>
              <p className="text-green-400">No significant danger periods expected</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dangerForecasts.slice(0, 5).map((forecast, idx) => {
                const riskInfo = RISK_LEVEL_INFO[forecast.riskLevel];
                const date = new Date(forecast.forecastDate);
                return (
                  <div key={idx} className={`p-3 rounded-lg border ${
                    forecast.riskLevel === 'extreme' ? 'bg-red-900/20 border-red-500/50' :
                    forecast.riskLevel === 'severe' ? 'bg-red-800/10 border-red-400/50' :
                    'bg-orange-900/10 border-orange-500/50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{riskInfo.icon}</span>
                        <span className={`font-medium ${riskInfo.color}`}>
                          {riskInfo.label}
                        </span>
                        <span className="text-slate-500 text-sm">
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="text-slate-500 text-sm">
                        X: {forecast.probX}% | M: {forecast.probM}%
                      </div>
                    </div>
                    {forecast.notes && (
                      <p className="text-slate-500 text-xs mt-1">{forecast.notes}</p>
                    )}
                  </div>
                );
              })}
              {dangerForecasts.length > 5 && (
                <p className="text-slate-500 text-sm text-center">
                  +{dangerForecasts.length - 5} more danger periods
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Current Solar Wind (if available) */}
      {data.activity && (
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span>🌬️</span> Current Solar Conditions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-slate-800">
                {Math.round(data.activity.solarWindSpeed || 0)} km/s
              </div>
              <div className="text-slate-500 text-sm">Solar Wind</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-slate-800">
                Kp {(data.activity.kpIndex || 0).toFixed(1)}
              </div>
              <div className="text-slate-500 text-sm">Kp Index</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-slate-800">
                {data.activity.sunspotNumber || 0}
              </div>
              <div className="text-slate-500 text-sm">Sunspot Number</div>
            </div>
            <div className="text-center">
              <div className={`text-xl font-bold capitalize ${
                data.activity.overallStatus === 'stormy' ? 'text-red-400' :
                data.activity.overallStatus === 'active' ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {data.activity.overallStatus}
              </div>
              <div className="text-slate-500 text-sm">Status</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
