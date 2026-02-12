'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PageHeader from '@/components/ui/PageHeader';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import {
  LaunchWindow,
  CelestialDestination,
  TransferType,
  TRANSFER_TYPES,
} from '@/types';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface LaunchWindowStats {
  totalDestinations: number;
  upcomingWindows: number;
  nextWindow: LaunchWindow | null;
  mostAccessible: CelestialDestination | null;
}

interface LaunchWindowData {
  destinations: CelestialDestination[];
  windows: LaunchWindow[];
  stats: LaunchWindowStats;
}

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const DESTINATION_TYPE_INFO: Record<string, { label: string; icon: string; color: string }> = {
  moon: { label: 'Moon', icon: '🌙', color: 'text-gray-300' },
  planet: { label: 'Planet', icon: '🪐', color: 'text-orange-400' },
  asteroid: { label: 'Asteroid', icon: '☄️', color: 'text-amber-400' },
  lagrange: { label: 'Lagrange Point', icon: '⚖️', color: 'text-cyan-400' },
};

const TRANSFER_TYPE_INFO: Record<TransferType, { label: string; color: string; bgColor: string }> = {
  hohmann: { label: 'Hohmann', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  low_energy: { label: 'Low-Energy', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  gravity_assist: { label: 'Gravity Assist', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  direct: { label: 'Direct', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
};

const MISSION_TYPE_INFO: Record<string, { label: string; icon: string }> = {
  landing: { label: 'Landing', icon: '🛬' },
  orbit: { label: 'Orbit', icon: '🛰️' },
  flyby: { label: 'Flyby', icon: '🚀' },
};

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function formatDate(date: Date | string | null): string {
  if (!date) return '--';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateShort(date: Date | string | null): string {
  if (!date) return '--';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function daysUntil(date: Date | string): number {
  const target = new Date(date);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getSuccessRate(total: number, successful: number): number {
  if (total === 0) return 0;
  return (successful / total) * 100;
}

function getSuccessRateColor(rate: number): string {
  if (rate >= 80) return 'text-green-400';
  if (rate >= 60) return 'text-yellow-400';
  if (rate >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function formatDistance(au: number | null): string {
  if (au === null) return '--';
  if (au < 0.01) return `${(au * 149597870.7).toFixed(0)} km`;
  return `${au.toFixed(2)} AU`;
}

function formatTravelTime(days: number): string {
  if (days < 30) return `${days} days`;
  if (days < 365) return `${(days / 30).toFixed(1)} months`;
  return `${(days / 365).toFixed(1)} years`;
}

// ────────────────────────────────────────
// Countdown Timer Component
// ────────────────────────────────────────

function CountdownTimer({ targetDate }: { targetDate: Date | string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / (1000 * 60)) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex items-center gap-3">
      <div className="text-center">
        <div className="text-2xl font-bold font-display text-cyan-400">{timeLeft.days}</div>
        <div className="text-[10px] text-slate-400 uppercase tracking-widest">Days</div>
      </div>
      <span className="text-slate-400">:</span>
      <div className="text-center">
        <div className="text-2xl font-bold font-display text-cyan-400">{String(timeLeft.hours).padStart(2, '0')}</div>
        <div className="text-[10px] text-slate-400 uppercase tracking-widest">Hrs</div>
      </div>
      <span className="text-slate-400">:</span>
      <div className="text-center">
        <div className="text-2xl font-bold font-display text-cyan-400">{String(timeLeft.minutes).padStart(2, '0')}</div>
        <div className="text-[10px] text-slate-400 uppercase tracking-widest">Min</div>
      </div>
      <span className="text-slate-400">:</span>
      <div className="text-center">
        <div className="text-2xl font-bold font-display text-cyan-400">{String(timeLeft.seconds).padStart(2, '0')}</div>
        <div className="text-[10px] text-slate-400 uppercase tracking-widest">Sec</div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Destination Card
// ────────────────────────────────────────

function DestinationCard({ destination }: { destination: CelestialDestination }) {
  const typeInfo = DESTINATION_TYPE_INFO[destination.type] || DESTINATION_TYPE_INFO.planet;
  const successRate = getSuccessRate(destination.totalMissions, destination.successfulMissions);
  const successColor = getSuccessRateColor(successRate);

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-cyan-500/30 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center text-2xl">
            {typeInfo.icon}
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">{destination.name}</h3>
            <span className={`text-sm ${typeInfo.color}`}>{typeInfo.label}</span>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xl font-bold ${successColor}`}>{successRate.toFixed(0)}%</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-widest">Success</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-900/50 rounded-lg p-3">
          <span className="text-slate-400 text-xs block mb-1">Distance</span>
          <span className="text-white text-sm font-medium">{formatDistance(destination.distanceFromEarth)}</span>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <span className="text-slate-400 text-xs block mb-1">Delta-V to Orbit</span>
          <span className="text-white text-sm font-medium">
            {destination.deltaVToOrbit ? `${destination.deltaVToOrbit} km/s` : '--'}
          </span>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <span className="text-slate-400 text-xs block mb-1">Synodic Period</span>
          <span className="text-white text-sm font-medium">
            {destination.synodicPeriod ? `${destination.synodicPeriod.toFixed(0)} days` : 'Continuous'}
          </span>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <span className="text-slate-400 text-xs block mb-1">Total Missions</span>
          <span className="text-white text-sm font-medium">{destination.totalMissions}</span>
        </div>
      </div>

      {/* Mission Success Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-slate-400 text-xs">Mission Success Rate</span>
          <span className="text-slate-400 text-xs">
            {destination.successfulMissions}/{destination.totalMissions}
          </span>
        </div>
        <div className="h-2 bg-slate-900/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              successRate >= 80 ? 'bg-green-500' :
              successRate >= 60 ? 'bg-yellow-500' :
              successRate >= 40 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${successRate}%` }}
          />
        </div>
      </div>

      {/* Delta-V Breakdown */}
      {(destination.deltaVToOrbit || destination.deltaVToLand) && (
        <div className="flex items-center gap-4 pt-3 border-t border-slate-700/50 text-sm">
          {destination.deltaVToOrbit && (
            <div className="flex-1">
              <span className="text-slate-400 text-xs">To Orbit</span>
              <div className="text-cyan-400 font-semibold">{destination.deltaVToOrbit} km/s</div>
            </div>
          )}
          {destination.deltaVToLand && (
            <>
              <div className="w-px h-8 bg-slate-700/50" />
              <div className="flex-1">
                <span className="text-slate-400 text-xs">To Land</span>
                <div className="text-cyan-400 font-semibold">{destination.deltaVToLand} km/s</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Description */}
      {destination.description && (
        <p className="text-slate-400 text-xs mt-4 leading-relaxed">{destination.description}</p>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Launch Window Card
// ────────────────────────────────────────

function WindowCard({ window: launchWindow }: { window: LaunchWindow }) {
  const transferInfo = TRANSFER_TYPE_INFO[launchWindow.transferType] || TRANSFER_TYPE_INFO.hohmann;
  const missionInfo = MISSION_TYPE_INFO[launchWindow.missionType] || MISSION_TYPE_INFO.orbit;
  const daysToOpen = daysUntil(launchWindow.windowOpen);
  const daysToClose = daysUntil(launchWindow.windowClose);
  const isOpen = daysToOpen <= 0 && daysToClose > 0;
  const isPast = daysToClose <= 0;

  return (
    <div className={`bg-slate-800/50 border rounded-xl p-5 transition-all ${
      isOpen ? 'border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.1)]' :
      isPast ? 'border-slate-700/30 opacity-60' :
      'border-slate-700/50 hover:border-cyan-500/30'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center text-xl">
            {missionInfo.icon}
          </div>
          <div>
            <h4 className="text-white font-semibold">{launchWindow.destination}</h4>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">{missionInfo.label}</span>
              <span className="text-slate-400">|</span>
              <span className={`${transferInfo.color}`}>{transferInfo.label}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          {isOpen ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">
              WINDOW OPEN
            </span>
          ) : isPast ? (
            <span className="text-xs font-medium px-2.5 py-1 rounded bg-slate-700/50 text-slate-400">
              Closed
            </span>
          ) : (
            <div>
              <div className="text-cyan-400 font-bold text-lg">T-{daysToOpen}d</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest">Until Open</div>
            </div>
          )}
        </div>
      </div>

      {/* Window Dates */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <span className="text-slate-400 text-xs block mb-1">Window Opens</span>
          <span className="text-white text-sm font-medium">{formatDateShort(launchWindow.windowOpen)}</span>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-cyan-500/20">
          <span className="text-cyan-500 text-xs block mb-1">Optimal</span>
          <span className="text-cyan-400 text-sm font-medium">{formatDateShort(launchWindow.optimalDate)}</span>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <span className="text-slate-400 text-xs block mb-1">Window Closes</span>
          <span className="text-white text-sm font-medium">{formatDateShort(launchWindow.windowClose)}</span>
        </div>
      </div>

      {/* Mission Parameters */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
        <div>
          <span className="text-slate-400 text-xs block">Travel Time</span>
          <span className="text-white font-medium">{formatTravelTime(launchWindow.travelTime)}</span>
        </div>
        <div className="w-px h-8 bg-slate-700/50" />
        <div>
          <span className="text-slate-400 text-xs block">Delta-V</span>
          <span className="text-white font-medium">{launchWindow.deltaV} km/s</span>
        </div>
        {launchWindow.c3Energy !== null && (
          <>
            <div className="w-px h-8 bg-slate-700/50" />
            <div>
              <span className="text-slate-400 text-xs block">C3 Energy</span>
              <span className="text-white font-medium">{launchWindow.c3Energy.toFixed(1)} km²/s²</span>
            </div>
          </>
        )}
        {launchWindow.arrivalVelocity !== null && (
          <>
            <div className="w-px h-8 bg-slate-700/50" />
            <div>
              <span className="text-slate-400 text-xs block">Arrival V</span>
              <span className="text-white font-medium">{launchWindow.arrivalVelocity.toFixed(1)} km/s</span>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
        <span className="text-slate-400 text-xs">
          Frequency: <span className="text-slate-300">{launchWindow.frequency}</span>
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${transferInfo.bgColor} ${transferInfo.color}`}>
          {TRANSFER_TYPES.find(t => t.value === launchWindow.transferType)?.description || launchWindow.transferType}
        </span>
      </div>

      {/* Description */}
      {launchWindow.description && (
        <p className="text-slate-400 text-xs mt-3 leading-relaxed">{launchWindow.description}</p>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Inner Content (uses useSearchParams)
// ────────────────────────────────────────

function LaunchWindowsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read initial values from URL
  const initialTab = (searchParams.get('tab') as 'windows' | 'destinations') || 'windows';
  const initialDestination = searchParams.get('destination') || '';

  const [activeTab, setActiveTab] = useState<'windows' | 'destinations'>(
    ['windows', 'destinations'].includes(initialTab) ? initialTab : 'windows'
  );
  const [data, setData] = useState<LaunchWindowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [destinationFilter, setDestinationFilter] = useState<string>(initialDestination);

  // ── URL sync helper ──

  const updateUrl = useCallback(
    (params: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(params)) {
        if (
          !value ||
          (key === 'tab' && value === 'windows') ||
          (key === 'destination' && value === '')
        ) {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      }
      const qs = newParams.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const handleTabChange = useCallback(
    (tab: 'windows' | 'destinations') => {
      setActiveTab(tab);
      if (tab === 'destinations') {
        updateUrl({ tab, destination: '' });
        setDestinationFilter('');
      } else {
        updateUrl({ tab, destination: destinationFilter });
      }
    },
    [updateUrl, destinationFilter]
  );

  const handleDestinationFilterChange = useCallback(
    (destination: string) => {
      setDestinationFilter(destination);
      updateUrl({ destination });
    },
    [updateUrl]
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/launch-windows?limit=50');
      const result = await res.json();
      if (result.error) {
        throw new Error(result.error);
      }
      setData(result);
    } catch (err) {
      console.error('Failed to fetch launch window data:', err);
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await fetch('/api/launch-windows/init', { method: 'POST' });
      await fetchData();
    } catch (error) {
      console.error('Failed to initialize launch window data:', error);
    } finally {
      setInitializing(false);
    }
  };

  // Filtered windows
  const filteredWindows = (data?.windows || []).filter((w) => {
    if (destinationFilter && w.destination !== destinationFilter) return false;
    return true;
  });

  // Sort windows by window open date
  const sortedWindows = [...filteredWindows].sort(
    (a, b) => new Date(a.windowOpen).getTime() - new Date(b.windowOpen).getTime()
  );

  // Get unique destinations from windows
  const windowDestinations = Array.from(new Set((data?.windows || []).map((w) => w.destination))).sort();

  // Find next upcoming window (first one that hasn't closed)
  const now = new Date();
  const nextWindow = sortedWindows.find((w) => new Date(w.windowClose) > now);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="container mx-auto px-4">
          <PageHeader
            title="Launch Windows"
            subtitle="Optimal launch windows and mission planning for planetary destinations"
            breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Launch Windows' }]}
          />
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!data || (!data.destinations.length && !data.windows.length)) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="container mx-auto px-4">
          <PageHeader
            title="Launch Windows"
            subtitle="Optimal launch windows and mission planning for planetary destinations"
            breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Launch Windows' }]}
          />
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center max-w-lg mx-auto">
            <div className="text-5xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Launch Window Data Available</h3>
            <p className="text-slate-400 mb-6">
              Load celestial destinations and upcoming launch windows to get started with mission planning.
            </p>
            <button
              onClick={handleInitialize}
              disabled={initializing}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {initializing ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Loading Data...
                </span>
              ) : (
                'Load Launch Window Data'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Launch Windows"
          subtitle="Optimal launch windows and mission planning for planetary destinations"
          icon="🪟"
          accentColor="purple"
        >
          <Link href="/" className="bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 px-4 rounded-lg transition-colors">
            Back to Dashboard
          </Link>
        </AnimatedPageHeader>

        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-white">
              {data.stats.totalDestinations}
            </div>
            <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
              Destinations
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-cyan-400">
              {data.stats.upcomingWindows}
            </div>
            <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
              Upcoming Windows
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-center">
            {nextWindow ? (
              <>
                <div className="text-2xl font-bold font-display tracking-tight text-green-400">
                  {nextWindow.destination}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Next Window
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {formatDateShort(nextWindow.windowOpen)}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold font-display tracking-tight text-slate-400">
                  --
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Next Window
                </div>
              </>
            )}
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-center">
            {data.stats.mostAccessible ? (
              <>
                <div className="text-2xl font-bold font-display tracking-tight text-purple-400">
                  {data.stats.mostAccessible.name}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Most Accessible
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {data.stats.mostAccessible.deltaVToOrbit} km/s
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold font-display tracking-tight text-slate-400">
                  --
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Most Accessible
                </div>
              </>
            )}
          </div>
        </div>

        {/* Next Window Countdown */}
        {nextWindow && (
          <div className="bg-gradient-to-r from-slate-800/80 to-slate-800/50 border border-cyan-500/20 rounded-xl p-6 mb-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Next Launch Window</h3>
                <p className="text-slate-400 text-sm">
                  <span className="text-cyan-400 font-medium">{nextWindow.destination}</span>
                  {' '} - {MISSION_TYPE_INFO[nextWindow.missionType]?.label || nextWindow.missionType} mission via{' '}
                  {TRANSFER_TYPE_INFO[nextWindow.transferType]?.label || nextWindow.transferType} transfer
                </p>
              </div>
              <CountdownTimer targetDate={nextWindow.windowOpen} />
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {[
            { id: 'windows' as const, label: 'Launch Windows', count: data.windows.length },
            { id: 'destinations' as const, label: 'Destinations', count: data.destinations.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-cyan-500 text-slate-900 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-slate-900'
                      : 'bg-slate-700/50 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ──────────────── LAUNCH WINDOWS TAB ──────────────── */}
        {activeTab === 'windows' && (
          <div>
            {/* Destination Filter */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-slate-400 text-sm">Filter by destination:</span>
                <button
                  onClick={() => handleDestinationFilterChange('')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    destinationFilter === ''
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  All ({data.windows.length})
                </button>
                {windowDestinations.map((dest) => {
                  const count = data.windows.filter((w) => w.destination === dest).length;
                  return (
                    <button
                      key={dest}
                      onClick={() => handleDestinationFilterChange(dest)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        destinationFilter === dest
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {dest} ({count})
                    </button>
                  );
                })}

                <span className="text-xs text-slate-400 ml-auto">
                  {filteredWindows.length} {filteredWindows.length === 1 ? 'window' : 'windows'} found
                </span>
              </div>
            </div>

            {/* Window Cards */}
            {sortedWindows.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🔭</div>
                <h3 className="text-xl font-semibold text-white mb-2">No launch windows found</h3>
                <p className="text-slate-400 mb-4">
                  {destinationFilter
                    ? `No upcoming windows to ${destinationFilter}. Try selecting a different destination.`
                    : 'No upcoming launch windows are currently available.'}
                </p>
                {destinationFilter && (
                  <button
                    onClick={() => handleDestinationFilterChange('')}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            ) : (
              <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sortedWindows.map((window) => (
                  <StaggerItem key={window.id}>
                    <WindowCard window={window} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}

            {/* Transfer Type Legend */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mt-8 border-dashed">
              <h3 className="text-white font-semibold mb-4">Transfer Types</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {TRANSFER_TYPES.map((transfer) => {
                  const info = TRANSFER_TYPE_INFO[transfer.value];
                  return (
                    <div key={transfer.value} className={`rounded-lg p-3 ${info.bgColor} border border-slate-700/30`}>
                      <span className={`text-sm font-semibold ${info.color}`}>{transfer.label}</span>
                      <p className="text-slate-400 text-xs mt-1">{transfer.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ──────────────── DESTINATIONS TAB ──────────────── */}
        {activeTab === 'destinations' && (
          <div>
            {/* Destination Cards */}
            {data.destinations.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🌌</div>
                <h3 className="text-xl font-semibold text-white mb-2">No destinations found</h3>
                <p className="text-slate-400">No celestial destinations are currently available.</p>
              </div>
            ) : (
              <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {data.destinations.map((destination) => (
                  <StaggerItem key={destination.id}>
                    <DestinationCard destination={destination} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}

            {/* Cross-module Links */}
            <div className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-5 mt-8">
              <h3 className="text-white font-semibold mb-3">Related Resources</h3>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/solar-exploration"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                >
                  <span>🌍</span>
                  Solar Exploration
                </Link>
                <Link
                  href="/debris-monitor"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                >
                  <span>⚠️</span>
                  Debris Monitor
                </Link>
                <Link
                  href="/orbital-slots"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                >
                  <span>🛰️</span>
                  Orbital Slots
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Data Sources Footer */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mt-8 mb-8 border-dashed">
          <h3 className="text-white font-semibold mb-3">Data Sources & Methodology</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
            <div>
              <h4 className="text-slate-300 font-medium mb-2">Launch Window Calculations</h4>
              <ul className="space-y-1">
                <li>NASA JPL Horizons ephemeris data</li>
                <li>Hohmann transfer orbit calculations</li>
                <li>Synodic period-based window timing</li>
                <li>C3 energy and arrival velocity modeling</li>
              </ul>
            </div>
            <div>
              <h4 className="text-slate-300 font-medium mb-2">Mission Statistics</h4>
              <ul className="space-y-1">
                <li>Historical mission success rates</li>
                <li>Delta-V requirements from orbital mechanics</li>
                <li>Transfer type optimization data</li>
                <li>Gravity assist trajectory analysis</li>
              </ul>
            </div>
          </div>
          <p className="text-slate-400 text-xs mt-4">
            Launch windows are calculated based on orbital mechanics and represent optimal transfer opportunities.
            Actual mission planning requires detailed trajectory analysis and spacecraft-specific parameters.
          </p>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page (with Suspense boundary)
// ────────────────────────────────────────

export default function LaunchWindowsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900">
          <div className="container mx-auto px-4">
            <PageHeader
              title="Launch Windows"
              subtitle="Optimal launch windows and mission planning for planetary destinations"
              breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Launch Windows' }]}
            />
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          </div>
        </div>
      }
    >
      <LaunchWindowsContent />
    </Suspense>
  );
}
