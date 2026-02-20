'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import {
  SPACE_EVENTS,
  EVENT_TYPES,
  MONTHS,
  generateICS,
  generateMultiEventICS,
  getEventTypeColor,
  getEventTypeLabel,
  type SpaceEvent,
} from '@/lib/space-events-data';

// ── Helpers ──

function formatDateRange(start: string, end?: string): string {
  const s = new Date(start + 'T00:00:00');
  const sMonth = s.toLocaleString('en-US', { month: 'short' });
  const sDay = s.getDate();

  if (!end || end === start) {
    return `${sMonth} ${sDay}, ${s.getFullYear()}`;
  }

  const e = new Date(end + 'T00:00:00');
  const eMonth = e.toLocaleString('en-US', { month: 'short' });
  const eDay = e.getDate();

  if (sMonth === eMonth) {
    return `${sMonth} ${sDay}-${eDay}, ${s.getFullYear()}`;
  }
  return `${sMonth} ${sDay} - ${eMonth} ${eDay}, ${s.getFullYear()}`;
}

function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Sub-components ──

function EventTypeBadge({ type }: { type: SpaceEvent['type'] }) {
  const color = getEventTypeColor(type);
  const label = getEventTypeLabel(type);
  return (
    <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full text-white ${color}`}>
      {label}
    </span>
  );
}

function HighlightedEvents({ events }: { events: SpaceEvent[] }) {
  if (events.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mb-8"
    >
      <h2 className="text-lg font-semibold text-white mb-4">Upcoming Major Events</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.slice(0, 5).map((event, i) => {
          const daysUntil = getDaysUntil(event.startDate);
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="card p-5 border-l-4 border-l-cyan-500 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/5 rounded-bl-full" />
              <div className="flex items-start justify-between mb-2">
                <EventTypeBadge type={event.type} />
                {daysUntil > 0 && (
                  <span className="text-[10px] text-cyan-400 font-medium">
                    in {daysUntil} days
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{event.name}</h3>
              <div className="text-xs text-slate-400 mb-1">{formatDateRange(event.startDate, event.endDate)}</div>
              <div className="text-xs text-slate-500 mb-3">{event.location}</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadICS(generateICS(event), `${event.id}.ics`)}
                  className="text-[10px] px-2 py-1 rounded bg-slate-800 text-cyan-400 border border-slate-700 hover:border-cyan-500/30 transition-all"
                >
                  + Add to Calendar
                </button>
                {event.website && (
                  <a
                    href={event.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 transition-all"
                  >
                    Website
                  </a>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function EventListCard({ event }: { event: SpaceEvent }) {
  const daysUntil = getDaysUntil(event.startDate);
  const isPast = daysUntil < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card p-4 transition-all hover:border-slate-600/50 ${isPast ? 'opacity-60' : ''}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Date box */}
        <div className="flex-shrink-0 w-16 text-center">
          <div className="text-xs text-slate-500 uppercase">
            {new Date(event.startDate + 'T00:00:00').toLocaleString('en-US', { month: 'short' })}
          </div>
          <div className="text-2xl font-bold text-white">
            {new Date(event.startDate + 'T00:00:00').getDate()}
          </div>
          <div className="text-[10px] text-slate-500">
            {new Date(event.startDate + 'T00:00:00').getFullYear()}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-semibold text-white">{event.name}</h3>
            {event.highlight && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                Featured
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <EventTypeBadge type={event.type} />
            <span className="text-xs text-slate-400">{formatDateRange(event.startDate, event.endDate)}</span>
            <span className="text-xs text-slate-500">{event.location}</span>
            {event.virtual && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Virtual
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 line-clamp-2 mb-2 leading-relaxed">{event.description}</p>

          <div className="flex items-center gap-3 flex-wrap">
            {event.attendeeCount && (
              <span className="text-[10px] text-slate-500">
                {event.attendeeCount.toLocaleString()} attendees
              </span>
            )}
            {event.cost && (
              <span className="text-[10px] text-slate-500">{event.cost}</span>
            )}
            <span className="text-[10px] text-slate-500">{event.organizer}</span>
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {event.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/50">
                {tag}
              </span>
            ))}
            {event.tags.length > 4 && (
              <span className="text-[10px] text-slate-500">+{event.tags.length - 4}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex sm:flex-col items-center sm:items-end gap-2 flex-shrink-0">
          <button
            onClick={() => downloadICS(generateICS(event), `${event.id}.ics`)}
            className="text-[10px] px-2 py-1 rounded bg-slate-800 text-cyan-400 border border-slate-700 hover:border-cyan-500/30 transition-all whitespace-nowrap"
          >
            + Calendar
          </button>
          {event.website && (
            <a
              href={event.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 transition-all whitespace-nowrap"
            >
              Website
            </a>
          )}
          {!isPast && daysUntil >= 0 && (
            <span className="text-[10px] text-cyan-400 font-medium whitespace-nowrap">
              {daysUntil === 0 ? 'Today' : `${daysUntil}d`}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CalendarMonth({
  year,
  month,
  events,
  onEventClick,
}: {
  year: number;
  month: number;
  events: SpaceEvent[];
  onEventClick: (event: SpaceEvent) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const monthEvents = events.filter((e) => {
    const eDate = new Date(e.startDate + 'T00:00:00');
    return eDate.getFullYear() === year && eDate.getMonth() === month;
  });

  const getEventsForDay = (day: number) => {
    return monthEvents.filter((e) => {
      const startDay = new Date(e.startDate + 'T00:00:00').getDate();
      const endDay = e.endDate
        ? new Date(e.endDate + 'T00:00:00').getDate()
        : startDay;
      const startMonth = new Date(e.startDate + 'T00:00:00').getMonth();
      const endMonth = e.endDate
        ? new Date(e.endDate + 'T00:00:00').getMonth()
        : startMonth;

      if (startMonth === month && endMonth === month) {
        return day >= startDay && day <= endDay;
      }
      if (startMonth === month) return day >= startDay;
      if (endMonth === month) return day <= endDay;
      return false;
    });
  };

  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-white mb-3">
        {MONTHS[month]} {year}
      </h3>
      <div className="grid grid-cols-7 gap-px">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-[10px] text-slate-500 text-center py-1 font-medium">
            {d}
          </div>
        ))}
        {days.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }
          const dayEvents = getEventsForDay(day);
          const hasEvents = dayEvents.length > 0;
          const hasHighlight = dayEvents.some((e) => e.highlight);

          return (
            <div
              key={day}
              className={`aspect-square flex flex-col items-center justify-start p-0.5 rounded-md text-[10px] relative cursor-default transition-all ${
                isToday(day)
                  ? 'bg-cyan-500/20 ring-1 ring-cyan-500/50'
                  : hasEvents
                    ? 'bg-slate-800/50 hover:bg-slate-700/50'
                    : ''
              }`}
              title={dayEvents.map((e) => e.name).join(', ')}
            >
              <span className={`${isToday(day) ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>
                {day}
              </span>
              {hasEvents && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                  {dayEvents.slice(0, 3).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => onEventClick(e)}
                      className={`w-1.5 h-1.5 rounded-full ${hasHighlight && e.highlight ? 'bg-yellow-400' : getEventTypeColor(e.type)} hover:scale-150 transition-transform`}
                      title={e.name}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[8px] text-slate-500">+{dayEvents.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {monthEvents.length > 0 && (
        <div className="mt-3 space-y-1">
          {monthEvents
            .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)
            .slice(0, 5)
            .map((e) => (
            <button
              key={e.id}
              onClick={() => onEventClick(e)}
              className="w-full text-left flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-800/50 transition-colors"
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getEventTypeColor(e.type)}`} />
              <span className="text-[10px] text-slate-300 truncate">{e.name}</span>
              <span className="text-[10px] text-slate-500 flex-shrink-0 ml-auto">
                {new Date(e.startDate + 'T00:00:00').getDate()}
                {e.endDate && e.endDate !== e.startDate
                  ? `-${new Date(e.endDate + 'T00:00:00').getDate()}`
                  : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EventDetailModal({
  event,
  onClose,
}: {
  event: SpaceEvent;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="card p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <EventTypeBadge type={event.type} />
              {event.highlight && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                  Featured
                </span>
              )}
              {event.virtual && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Virtual
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white">{event.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-slate-300">{formatDateRange(event.startDate, event.endDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-slate-300">
              {event.location}
              {event.venue && ` - ${event.venue}`}
            </span>
          </div>
          {event.attendeeCount && (
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-slate-300">{event.attendeeCount.toLocaleString()} attendees</span>
            </div>
          )}
          {event.cost && (
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-slate-300">{event.cost}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-slate-300">{event.organizer}</span>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-4">{event.description}</p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {event.tags.map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/50">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-slate-700/50">
          <button
            onClick={() => downloadICS(generateICS(event), `${event.id}.ics`)}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Add to Calendar
          </button>
          {event.website && (
            <a
              href={event.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Visit Website
            </a>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ──

type ViewMode = 'list' | 'calendar';

export default function SpaceEventsPage() {
  const [view, setView] = useState<ViewMode>('list');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all'); // all, virtual, in-person
  const [costFilter, setCostFilter] = useState<string>('all'); // all, free, paid
  const [selectedEvent, setSelectedEvent] = useState<SpaceEvent | null>(null);

  const filteredEvents = useMemo(() => {
    let events = [...SPACE_EVENTS];

    if (typeFilter !== 'all') {
      events = events.filter((e) => e.type === typeFilter);
    }

    if (monthFilter !== 'all') {
      const m = parseInt(monthFilter, 10);
      events = events.filter((e) => {
        const eMonth = new Date(e.startDate + 'T00:00:00').getMonth() + 1;
        return eMonth === m;
      });
    }

    if (formatFilter === 'virtual') {
      events = events.filter((e) => e.virtual);
    } else if (formatFilter === 'in-person') {
      events = events.filter((e) => !e.virtual);
    }

    if (costFilter === 'free') {
      events = events.filter((e) => e.cost?.toLowerCase() === 'free');
    } else if (costFilter === 'paid') {
      events = events.filter((e) => e.cost && e.cost.toLowerCase() !== 'free');
    }

    events.sort((a, b) => a.startDate.localeCompare(b.startDate));
    return events;
  }, [typeFilter, monthFilter, formatFilter, costFilter]);

  const upcomingHighlights = useMemo(() => {
    const now = new Date().toISOString().split('T')[0];
    return SPACE_EVENTS
      .filter((e) => e.highlight && e.startDate >= now)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, []);

  const upcomingCount = useMemo(() => {
    const now = new Date().toISOString().split('T')[0];
    return SPACE_EVENTS.filter((e) => e.startDate >= now).length;
  }, []);

  const handleExportFiltered = useCallback(() => {
    const ics = generateMultiEventICS(filteredEvents);
    downloadICS(ics, 'spacenexus-events.ics');
  }, [filteredEvents]);

  // All tags for quick filter reference
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    SPACE_EVENTS.forEach((e) => e.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, []);

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[1600px] mx-auto">
      <BreadcrumbSchema items={[
        { name: 'Home', href: '/' },
        { name: 'Space Events' },
      ]} />
      <AnimatedPageHeader
        title="Space Industry Events & Conferences"
        subtitle={`${upcomingCount} upcoming events across the global space industry`}
        icon={'\u{1F4C5}'}
        accentColor="cyan"
      />

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
      >
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-cyan-400">{SPACE_EVENTS.length}</div>
          <div className="text-xs text-slate-400 mt-1">Total Events</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{upcomingCount}</div>
          <div className="text-xs text-slate-400 mt-1">Upcoming</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">
            {SPACE_EVENTS.filter((e) => e.virtual).length}
          </div>
          <div className="text-xs text-slate-400 mt-1">Virtual Events</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">
            {SPACE_EVENTS.filter((e) => e.highlight).length}
          </div>
          <div className="text-xs text-slate-400 mt-1">Major Events</div>
        </div>
      </motion.div>

      {/* Highlighted upcoming events */}
      <HighlightedEvents events={upcomingHighlights} />

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card p-4 mb-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View toggle */}
            <div className="flex rounded-lg border border-slate-700 overflow-hidden">
              <button
                onClick={() => setView('list')}
                className={`text-xs px-3 py-1.5 transition-all ${
                  view === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`text-xs px-3 py-1.5 transition-all ${
                  view === 'calendar' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                Calendar
              </button>
            </div>

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 focus:border-cyan-500/50 outline-none"
            >
              <option value="all">All Types</option>
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {/* Month filter */}
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 focus:border-cyan-500/50 outline-none"
            >
              <option value="all">All Months</option>
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>

            {/* Format filter */}
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 focus:border-cyan-500/50 outline-none"
            >
              <option value="all">All Formats</option>
              <option value="in-person">In-Person</option>
              <option value="virtual">Virtual / Hybrid</option>
            </select>

            {/* Cost filter */}
            <select
              value={costFilter}
              onChange={(e) => setCostFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 focus:border-cyan-500/50 outline-none"
            >
              <option value="all">Any Cost</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Right: Export */}
          <button
            onClick={handleExportFiltered}
            className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg bg-slate-800 text-cyan-400 border border-slate-700 hover:border-cyan-500/30 transition-all flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export {filteredEvents.length} events (.ics)
          </button>
        </div>

        <div className="text-[10px] text-slate-500 mt-2">
          Showing {filteredEvents.length} of {SPACE_EVENTS.length} events
        </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {filteredEvents.length === 0 ? (
              <div className="card p-10 text-center">
                <div className="text-slate-500 text-sm">No events match the selected filters.</div>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <EventListCard key={event.id} event={event} />
              ))
            )}
          </motion.div>
        ) : (
          <motion.div
            key="calendar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <CalendarMonth
                key={i}
                year={2026}
                month={i}
                events={filteredEvents}
                onEventClick={setSelectedEvent}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event type legend (calendar view) */}
      {view === 'calendar' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="card p-4 mt-6"
        >
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs text-slate-500 font-medium">Legend:</span>
            {EVENT_TYPES.map((t) => (
              <div key={t.value} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                <span className="text-[10px] text-slate-400">{t.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span className="text-[10px] text-slate-400">Featured</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick tag reference */}
      <div className="card p-4 mt-6 border-slate-700/30">
        <div className="text-xs text-slate-500 font-medium mb-2">Popular Tags</div>
        <div className="flex flex-wrap gap-1.5">
          {allTags.slice(0, 25).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/50 text-slate-400 border border-slate-700/30"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Event detail modal */}
      <AnimatePresence>
        {selectedEvent && (
          <EventDetailModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
