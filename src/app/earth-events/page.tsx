import { fetchEONETEvents, EONETEvent } from '@/lib/eonet-fetcher';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  wildfires:      { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
  volcanoes:      { bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/30' },
  'severe storms': { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  'sea and lake ice': { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  floods:         { bg: 'bg-blue-500/15',   text: 'text-blue-400',   border: 'border-blue-500/30' },
  earthquakes:    { bg: 'bg-amber-500/15',  text: 'text-amber-400',  border: 'border-amber-500/30' },
  drought:        { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  landslides:     { bg: 'bg-stone-500/15',  text: 'text-stone-400',  border: 'border-stone-500/30' },
};

const CATEGORY_ICONS: Record<string, string> = {
  wildfires: '🔥',
  volcanoes: '🌋',
  'severe storms': '🌀',
  'sea and lake ice': '🧊',
  floods: '🌊',
  earthquakes: '🫨',
  drought: '☀️',
  landslides: '⛰️',
};

function getCategoryStyle(category: string) {
  const key = category.toLowerCase();
  return CATEGORY_COLORS[key] ?? { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30' };
}

function getCategoryIcon(category: string) {
  const key = category.toLowerCase();
  return CATEGORY_ICONS[key] ?? '🌍';
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function formatCoordinates(coords: number[]): string {
  if (!coords || coords.length < 2) return 'Unknown';
  const [lon, lat] = coords;
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}° ${latDir}, ${Math.abs(lon).toFixed(2)}° ${lonDir}`;
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="card-elevated p-5 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}

function EventCard({ event }: { event: EONETEvent }) {
  const style = getCategoryStyle(event.category);
  const icon = getCategoryIcon(event.category);

  return (
    <a
      href={event.link}
      target="_blank"
      rel="noopener noreferrer"
      className="card p-5 hover:border-white/15 transition-all duration-200 group block"
    >
      {/* Category badge + icon */}
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
          <span>{icon}</span>
          {event.category}
        </span>
        {event.magnitudeValue !== null && (
          <span className="text-xs text-slate-500">
            {event.magnitudeValue} {event.magnitudeUnit}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-white group-hover:text-slate-300 transition-colors mb-2 line-clamp-2">
        {event.title}
      </h3>

      {/* Description */}
      {event.description && (
        <p className="text-xs text-slate-400 line-clamp-2 mb-3">{event.description}</p>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-auto pt-2 border-t border-white/5">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDate(event.date)}
        </span>
        {event.geometry && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {formatCoordinates(event.geometry.coordinates)}
          </span>
        )}
      </div>
    </a>
  );
}

// ---------------------------------------------------------------------------
// Page (Server Component)
// ---------------------------------------------------------------------------

export default async function EarthEventsPage() {
  let data;
  let error: string | null = null;

  try {
    data = await fetchEONETEvents();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch EONET events';
  }

  const events = data?.events ?? [];
  const categories = data?.categories ?? [];
  const total = data?.total ?? 0;

  // Compute category counts for stats
  const categoryCounts: Record<string, number> = {};
  for (const e of events) {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
  }

  // Top 3 categories for stat cards
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🌍</span>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Earth Events from Space
            </h1>
          </div>
          <p className="text-slate-400 text-sm max-w-2xl">
            Active natural events tracked by NASA&apos;s Earth Observatory Natural Event Tracker (EONET).
            Wildfires, volcanic eruptions, severe storms, and other events visible from space.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Active Events" value={total} icon="📡" />
          {topCategories.map(([cat, count]) => (
            <StatCard
              key={cat}
              label={cat}
              value={count}
              icon={getCategoryIcon(cat)}
            />
          ))}
          {topCategories.length < 3 && (
            <StatCard label="Categories" value={categories.length} icon="📂" />
          )}
        </div>

        {/* Category filter pills */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map(cat => {
              const style = getCategoryStyle(cat);
              return (
                <span
                  key={cat}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}
                >
                  <span>{getCategoryIcon(cat)}</span>
                  {cat}
                  <span className="ml-1 opacity-60">({categoryCounts[cat]})</span>
                </span>
              );
            })}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Events Grid */}
        {events.length === 0 && !error ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-4">🌎</div>
            <h3 className="text-lg font-semibold text-white mb-2">No Active Events</h3>
            <p className="text-slate-400 text-sm">
              NASA EONET is not currently reporting any open natural events. Check back later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}

        {/* Data source attribution */}
        <div className="mt-12 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-slate-500">
            Data sourced from{' '}
            <a
              href="https://eonet.gsfc.nasa.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white underline underline-offset-2 transition-colors"
            >
              NASA EONET v3 API
            </a>
            . Updated every 30 minutes.
          </p>
        </div>
      </div>
    </div>
  );
}
