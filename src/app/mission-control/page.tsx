'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { SpaceEvent, EVENT_TYPE_INFO, SpaceEventType } from '@/types';
import PageHeader from '@/components/ui/PageHeader';
import ExportButton from '@/components/ui/ExportButton';

const EVENT_TYPES: { value: SpaceEventType | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All Events', icon: '🌌' },
  { value: 'launch', label: 'Launches', icon: '🚀' },
  { value: 'crewed_mission', label: 'Crewed', icon: '👨‍🚀' },
  { value: 'moon_mission', label: 'Moon', icon: '🌙' },
  { value: 'mars_mission', label: 'Mars', icon: '🔴' },
  { value: 'space_station', label: 'Stations', icon: '🛰️' },
  { value: 'satellite', label: 'Satellites', icon: '📡' },
];

interface GroupedEvents {
  [year: string]: {
    [month: string]: SpaceEvent[];
  };
}

// Countdown timer component for imminent launches
function CountdownCard({ event }: { event: SpaceEvent }) {
  const [countdown, setCountdown] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const typeInfo = EVENT_TYPE_INFO[event.type] || EVENT_TYPE_INFO.launch;
  const launchDate = event.launchDate ? new Date(event.launchDate) : null;

  useEffect(() => {
    if (!launchDate) return;

    const updateCountdown = () => {
      const now = new Date();
      const diff = launchDate.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setCountdown('LAUNCHED');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      } else {
        // Under 24 hours - show HH:MM:SS format
        const pad = (n: number) => n.toString().padStart(2, '0');
        setCountdown(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [launchDate]);

  if (!launchDate) return null;

  return (
    <div className="relative group">
      {/* Glow effect background */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 via-cyan-500 to-green-500 rounded-xl opacity-75 blur group-hover:opacity-100 transition duration-300 animate-pulse" />

      <div className="relative card overflow-hidden bg-slate-900 border-0">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-cyan-500/10" />

        <div className="relative flex">
          {/* Image */}
          <div className="relative w-36 h-40 flex-shrink-0 bg-slate-800">
            {event.imageUrl ? (
              <Image
                src={event.imageUrl}
                alt={event.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-space-700 to-cyan-500/20">
                <span className="text-5xl">{typeInfo.icon}</span>
              </div>
            )}
            <div className="absolute top-2 left-2 bg-green-500 text-slate-900 text-xs font-bold px-2 py-1 rounded-full animate-pulse flex items-center gap-1">
              <span className="w-2 h-2 bg-slate-900 rounded-full animate-ping" />
              LIVE
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`${typeInfo.color} text-slate-900 text-xs font-semibold px-2 py-0.5 rounded`}>
                    {typeInfo.icon} {typeInfo.label}
                  </span>
                  {event.country && (
                    <span className="text-slate-400 text-xs">{event.country}</span>
                  )}
                </div>
                <h3 className="font-bold text-white text-lg line-clamp-2">
                  {event.name}
                </h3>
              </div>
            </div>

            {event.agency && (
              <p className="text-cyan-400 text-sm font-medium">{event.agency}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
              {event.location && (
                <span className="flex items-center gap-1">
                  <span>📍</span> {event.location}
                </span>
              )}
              {event.rocket && (
                <span className="flex items-center gap-1 text-green-400">
                  <span>🚀</span> {event.rocket}
                </span>
              )}
            </div>

            {/* Countdown Display */}
            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 uppercase tracking-wider">T-Minus</span>
                <span className={`font-mono text-xl font-bold ${isExpired ? 'text-yellow-400' : 'text-green-400'}`}>
                  {countdown}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {launchDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                at{' '}
                {launchDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZoneName: 'short',
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Upcoming in 48 Hours Section
function UpcomingIn48Hours({ events }: { events: SpaceEvent[] }) {
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const in48Hours = new Date(Date.now() + 48 * 60 * 60 * 1000);

    return events
      .filter(e => {
        if (!e.launchDate) return false;
        const launchDate = new Date(e.launchDate);
        return launchDate > now && launchDate < in48Hours;
      })
      .sort((a, b) => new Date(a.launchDate!).getTime() - new Date(b.launchDate!).getTime());
  }, [events]);

  if (upcomingEvents.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">⏰</span>
          Upcoming in 48 Hours
        </h2>
        <div className="card p-8 text-center bg-gradient-to-br from-slate-50 to-slate-100 border-dashed border-2 border-slate-200">
          <span className="text-4xl block mb-3">🌙</span>
          <p className="text-slate-500 font-medium">No launches scheduled in the next 48 hours</p>
          <p className="text-slate-400 text-sm mt-1">Check back soon for imminent missions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
        <span className="text-2xl animate-pulse">⏰</span>
        Upcoming in 48 Hours
        <span className="ml-2 bg-green-500 text-slate-900 text-xs font-bold px-2 py-1 rounded-full">
          {upcomingEvents.length} {upcomingEvents.length === 1 ? 'launch' : 'launches'}
        </span>
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {upcomingEvents.map((event) => (
          <CountdownCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: SpaceEvent }) {
  const typeInfo = EVENT_TYPE_INFO[event.type] || EVENT_TYPE_INFO.launch;
  const launchDate = event.launchDate ? new Date(event.launchDate) : null;
  const isPast = launchDate && launchDate < new Date();
  const isWithin48Hours = launchDate &&
    launchDate > new Date() &&
    launchDate < new Date(Date.now() + 48 * 60 * 60 * 1000);

  return (
    <div className={`card overflow-hidden ${isWithin48Hours ? 'border-green-500/50 glow-border' : ''}`}>
      <div className="flex">
        {/* Image */}
        <div className="relative w-32 h-32 flex-shrink-0 bg-slate-100">
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt={event.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-space-700 to-nebula-500/20">
              <span className="text-4xl">{typeInfo.icon}</span>
            </div>
          )}
          {isWithin48Hours && (
            <div className="absolute top-2 left-2 bg-green-500 text-slate-900 text-xs font-bold px-2 py-0.5 rounded animate-pulse">
              SOON
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`${typeInfo.color} text-slate-900 text-xs font-semibold px-2 py-0.5 rounded`}>
                  {typeInfo.icon} {typeInfo.label}
                </span>
                {event.country && (
                  <span className="text-slate-500 text-xs">{event.country}</span>
                )}
              </div>
              <h3 className={`font-semibold text-slate-900 line-clamp-2 ${isPast ? 'opacity-60' : ''}`}>
                {event.name}
              </h3>
            </div>
          </div>

          {event.agency && (
            <p className="text-slate-500 text-sm mt-1">{event.agency}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
            {launchDate && (
              <span className={`flex items-center gap-1 ${isPast ? 'line-through opacity-60' : ''}`}>
                <span>📅</span>
                {launchDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                {' '}
                {launchDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1">
                <span>📍</span> {event.location}
              </span>
            )}
          </div>

          {event.rocket && (
            <p className="text-nebula-300 text-xs mt-2">
              <span>🚀</span> {event.rocket}
            </p>
          )}

          {event.description && (
            <p className="text-slate-500/70 text-xs mt-2 line-clamp-2">{event.description}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-2">
            {event.type === 'launch' && (
              <Link
                href="/resource-exchange"
                className="text-xs text-rocket-400 hover:text-rocket-300 bg-rocket-500/10 px-2 py-1 rounded transition-colors"
              >
                Launch providers →
              </Link>
            )}
            {event.type === 'satellite' && (
              <Link
                href="/orbital-slots?tab=operators"
                className="text-xs text-nebula-400 hover:text-nebula-300 bg-nebula-500/10 px-2 py-1 rounded transition-colors"
              >
                Orbital slots →
              </Link>
            )}
            {event.type === 'moon_mission' && (
              <Link
                href="/solar-exploration?body=moon"
                className="text-xs text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 px-2 py-1 rounded transition-colors"
              >
                Moon exploration →
              </Link>
            )}
            {event.type === 'mars_mission' && (
              <Link
                href="/solar-exploration?body=mars"
                className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 px-2 py-1 rounded transition-colors"
              >
                Mars exploration →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MissionControlContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [events, setEvents] = useState<SpaceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<SpaceEventType | 'all'>(
    (searchParams.get('type') as SpaceEventType | 'all') || 'all'
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedType && selectedType !== 'all') params.set('type', selectedType);
    if (searchQuery) params.set('search', searchQuery);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [selectedType, searchQuery, router, pathname]);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        // Fetch events for next 5 years
        const startDate = new Date().toISOString();
        const endDate = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString();

        const params = new URLSearchParams({
          startDate,
          endDate,
          limit: '500',
        });

        if (selectedType !== 'all') {
          params.set('type', selectedType);
        }

        const res = await fetch(`/api/events?${params}`);
        const data = await res.json();
        setEvents(data.events || []);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [selectedType]);

  // Filter and group events
  const groupedEvents = useMemo(() => {
    let filtered = events;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = events.filter(
        (e) =>
          e.name.toLowerCase().includes(query) ||
          e.agency?.toLowerCase().includes(query) ||
          e.location?.toLowerCase().includes(query) ||
          e.rocket?.toLowerCase().includes(query)
      );
    }

    const grouped: GroupedEvents = {};

    filtered.forEach((event) => {
      if (!event.launchDate) return;
      const date = new Date(event.launchDate);
      const year = date.getFullYear().toString();
      const month = date.toLocaleDateString('en-US', { month: 'long' });

      if (!grouped[year]) grouped[year] = {};
      if (!grouped[year][month]) grouped[year][month] = [];
      grouped[year][month].push(event);
    });

    return grouped;
  }, [events, searchQuery]);

  const years = Object.keys(groupedEvents).sort();

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <PageHeader title="Mission Control" subtitle="Explore all upcoming space missions, launches, and events for the next 5 years" breadcrumbs={[{label: 'Home', href: '/'}, {label: 'Mission Control'}]} />

        {/* Filters */}
        <div className="card p-4 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search missions, agencies, rockets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-1 text-sm ${
                    selectedType === type.value
                      ? 'bg-slate-100 text-slate-900 border-slate-200 shadow-glow-sm'
                      : 'bg-transparent text-slate-500 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span>{type.icon}</span>
                  <span className="hidden sm:inline">{type.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center">
              <ExportButton
                data={events}
                filename="space-events"
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'type', label: 'Type' },
                  { key: 'launchDate', label: 'Date' },
                  { key: 'location', label: 'Location' },
                  { key: 'description', label: 'Description' },
                  { key: 'agency', label: 'Agency' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card-elevated p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-slate-900">{events.length}</div>
            <div className="text-slate-500 text-xs uppercase tracking-widest font-medium">Total Events</div>
          </div>
          <div className="card-elevated p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-green-400">
              {events.filter(e => {
                const d = e.launchDate ? new Date(e.launchDate) : null;
                return d && d > new Date() && d < new Date(Date.now() + 48 * 60 * 60 * 1000);
              }).length}
            </div>
            <div className="text-slate-500 text-xs uppercase tracking-widest font-medium">Next 48 Hours</div>
          </div>
          <div className="card-elevated p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-nebula-300">
              {events.filter(e => e.type === 'crewed_mission').length}
            </div>
            <div className="text-slate-500 text-xs uppercase tracking-widest font-medium">Crewed Missions</div>
          </div>
          <div className="card-elevated p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-rocket-400">
              {new Set(events.map(e => e.agency).filter(Boolean)).size}
            </div>
            <div className="text-slate-500 text-xs uppercase tracking-widest font-medium">Agencies</div>
          </div>
        </div>

        {/* Upcoming in 48 Hours Section */}
        {!loading && <UpcomingIn48Hours events={events} />}

        {/* Timeline */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: '3px' }} />
          </div>
        ) : years.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl block mb-4">🔭</span>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">No Events Found</h2>
            <p className="text-slate-500">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'No upcoming events available. Try fetching fresh data.'}
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {years.map((year) => (
              <div key={year}>
                <h2 className="text-2xl font-display font-bold text-slate-900 mb-6 flex items-center gap-3 sticky top-16 bg-white/95 backdrop-blur-sm py-3 z-10">
                  <span className="text-nebula-400">📅</span>
                  {year}
                  <span className="text-slate-500 text-sm font-normal">
                    ({Object.values(groupedEvents[year]).flat().length} events)
                  </span>
                </h2>

                <div className="space-y-8 pl-4 border-l-2 border-nebula-500/30">
                  {Object.entries(groupedEvents[year]).map(([month, monthEvents]) => (
                    <div key={`${year}-${month}`} className="relative">
                      {/* Month marker */}
                      <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-nebula-500 flex items-center justify-center">
                        <span className="text-slate-900 text-xs font-bold">
                          {month.substring(0, 3)}
                        </span>
                      </div>

                      <div className="ml-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">
                          {month}
                          <span className="text-slate-500 text-sm font-normal ml-2">
                            ({monthEvents.length} events)
                          </span>
                        </h3>

                        <div className="space-y-4">
                          {monthEvents.map((event) => (
                            <EventCard key={event.id} event={event} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Related Intelligence */}
        {!loading && events.length > 0 && (
          <div className="card p-6 mt-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span>🔗</span> Related Intelligence
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Link href="/solar-flares" className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group">
                <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-300">☀️ Solar Flares</div>
                <p className="text-xs text-slate-500 mt-1">Solar weather can delay launches</p>
              </Link>
              <Link href="/debris-monitor" className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group">
                <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-300">🛰️ Debris Monitor</div>
                <p className="text-xs text-slate-500 mt-1">Track orbital debris near missions</p>
              </Link>
              <Link href="/orbital-slots" className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group">
                <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-300">📡 Orbital Slots</div>
                <p className="text-xs text-slate-500 mt-1">Satellite registry and congestion</p>
              </Link>
              <Link href="/space-insurance" className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group">
                <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-300">🛡️ Space Insurance</div>
                <p className="text-xs text-slate-500 mt-1">Mission risk and coverage data</p>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MissionControlPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center py-20">
          <div
            className="w-12 h-12 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin"
            style={{ borderWidth: '3px' }}
          />
        </div>
      }
    >
      <MissionControlContent />
    </Suspense>
  );
}
