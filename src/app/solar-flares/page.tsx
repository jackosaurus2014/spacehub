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
  RiskLevel,
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

export default function SolarFlaresPage() {
  const [data, setData] = useState<SolarFlareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'forecast' | 'history'>('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetch('/api/solar-flares/init', { method: 'POST' });
        const res = await fetch('/api/solar-flares');
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error('Failed to fetch solar flare data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-20">
            <div
              className="w-12 h-12 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin"
              style={{ borderWidth: '3px' }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4 text-center py-20">
          <span className="text-5xl block mb-4">⚠️</span>
          <p className="text-star-300">Failed to load solar activity data</p>
        </div>
      </div>
    );
  }

  const dangerForecasts = data.forecasts.filter(
    f => ['high', 'severe', 'extreme'].includes(f.riskLevel)
  );

  const todayForecast = data.forecasts[0];
  const currentRisk = todayForecast ? RISK_LEVEL_INFO[todayForecast.riskLevel] : RISK_LEVEL_INFO.low;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-star-400 text-sm mb-2">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <span className="text-white">Solar Flare Tracker</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white flex items-center gap-3">
            <span className="text-4xl">☀️</span>
            Solar Flare Tracker
          </h1>
          <p className="text-star-300 mt-2">
            Real-time solar activity monitoring and 90-day danger forecasts
          </p>
        </div>

        {/* Current Status Banner */}
        {todayForecast && (
          <div className={`rounded-xl p-6 mb-8 border-2 ${
            todayForecast.riskLevel === 'extreme' ? 'bg-red-900/40 border-red-500' :
            todayForecast.riskLevel === 'severe' ? 'bg-red-800/30 border-red-400' :
            todayForecast.riskLevel === 'high' ? 'bg-orange-900/30 border-orange-500' :
            todayForecast.riskLevel === 'moderate' ? 'bg-yellow-900/30 border-yellow-500' :
            'bg-green-900/30 border-green-500'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-5xl">{currentRisk.icon}</span>
                <div>
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl font-bold ${currentRisk.color}`}>
                      {currentRisk.label} Risk Level
                    </span>
                    {todayForecast.alertActive && (
                      <span className="px-3 py-1 bg-red-500/30 text-red-300 text-sm rounded-full animate-pulse font-medium">
                        ALERT ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-star-300 mt-1">
                    Current geomagnetic conditions: {todayForecast.geomagneticLevel || 'Quiet'}
                  </p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-star-400 text-sm">C-Class</div>
                  <div className="text-2xl font-bold text-white">{todayForecast.probC}%</div>
                </div>
                <div className="text-center">
                  <div className="text-star-400 text-sm">M-Class</div>
                  <div className="text-2xl font-bold text-orange-400">{todayForecast.probM}%</div>
                </div>
                <div className="text-center">
                  <div className="text-star-400 text-sm">X-Class</div>
                  <div className="text-2xl font-bold text-red-400">{todayForecast.probX}%</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-white">{data.stats.last30Days.xClass}</div>
            <div className="text-star-400 text-sm">X-Class (30d)</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-white">{data.stats.last30Days.mClass}</div>
            <div className="text-star-400 text-sm">M-Class (30d)</div>
          </div>
          <div className="card p-4 text-center">
            <div className={`text-3xl font-bold ${
              data.stats.upcomingDangerDays >= 10 ? 'text-red-400' : 'text-orange-400'
            }`}>
              {data.stats.upcomingDangerDays}
            </div>
            <div className="text-star-400 text-sm">Danger Days (90d)</div>
          </div>
          <div className="card p-4 text-center">
            {data.activity ? (
              <>
                <div className="text-3xl font-bold text-white">{Math.round(data.activity.solarWindSpeed || 0)}</div>
                <div className="text-star-400 text-sm">Solar Wind (km/s)</div>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-star-500">-</div>
                <div className="text-star-400 text-sm">Solar Wind</div>
              </>
            )}
          </div>
          <div className="card p-4 text-center">
            {data.activity ? (
              <>
                <div className="text-3xl font-bold text-white">{data.activity.sunspotNumber || 0}</div>
                <div className="text-star-400 text-sm">Sunspot Number</div>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-star-500">-</div>
                <div className="text-star-400 text-sm">Sunspots</div>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['overview', 'forecast', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${
                selectedTab === tab
                  ? 'bg-nebula-500 text-white'
                  : 'bg-space-700/50 text-star-200 hover:bg-space-600/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {selectedTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 90-Day Danger Timeline */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span>⚠️</span> 90-Day Danger Periods
              </h3>
              {dangerForecasts.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-5xl block mb-4">✓</span>
                  <p className="text-green-400 text-lg">No significant danger periods forecasted</p>
                  <p className="text-star-400 mt-2">Solar activity expected to remain at normal levels</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {dangerForecasts.map((forecast, idx) => {
                    const riskInfo = RISK_LEVEL_INFO[forecast.riskLevel];
                    const date = new Date(forecast.forecastDate);
                    const daysFromNow = Math.ceil(
                      (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    );

                    return (
                      <div key={idx} className={`p-4 rounded-lg border ${
                        forecast.riskLevel === 'extreme' ? 'bg-red-900/30 border-red-500' :
                        forecast.riskLevel === 'severe' ? 'bg-red-800/20 border-red-400' :
                        'bg-orange-900/20 border-orange-500'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{riskInfo.icon}</span>
                              <span className={`font-semibold ${riskInfo.color}`}>
                                {riskInfo.label} Risk
                              </span>
                            </div>
                            <div className="text-star-300 text-sm mt-1">
                              {date.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                              <span className="text-star-500 ml-2">
                                ({daysFromNow === 0 ? 'Today' : daysFromNow === 1 ? 'Tomorrow' : `${daysFromNow} days`})
                              </span>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="text-star-200">X: {forecast.probX}%</div>
                            <div className="text-star-400">M: {forecast.probM}%</div>
                          </div>
                        </div>
                        {forecast.notes && (
                          <p className="text-star-400 text-sm mt-2 border-t border-space-600 pt-2">
                            {forecast.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Flares */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span>🔥</span> Recent Solar Flares
              </h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {data.flares.map((flare) => {
                  const classInfo = FLARE_CLASSIFICATIONS.find(c => c.value === flare.classification);

                  return (
                    <div key={flare.id} className="p-4 bg-space-700/30 rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-lg ${classInfo?.color || 'bg-gray-500'}`}>
                          {flare.classification}{flare.intensity}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-white">
                              {flare.activeRegion || 'Unknown Region'}
                            </div>
                            {flare.linkedCME && (
                              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                                CME Associated
                              </span>
                            )}
                          </div>
                          <div className="text-star-400 text-sm">
                            {new Date(flare.startTime).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          {flare.description && (
                            <p className="text-star-300 text-sm mt-2">{flare.description}</p>
                          )}
                          {/* Impact indicators */}
                          <div className="flex gap-4 mt-2 text-xs">
                            {flare.radioBlackout && flare.radioBlackout !== 'none' && (
                              <span className={IMPACT_LEVEL_INFO[flare.radioBlackout].color}>
                                Radio: {IMPACT_LEVEL_INFO[flare.radioBlackout].label}
                              </span>
                            )}
                            {flare.geomagneticStorm && flare.geomagneticStorm !== 'none' && (
                              <span className={IMPACT_LEVEL_INFO[flare.geomagneticStorm].color}>
                                Geomag: {IMPACT_LEVEL_INFO[flare.geomagneticStorm].label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'forecast' && (
          <div className="card p-6">
            <h3 className="text-xl font-semibold text-white mb-4">90-Day Forecast Timeline</h3>
            <div className="overflow-x-auto">
              <div className="flex gap-1 min-w-max pb-4">
                {data.forecasts.map((forecast, idx) => {
                  const riskInfo = RISK_LEVEL_INFO[forecast.riskLevel];
                  const date = new Date(forecast.forecastDate);
                  const isWeekStart = date.getDay() === 0;

                  return (
                    <div
                      key={idx}
                      className="group relative"
                      title={`${date.toLocaleDateString()} - ${riskInfo.label}`}
                    >
                      <div
                        className={`w-3 h-16 rounded-sm cursor-pointer transition-all group-hover:scale-110 ${riskInfo.bgColor}`}
                        style={{ opacity: 0.3 + (forecast.probX / 100) * 0.7 }}
                      />
                      {isWeekStart && (
                        <div className="absolute -bottom-5 left-0 text-xs text-star-400 whitespace-nowrap">
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      )}
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-space-800 border border-space-600 rounded-lg p-3 text-sm whitespace-nowrap shadow-xl">
                          <div className="font-medium text-white">
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          <div className={riskInfo.color}>{riskInfo.label} Risk</div>
                          <div className="text-star-400 text-xs mt-1">
                            C: {forecast.probC}% | M: {forecast.probM}% | X: {forecast.probX}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-8 pt-4 border-t border-space-600">
              {Object.entries(RISK_LEVEL_INFO).map(([level, info]) => (
                <div key={level} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${info.bgColor}`} />
                  <span className="text-star-300 text-sm">{info.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'history' && (
          <div className="card p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Solar Flare History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-star-400 border-b border-space-600">
                    <th className="pb-3 pr-4">Class</th>
                    <th className="pb-3 pr-4">Date/Time</th>
                    <th className="pb-3 pr-4">Region</th>
                    <th className="pb-3 pr-4">Radio</th>
                    <th className="pb-3 pr-4">Geomag</th>
                    <th className="pb-3">CME</th>
                  </tr>
                </thead>
                <tbody>
                  {data.flares.map((flare) => {
                    const classInfo = FLARE_CLASSIFICATIONS.find(c => c.value === flare.classification);

                    return (
                      <tr key={flare.id} className="border-b border-space-700">
                        <td className="py-3 pr-4">
                          <span className={`px-2 py-1 rounded text-white font-bold ${classInfo?.color}`}>
                            {flare.classification}{flare.intensity}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-star-200">
                          {new Date(flare.startTime).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 pr-4 text-star-300">{flare.activeRegion || '-'}</td>
                        <td className="py-3 pr-4">
                          {flare.radioBlackout && flare.radioBlackout !== 'none' ? (
                            <span className={IMPACT_LEVEL_INFO[flare.radioBlackout].color}>
                              {flare.radioBlackout}
                            </span>
                          ) : (
                            <span className="text-star-500">-</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {flare.geomagneticStorm && flare.geomagneticStorm !== 'none' ? (
                            <span className={IMPACT_LEVEL_INFO[flare.geomagneticStorm].color}>
                              {flare.geomagneticStorm}
                            </span>
                          ) : (
                            <span className="text-star-500">-</span>
                          )}
                        </td>
                        <td className="py-3">
                          {flare.linkedCME ? (
                            <span className="text-purple-400">Yes</span>
                          ) : (
                            <span className="text-star-500">No</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Flare Classification Legend */}
        <div className="card p-6 mt-8">
          <h3 className="text-lg font-semibold text-white mb-4">Solar Flare Classifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {FLARE_CLASSIFICATIONS.map((cls) => (
              <div key={cls.value} className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded flex items-center justify-center text-white font-bold ${cls.color}`}>
                  {cls.value}
                </div>
                <div>
                  <div className="text-white font-medium">{cls.label}</div>
                  <div className="text-star-400 text-xs">{cls.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
