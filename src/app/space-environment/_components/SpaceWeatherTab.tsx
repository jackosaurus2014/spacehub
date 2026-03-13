'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  SolarFlare,
  SolarForecast,
  SolarActivity,
  FLARE_CLASSIFICATIONS,
  RISK_LEVEL_INFO,
  IMPACT_LEVEL_INFO,
} from '@/types';
import ScrollReveal from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';
import { SkeletonPage } from '@/components/ui/Skeleton';
import { clientLogger } from '@/lib/client-logger';

// ════════════════════════════════════════
// Solar Flares Types & Constants
// ════════════════════════════════════════

const FLARE_EXPORT_COLUMNS = [
  { key: 'classification', label: 'Classification' },
  { key: 'intensity', label: 'Intensity' },
  { key: 'startTime', label: 'Start Time' },
  { key: 'peakTime', label: 'Peak Time' },
  { key: 'activeRegion', label: 'Active Region' },
  { key: 'radioBlackout', label: 'Radio Blackout' },
  { key: 'geomagneticStorm', label: 'Geomagnetic Storm' },
  { key: 'linkedCME', label: 'CME Associated' },
  { key: 'description', label: 'Description' },
];

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

// ════════════════════════════════════════
// Dynamic Content Interfaces
// ════════════════════════════════════════

interface EarthEvent {
  id: string;
  title: string;
  description: string;
  categories: { id: number; title: string }[];
  sources: { id: string; url: string }[];
  geometry: { date: string; type: string; coordinates: number[] }[];
  closed: string | null;
}

interface SolarImagery {
  id: string;
  name: string;
  description: string;
  image_url: string;
  timestamp: string;
  instrument: string;
  measurement: string;
}

const EARTH_EVENT_CATEGORY_COLORS: Record<string, string> = {
  wildfires: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'severe storms': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  volcanoes: 'bg-red-500/20 text-red-400 border-red-500/30',
  floods: 'bg-white/10 text-slate-300 border-white/10',
  earthquakes: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  drought: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'sea and lake ice': 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  landslides: 'bg-stone-500/20 text-stone-400 border-stone-500/30',
  'snow': 'bg-slate-400/20 text-slate-300 border-slate-400/30',
  'temperature extremes': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

// ════════════════════════════════════════
// Fallback Data
// ════════════════════════════════════════

const FALLBACK_EARTH_EVENTS: EarthEvent[] = [
  {
    id: 'EONET_6542',
    title: 'X2.3 Solar Flare - Active Region 3842',
    description: 'Major X-class solar flare eruption from sunspot group AR3842 producing significant radio blackout on dayside of Earth.',
    categories: [{ id: 1, title: 'Severe Storms' }],
    sources: [{ id: 'NOAA_SWPC', url: 'https://www.swpc.noaa.gov/' }],
    geometry: [{ date: '2026-02-22T14:32:00Z', type: 'Point', coordinates: [-95.5, 30.2] }],
    closed: null,
  },
  {
    id: 'EONET_6538',
    title: 'Geomagnetic Storm Watch - G3 (Strong)',
    description: 'NOAA issued G3 geomagnetic storm watch following Earth-directed coronal mass ejection. Aurora visible at mid-latitudes.',
    categories: [{ id: 1, title: 'Severe Storms' }],
    sources: [{ id: 'NOAA_SWPC', url: 'https://www.swpc.noaa.gov/products/geomagnetic-storm-watches' }],
    geometry: [{ date: '2026-02-20T08:15:00Z', type: 'Point', coordinates: [-77.0, 38.9] }],
    closed: null,
  },
  {
    id: 'EONET_6535',
    title: 'Coronal Mass Ejection - Halo CME Event',
    description: 'Full-halo CME observed by SOHO/LASCO C2 coronagraph traveling at approximately 1,200 km/s. Expected Earth arrival in 36-48 hours.',
    categories: [{ id: 1, title: 'Severe Storms' }],
    sources: [{ id: 'NASA_DONKI', url: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/' }],
    geometry: [{ date: '2026-02-19T22:45:00Z', type: 'Point', coordinates: [0, 0] }],
    closed: '2026-02-21T18:00:00Z',
  },
  {
    id: 'EONET_6530',
    title: 'Solar Energetic Particle Event - S2 (Moderate)',
    description: 'Elevated proton flux detected by GOES-18 exceeding S2 threshold. Increased radiation risk for polar-route aviation and EVA activities.',
    categories: [{ id: 1, title: 'Temperature Extremes' }],
    sources: [{ id: 'NOAA_SWPC', url: 'https://www.swpc.noaa.gov/products/solar-radiation-storm-forecast' }],
    geometry: [{ date: '2026-02-18T06:20:00Z', type: 'Point', coordinates: [-105.0, 40.0] }],
    closed: '2026-02-19T14:00:00Z',
  },
  {
    id: 'EONET_6527',
    title: 'Radio Blackout R2 - Shortwave Fadeout',
    description: 'M7.4 flare caused R2 moderate radio blackout affecting HF communications across the Pacific region for approximately 45 minutes.',
    categories: [{ id: 1, title: 'Severe Storms' }],
    sources: [{ id: 'NOAA_SWPC', url: 'https://www.swpc.noaa.gov/products/radio-blackout-forecast' }],
    geometry: [{ date: '2026-02-16T11:08:00Z', type: 'Point', coordinates: [139.7, 35.7] }],
    closed: '2026-02-16T11:53:00Z',
  },
  {
    id: 'EONET_6524',
    title: 'Geomagnetic Storm - G1 (Minor) Ongoing',
    description: 'Minor geomagnetic storm conditions persisting due to high-speed solar wind stream from coronal hole. Kp index reaching 5.',
    categories: [{ id: 1, title: 'Severe Storms' }],
    sources: [{ id: 'NOAA_SWPC', url: 'https://www.swpc.noaa.gov/products/planetary-k-index' }],
    geometry: [{ date: '2026-02-15T03:00:00Z', type: 'Point', coordinates: [-90.0, 45.0] }],
    closed: null,
  },
];

const FALLBACK_SOLAR_IMAGERY: SolarImagery[] = [
  {
    id: 'sdo-aia-171',
    name: 'SDO AIA 171 - Coronal Loops',
    description: 'Extreme ultraviolet image showing the solar corona at 171 angstroms, highlighting coronal loops and active regions at approximately 600,000 K.',
    image_url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0171.jpg',
    timestamp: '2026-02-25T12:00:00Z',
    instrument: 'SDO/AIA',
    measurement: '171 \u00C5 (Fe IX)',
  },
  {
    id: 'sdo-aia-304',
    name: 'SDO AIA 304 - Chromosphere',
    description: 'View of the solar chromosphere and transition region at 304 angstroms, showing prominences and filaments at approximately 50,000 K.',
    image_url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0304.jpg',
    timestamp: '2026-02-25T12:00:00Z',
    instrument: 'SDO/AIA',
    measurement: '304 \u00C5 (He II)',
  },
  {
    id: 'sdo-hmi-mag',
    name: 'SDO HMI Magnetogram',
    description: 'Solar photospheric magnetic field map from the Helioseismic and Magnetic Imager, showing positive (white) and negative (black) polarity magnetic regions.',
    image_url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_HMIBC.jpg',
    timestamp: '2026-02-25T12:00:00Z',
    instrument: 'SDO/HMI',
    measurement: 'Magnetogram',
  },
  {
    id: 'soho-lasco-c2',
    name: 'SOHO LASCO C2 Coronagraph',
    description: 'White-light coronagraph image from SOHO showing the solar corona from 1.5 to 6 solar radii. Used for detecting coronal mass ejections.',
    image_url: 'https://soho.nascom.nasa.gov/data/realtime/c2/1024/latest.jpg',
    timestamp: '2026-02-25T12:00:00Z',
    instrument: 'SOHO/LASCO',
    measurement: 'C2 White Light',
  },
];

function getEventCategoryColor(categoryTitle: string): string {
  const lower = categoryTitle.toLowerCase();
  for (const [key, value] of Object.entries(EARTH_EVENT_CATEGORY_COLORS)) {
    if (lower.includes(key)) return value;
  }
  return 'bg-slate-800/500/20 text-slate-400 border-slate-500/30';
}

// ════════════════════════════════════════════════════════════════
// SPACE WEATHER TAB CONTENT
// ════════════════════════════════════════════════════════════════

export default function SpaceWeatherTab() {
  const [data, setData] = useState<SolarFlareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubTab, setSelectedSubTab] = useState<'overview' | 'forecast' | 'history'>('overview');
  const [error, setError] = useState<string | null>(null);

  // Dynamic content state
  const [earthEvents, setEarthEvents] = useState<EarthEvent[]>(FALLBACK_EARTH_EVENTS);
  const [solarImagery, setSolarImagery] = useState<SolarImagery[]>(FALLBACK_SOLAR_IMAGERY);
  const [contentLoading, setContentLoading] = useState(false);

  const fetchWeatherData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetch('/api/solar-flares/init', { method: 'POST' });
      const res = await fetch('/api/solar-flares');
      const result = await res.json();
      setData(result);
    } catch (err) {
      clientLogger.error('Failed to fetch solar flare data', { error: err instanceof Error ? err.message : String(err) });
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContent = useCallback(async () => {
    setContentLoading(true);
    try {
      const [eventsRes, imageryRes] = await Promise.all([
        fetch('/api/content/space-environment?section=earth-events'),
        fetch('/api/content/space-environment?section=solar-imagery'),
      ]);

      const [eventsData, imageryData] = await Promise.all([
        eventsRes.json(),
        imageryRes.json(),
      ]);

      setEarthEvents(eventsData.data?.length >= 3 ? eventsData.data : FALLBACK_EARTH_EVENTS);
      setSolarImagery(imageryData.data?.length >= 2 ? imageryData.data : FALLBACK_SOLAR_IMAGERY);
    } catch (error) {
      clientLogger.error('Failed to fetch dynamic content', { error: error instanceof Error ? error.message : String(error) });
      setEarthEvents(FALLBACK_EARTH_EVENTS);
      setSolarImagery(FALLBACK_SOLAR_IMAGERY);
    } finally {
      setContentLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeatherData();
  }, [fetchWeatherData]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  if (loading) {
    return <SkeletonPage statCards={5} statGridCols="grid-cols-2 md:grid-cols-5" contentCards={2} />;
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <span className="text-5xl block mb-4">&#9888;&#65039;</span>
        <p className="text-slate-400 mb-4">Failed to load solar activity data</p>
        <button
          onClick={fetchWeatherData}
          className="px-4 py-2 bg-white hover:bg-slate-100 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const dangerForecasts = data.forecasts.filter(
    f => ['high', 'severe', 'extreme'].includes(f.riskLevel)
  );

  const todayForecast = data.forecasts[0];
  const currentRisk = todayForecast ? RISK_LEVEL_INFO[todayForecast.riskLevel] : RISK_LEVEL_INFO.low;

  return (
    <div className="space-y-8">
      {error && (
        <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
          <div className="text-red-400 text-sm font-medium mb-3">{error}</div>
          <button
            onClick={fetchWeatherData}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Current Status Banner */}
      {todayForecast && (
        <div className={`rounded-xl p-6 border-2 ${
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
                <p className="text-slate-400 mt-1">
                  Current geomagnetic conditions: {todayForecast.geomagneticLevel || 'Quiet'}
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-slate-400 text-sm">C-Class</div>
                <div className="text-2xl font-bold text-white">{todayForecast.probC}%</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400 text-sm">M-Class</div>
                <div className="text-2xl font-bold text-orange-400">{todayForecast.probM}%</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400 text-sm">X-Class</div>
                <div className="text-2xl font-bold text-red-400">{todayForecast.probX}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4" role="region" aria-label="Solar activity statistics">
        <span className="sr-only">
          {`Solar activity overview: ${data.stats.last30Days.xClass} X-class flares in the last 30 days, ${data.stats.last30Days.mClass} M-class flares in the last 30 days, ${data.stats.upcomingDangerDays} danger days forecasted in the next 90 days, solar wind speed ${data.activity ? Math.round(data.activity.solarWindSpeed || 0) + ' km/s' : 'unavailable'}, sunspot number ${data.activity ? (data.activity.sunspotNumber || 0) : 'unavailable'}`}
        </span>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-white">{data.stats.last30Days.xClass}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">X-Class (30d)</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-white">{data.stats.last30Days.mClass}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">M-Class (30d)</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className={`text-4xl font-bold font-display tracking-tight ${
            data.stats.upcomingDangerDays >= 10 ? 'text-red-400' : 'text-orange-400'
          }`}>
            {data.stats.upcomingDangerDays}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Danger Days (90d)</div>
        </div>
        <div className="card-elevated p-6 text-center">
          {data.activity ? (
            <>
              <div className="text-4xl font-bold font-display tracking-tight text-white">{Math.round(data.activity.solarWindSpeed || 0)}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Solar Wind (km/s)</div>
            </>
          ) : (
            <>
              <div className="text-4xl font-bold font-display tracking-tight text-slate-400">-</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Solar Wind</div>
            </>
          )}
        </div>
        <div className="card-elevated p-6 text-center">
          {data.activity ? (
            <>
              <div className="text-4xl font-bold font-display tracking-tight text-white">{data.activity.sunspotNumber || 0}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Sunspot Number</div>
            </>
          ) : (
            <>
              <div className="text-4xl font-bold font-display tracking-tight text-slate-400">-</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Sunspots</div>
            </>
          )}
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex gap-2">
        {(['overview', 'forecast', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedSubTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${
              selectedSubTab === tab
                ? 'bg-slate-700/50 text-white border-slate-700/50 shadow-glow-sm'
                : 'bg-transparent text-slate-400 border border-slate-700/50 hover:border-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Sub-Tab Content */}
      {selectedSubTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 90-Day Danger Timeline */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span>&#9888;&#65039;</span> 90-Day Danger Periods
              </h3>
              {dangerForecasts.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-5xl block mb-4">&#10003;</span>
                  <p className="text-green-400 text-lg">No significant danger periods forecasted</p>
                  <p className="text-slate-400 mt-2">Solar activity expected to remain at normal levels</p>
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
                            <div className="text-slate-400 text-sm mt-1">
                              {date.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                              <span className="text-slate-400 ml-2">
                                ({daysFromNow === 0 ? 'Today' : daysFromNow === 1 ? 'Tomorrow' : `${daysFromNow} days`})
                              </span>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="text-slate-400">X: {forecast.probX}%</div>
                            <div className="text-slate-400">M: {forecast.probM}%</div>
                          </div>
                        </div>
                        {forecast.notes && (
                          <p className="text-slate-400 text-sm mt-2 border-t border-slate-700/50 pt-2">
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
                <span>&#128293;</span> Recent Solar Flares
              </h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {data.flares.map((flare) => {
                  const classInfo = FLARE_CLASSIFICATIONS.find(c => c.value === flare.classification);

                  return (
                    <div key={flare.id} className="p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-lg ${classInfo?.color || 'bg-slate-500'}`}>
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
                          <div className="text-slate-400 text-sm">
                            {new Date(flare.startTime).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          {flare.description && (
                            <p className="text-slate-400 text-sm mt-2">{flare.description}</p>
                          )}
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

          {/* Related Modules */}
          <ScrollReveal>
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>&#128279;</span> Related Modules
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Link href="/space-environment?tab=debris" className="p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group">
                <div className="text-sm font-medium text-white group-hover:text-nebula-200">&#128752; Debris Monitor</div>
                <p className="text-xs text-slate-400 mt-1">Solar storms can alter debris orbits</p>
              </Link>
              <Link href="/orbital-slots" className="p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group">
                <div className="text-sm font-medium text-white group-hover:text-nebula-200">&#128225; Orbital Slots</div>
                <p className="text-xs text-slate-400 mt-1">Check satellite exposure to solar events</p>
              </Link>
              <Link href="/space-insurance" className="p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group">
                <div className="text-sm font-medium text-white group-hover:text-nebula-200">&#128737;&#65039; Space Insurance</div>
                <p className="text-xs text-slate-400 mt-1">Solar activity affects insurance risk</p>
              </Link>
              <Link href="/mission-control" className="p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group">
                <div className="text-sm font-medium text-white group-hover:text-nebula-200">&#127919; Mission Control</div>
                <p className="text-xs text-slate-400 mt-1">Solar weather impacts launch windows</p>
              </Link>
            </div>
          </div>
          </ScrollReveal>
        </div>
      )}

      {selectedSubTab === 'forecast' && (
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
                      <div className="absolute -bottom-5 left-0 text-xs text-slate-400 whitespace-nowrap">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-sm whitespace-nowrap shadow-xl">
                        <div className="font-medium text-white">
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className={riskInfo.color}>{riskInfo.label} Risk</div>
                        <div className="text-slate-400 text-xs mt-1">
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
          <div className="flex flex-wrap gap-4 mt-8 pt-4 border-t border-slate-700/50">
            {Object.entries(RISK_LEVEL_INFO).map(([level, info]) => (
              <div key={level} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${info.bgColor}`} />
                <span className="text-slate-400 text-sm">{info.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedSubTab === 'history' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Solar Flare History</h3>
            <ExportButton data={data.flares} filename="solar-flare-history" columns={FLARE_EXPORT_COLUMNS} label="Export" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700/50">
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
                    <tr key={flare.id} className="border-b border-slate-700/50">
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-1 rounded text-white font-bold ${classInfo?.color}`}>
                          {flare.classification}{flare.intensity}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-400">
                        {new Date(flare.startTime).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 pr-4 text-slate-400">{flare.activeRegion || '-'}</td>
                      <td className="py-3 pr-4">
                        {flare.radioBlackout && flare.radioBlackout !== 'none' ? (
                          <span className={IMPACT_LEVEL_INFO[flare.radioBlackout].color}>
                            {flare.radioBlackout}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {flare.geomagneticStorm && flare.geomagneticStorm !== 'none' ? (
                          <span className={IMPACT_LEVEL_INFO[flare.geomagneticStorm].color}>
                            {flare.geomagneticStorm}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3">
                        {flare.linkedCME ? (
                          <span className="text-purple-400">Yes</span>
                        ) : (
                          <span className="text-slate-400">No</span>
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

      {/* Dynamic Content Sections */}
      {contentLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: '3px' }} />
        </div>
      ) : (
        <>
          {/* Earth Natural Events - NASA EONET */}
          {earthEvents.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span>{'\u{1F30B}'}</span> Earth Natural Events
                <span className="ml-2 text-slate-400 text-sm font-normal">NASA EONET</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {earthEvents.map((event) => {
                  const categoryTitle = event.categories?.[0]?.title || 'Unknown';
                  const categoryColor = getEventCategoryColor(categoryTitle);
                  const latestGeo = event.geometry?.[event.geometry.length - 1];
                  const isOpen = !event.closed;

                  return (
                    <div key={event.id} className="card p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-semibold text-sm line-clamp-2">{event.title}</h4>
                        </div>
                        <span className={`ml-2 flex-shrink-0 w-2.5 h-2.5 rounded-full mt-1 ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`text-xs px-2 py-0.5 rounded border ${categoryColor}`}>
                          {categoryTitle}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${isOpen ? 'bg-green-500/20 text-green-400' : 'bg-slate-800/500/20 text-slate-400'}`}>
                          {isOpen ? 'Active' : 'Closed'}
                        </span>
                      </div>
                      {latestGeo && (
                        <div className="text-xs text-slate-400 space-y-1">
                          <div>
                            {new Date(latestGeo.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          {latestGeo.coordinates && latestGeo.coordinates.length >= 2 && (
                            <div>
                              {latestGeo.coordinates[1].toFixed(2)}&deg;N, {latestGeo.coordinates[0].toFixed(2)}&deg;E
                            </div>
                          )}
                        </div>
                      )}
                      {event.sources && event.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-700/50">
                          <a
                            href={event.sources[0].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-nebula-300 hover:text-nebula-200 transition-colors"
                          >
                            Source: {event.sources[0].id} &rarr;
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Solar Imagery - Helioviewer */}
          {solarImagery.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span>{'\u2600\uFE0F'}</span> Solar Imagery
                <span className="ml-2 text-slate-400 text-sm font-normal">SDO / SOHO</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {solarImagery.map((img) => (
                  <div key={img.id} className="card overflow-hidden">
                    <div className="relative h-48 bg-slate-900">
                      <Image
                        src={img.image_url}
                        alt={img.name || 'Solar image'}
                        className="w-full h-full object-cover"
                        fill
                        unoptimized
                      />
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded font-medium">
                          {img.instrument}
                        </span>
                        <span className="text-xs text-slate-400">{img.measurement}</span>
                      </div>
                      {img.name && (
                        <h4 className="text-white text-sm font-medium line-clamp-1">{img.name}</h4>
                      )}
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(img.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      {img.description && (
                        <p className="text-slate-400 text-xs mt-2 line-clamp-2">{img.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Flare Classification Legend */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Solar Flare Classifications</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {FLARE_CLASSIFICATIONS.map((cls) => (
            <div key={cls.value} className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded flex items-center justify-center text-white font-bold ${cls.color}`}>
                {cls.value}
              </div>
              <div>
                <div className="text-white font-medium">{cls.label}</div>
                <div className="text-slate-400 text-xs">{cls.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
