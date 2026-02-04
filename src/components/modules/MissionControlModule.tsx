'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SpaceEvent, EVENT_TYPE_INFO } from '@/types';

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateCountdown(targetDate: Date): CountdownTime {
  const now = new Date().getTime();
  const target = new Date(targetDate).getTime();
  const difference = target - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((difference % (1000 * 60)) / 1000),
  };
}

function CountdownDisplay({ targetDate }: { targetDate: Date }) {
  const [countdown, setCountdown] = useState<CountdownTime>(
    calculateCountdown(targetDate)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(calculateCountdown(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex gap-2 text-center">
      <div className="bg-space-700/80 rounded-lg px-3 py-2 min-w-[60px]">
        <div className="text-2xl font-bold text-white font-mono">
          {String(countdown.days).padStart(2, '0')}
        </div>
        <div className="text-xs text-star-300 uppercase">Days</div>
      </div>
      <div className="bg-space-700/80 rounded-lg px-3 py-2 min-w-[60px]">
        <div className="text-2xl font-bold text-white font-mono">
          {String(countdown.hours).padStart(2, '0')}
        </div>
        <div className="text-xs text-star-300 uppercase">Hours</div>
      </div>
      <div className="bg-space-700/80 rounded-lg px-3 py-2 min-w-[60px]">
        <div className="text-2xl font-bold text-white font-mono">
          {String(countdown.minutes).padStart(2, '0')}
        </div>
        <div className="text-xs text-star-300 uppercase">Min</div>
      </div>
      <div className="bg-space-700/80 rounded-lg px-3 py-2 min-w-[60px]">
        <div className="text-2xl font-bold text-rocket-400 font-mono animate-pulse">
          {String(countdown.seconds).padStart(2, '0')}
        </div>
        <div className="text-xs text-star-300 uppercase">Sec</div>
      </div>
    </div>
  );
}

function EventCard({ event, isPrimary = false }: { event: SpaceEvent; isPrimary?: boolean }) {
  const typeInfo = EVENT_TYPE_INFO[event.type] || EVENT_TYPE_INFO.launch;
  const launchDate = event.launchDate ? new Date(event.launchDate) : null;

  if (isPrimary && launchDate) {
    return (
      <div className="bg-gradient-to-br from-space-700/50 to-nebula-500/20 rounded-xl p-6 border border-nebula-500/30">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`${typeInfo.color} text-white text-xs font-semibold px-2 py-1 rounded`}>
              {typeInfo.icon} {typeInfo.label}
            </span>
            <span className="text-green-400 text-xs font-semibold px-2 py-1 bg-green-500/20 rounded">
              NEXT UP
            </span>
          </div>
        </div>
        <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{event.name}</h3>
        {event.agency && (
          <p className="text-star-300 text-sm mb-4">{event.agency}</p>
        )}
        <div className="mb-4">
          <CountdownDisplay targetDate={launchDate} />
        </div>
        <div className="flex items-center gap-4 text-sm text-star-300">
          {event.location && (
            <span className="flex items-center gap-1">
              <span>📍</span> {event.location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <span>📅</span> {launchDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-space-700/30 rounded-lg p-4 border border-space-600/50 hover:border-nebula-500/30 transition-colors">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{typeInfo.icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white text-sm line-clamp-1">{event.name}</h4>
          {event.agency && (
            <p className="text-star-300 text-xs mt-0.5">{event.agency}</p>
          )}
          {launchDate && (
            <p className="text-nebula-300 text-xs mt-1">
              {launchDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MissionControlModule() {
  const [events, setEvents] = useState<SpaceEvent[]>([]);
  const [nextEvent, setNextEvent] = useState<SpaceEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Fetch events in next 48 hours
        const res = await fetch('/api/events?hours=48&limit=5');
        const data = await res.json();
        const upcoming = data.events || [];
        setEvents(upcoming);

        // If no events in 48 hours, fetch the next known event
        if (upcoming.length === 0) {
          const nextRes = await fetch('/api/events?limit=1');
          const nextData = await nextRes.json();
          setNextEvent(nextData.events?.[0] || null);
        } else {
          setNextEvent(null);
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    // Refresh every 5 minutes
    const interval = setInterval(fetchEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="card p-6 glow-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <span>🎯</span> Mission Control
          </h2>
        </div>
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: '3px' }} />
        </div>
      </div>
    );
  }

  const firstEvent = events[0];
  const otherEvents = events.slice(1, 4);

  return (
    <Link href="/mission-control" className="block">
      <div className="card p-6 glow-border hover:border-nebula-400/50 transition-all cursor-pointer group">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <span>🎯</span> Mission Control
          </h2>
          <span className="text-star-300 text-sm group-hover:text-nebula-300 transition-colors flex items-center gap-1">
            View All <span>→</span>
          </span>
        </div>

        {events.length === 0 ? (
          <div>
            <div className="text-center py-4">
              <span className="text-4xl block mb-2">🔭</span>
              <p className="text-star-300">No events scheduled in the next 48 hours</p>
            </div>
            {nextEvent && (
              <div className="mt-4">
                <p className="text-star-300 text-xs uppercase tracking-wider mb-2">Next Known Event</p>
                <EventCard event={nextEvent} isPrimary />
              </div>
            )}
            {!nextEvent && (
              <p className="text-star-300/70 text-sm text-center mt-2">Click to view all upcoming missions</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {firstEvent && <EventCard event={firstEvent} isPrimary />}

            {otherEvents.length > 0 && (
              <div className="space-y-2">
                <p className="text-star-300 text-xs uppercase tracking-wider">Also Coming Up</p>
                <div className="space-y-2">
                  {otherEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-space-600/50 text-center">
          <span className="text-nebula-300 text-sm group-hover:text-nebula-200 transition-colors">
            Click to explore 5-year mission timeline →
          </span>
        </div>
      </div>
    </Link>
  );
}
