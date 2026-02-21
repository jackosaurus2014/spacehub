'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import {
  REGULATORY_DEADLINES,
  AGENCY_COLORS,
  TYPE_LABELS,
  PRIORITY_COLORS,
  getUpcomingCalendarDeadlines,
  getCalendarStats,
  type RegulatoryDeadline,
  type CalendarAgency,
  type DeadlineType,
  type DeadlinePriority,
} from '@/lib/regulatory-calendar-data';

// ============================================================================
// CONSTANTS
// ============================================================================

const ALL_AGENCIES: CalendarAgency[] = [
  'FCC', 'FAA', 'NASA', 'NOAA', 'DoD', 'BIS', 'ITU', 'Congress', 'International',
];

const ALL_TYPES: DeadlineType[] = [
  'filing', 'hearing', 'compliance', 'review', 'procurement', 'treaty',
];

const ALL_PRIORITIES: DeadlinePriority[] = ['high', 'medium', 'low'];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateRange(start: string, end?: string): string {
  if (!end) return formatDate(start);
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.getDate()}, ${e.getFullYear()}`;
  }
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function generateICS(deadline: RegulatoryDeadline): string {
  const startDate = deadline.date.replace(/-/g, '');
  const endDateStr = deadline.endDate
    ? deadline.endDate.replace(/-/g, '')
    : startDate;

  // Format description for ICS — escape commas, semicolons, newlines
  const desc = deadline.description
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SpaceNexus//Regulatory Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART;VALUE=DATE:${startDate}`,
    `DTEND;VALUE=DATE:${endDateStr}`,
    `SUMMARY:${deadline.title}`,
    `DESCRIPTION:${desc}`,
    `CATEGORIES:${deadline.agency}\\,${deadline.type}`,
    ...(deadline.url ? [`URL:${deadline.url}`] : []),
    `STATUS:CONFIRMED`,
    `UID:${deadline.id}@spacenexus.us`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

function downloadICS(deadline: RegulatoryDeadline) {
  const icsContent = generateICS(deadline);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${deadline.id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function isPast(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d < now;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatsBar() {
  const stats = getCalendarStats();
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Deadlines</p>
        <p className="text-2xl font-bold text-slate-100">{stats.total}</p>
      </div>
      <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Next 30 Days</p>
        <p className="text-2xl font-bold text-yellow-400">{stats.upcoming30Days}</p>
      </div>
      <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">High Priority (30d)</p>
        <p className="text-2xl font-bold text-red-400">{stats.highPriorityUpcoming}</p>
      </div>
      <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Agencies Tracked</p>
        <p className="text-2xl font-bold text-cyan-400">{Object.keys(stats.byAgency).length}</p>
      </div>
    </div>
  );
}

function UpcomingThisWeek() {
  const upcoming = getUpcomingCalendarDeadlines(7);
  if (upcoming.length === 0) return null;

  return (
    <div className="mb-8 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        Upcoming This Week
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {upcoming.slice(0, 6).map((deadline) => {
          const agencyColor = AGENCY_COLORS[deadline.agency];
          const priorityColor = PRIORITY_COLORS[deadline.priority];
          return (
            <div
              key={deadline.id}
              className={`bg-slate-800/60 rounded-lg p-3 border ${agencyColor.border} hover:bg-slate-800/80 transition-colors`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${agencyColor.bg} ${agencyColor.text}`}>
                  {deadline.agency}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${priorityColor.bg} ${priorityColor.text}`}>
                  {deadline.priority}
                </span>
              </div>
              <p className="text-sm text-slate-200 font-medium line-clamp-2 mb-1">{deadline.title}</p>
              <p className="text-xs text-slate-400">{formatDate(deadline.date)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DeadlineDetailPanel({
  deadline,
  onClose,
}: {
  deadline: RegulatoryDeadline;
  onClose: () => void;
}) {
  const agencyColor = AGENCY_COLORS[deadline.agency];
  const priorityColor = PRIORITY_COLORS[deadline.priority];
  const past = isPast(deadline.date);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700/50 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold px-2 py-1 rounded ${agencyColor.bg} ${agencyColor.text}`}>
                {deadline.agency}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-slate-700/60 text-slate-300">
                {TYPE_LABELS[deadline.type]}
              </span>
              <span className={`text-xs px-2 py-1 rounded border ${priorityColor.bg} ${priorityColor.text} ${priorityColor.border}`}>
                {deadline.priority.toUpperCase()}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1"
              aria-label="Close detail panel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-slate-100 mb-3">{deadline.title}</h3>

          {/* Date */}
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className={`text-sm ${past ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
              {formatDateRange(deadline.date, deadline.endDate)}
            </span>
            {past && <span className="text-xs text-slate-500 ml-1">(Past)</span>}
            {isToday(deadline.date) && (
              <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-semibold">TODAY</span>
            )}
          </div>

          {/* Description */}
          <div className="bg-slate-800/60 rounded-lg p-4 mb-4">
            <p className="text-sm text-slate-300 leading-relaxed">{deadline.description}</p>
          </div>

          {/* Related Policies */}
          {deadline.relatedPolicies && deadline.relatedPolicies.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Related Policies</h4>
              <div className="flex flex-wrap gap-2">
                {deadline.relatedPolicies.map((policy, i) => (
                  <span key={i} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                    {policy}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-700/50">
            <button
              onClick={() => downloadICS(deadline)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-nebula-600 hover:bg-nebula-500 text-white rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Add to Calendar
            </button>
            {deadline.url && (
              <a
                href={deadline.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Source
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MONTH VIEW
// ============================================================================

function MonthView({
  year,
  month,
  deadlines,
  onSelectDeadline,
}: {
  year: number;
  month: number;
  deadlines: RegulatoryDeadline[];
  onSelectDeadline: (d: RegulatoryDeadline) => void;
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Map day number -> deadlines
  const dayDeadlines = useMemo(() => {
    const map: Record<number, RegulatoryDeadline[]> = {};
    for (const d of deadlines) {
      const date = new Date(d.date + 'T00:00:00');
      if (date.getFullYear() === year && date.getMonth() === month) {
        const day = date.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(d);
      }
    }
    return map;
  }, [deadlines, year, month]);

  const selectedDayDeadlines = selectedDay ? dayDeadlines[selectedDay] || [] : [];

  // Build grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-slate-800/60">
          {DAY_NAMES.map((name) => (
            <div key={name} className="p-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {name}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-slate-700/20">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="h-24 md:h-28 bg-slate-900/40" />;
            }

            const dayItems = dayDeadlines[day] || [];
            const isSelected = selectedDay === day;
            const isTodayCell = isCurrentMonth && today.getDate() === day;

            return (
              <button
                key={`day-${day}`}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`h-24 md:h-28 p-1.5 md:p-2 text-left transition-colors relative group ${
                  isSelected
                    ? 'bg-slate-700/60 ring-1 ring-nebula-500/60'
                    : 'bg-slate-900/60 hover:bg-slate-800/60'
                }`}
                aria-label={`${MONTH_NAMES[month]} ${day}, ${year}. ${dayItems.length} deadline${dayItems.length !== 1 ? 's' : ''}.`}
              >
                <span
                  className={`text-sm font-medium ${
                    isTodayCell
                      ? 'text-cyan-400 bg-cyan-500/20 rounded-full w-7 h-7 flex items-center justify-center'
                      : 'text-slate-300'
                  }`}
                >
                  {day}
                </span>
                {dayItems.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {dayItems.slice(0, 3).map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center gap-1"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${AGENCY_COLORS[d.agency].dot}`} />
                        <span className="text-[10px] md:text-xs text-slate-400 truncate leading-tight">
                          {d.title.length > 20 ? d.title.substring(0, 20) + '...' : d.title}
                        </span>
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <span className="text-[10px] text-slate-500">+{dayItems.length - 3} more</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day panel */}
      {selectedDay !== null && selectedDayDeadlines.length > 0 && (
        <div className="mt-4 bg-slate-800/40 border border-slate-700/30 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            {MONTH_NAMES[month]} {selectedDay}, {year} &mdash; {selectedDayDeadlines.length} Deadline{selectedDayDeadlines.length !== 1 ? 's' : ''}
          </h3>
          <div className="space-y-3">
            {selectedDayDeadlines.map((d) => (
              <DeadlineRow key={d.id} deadline={d} onSelect={onSelectDeadline} />
            ))}
          </div>
        </div>
      )}

      {selectedDay !== null && selectedDayDeadlines.length === 0 && (
        <div className="mt-4 bg-slate-800/40 border border-slate-700/30 rounded-xl p-5 text-center">
          <p className="text-sm text-slate-400">No deadlines on {MONTH_NAMES[month]} {selectedDay}, {year}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// AGENDA VIEW
// ============================================================================

function AgendaView({
  deadlines,
  onSelectDeadline,
}: {
  deadlines: RegulatoryDeadline[];
  onSelectDeadline: (d: RegulatoryDeadline) => void;
}) {
  // Group by year-month
  const grouped = useMemo(() => {
    const groups: Record<string, RegulatoryDeadline[]> = {};
    for (const d of deadlines) {
      const date = new Date(d.date + 'T00:00:00');
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    }
    // Sort each group
    for (const key in groups) {
      groups[key].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    return groups;
  }, [deadlines]);

  const sortedKeys = Object.keys(grouped).sort();

  if (sortedKeys.length === 0) {
    return (
      <div className="text-center py-16">
        <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-slate-400 text-lg">No deadlines match your filters</p>
        <p className="text-slate-500 text-sm mt-1">Try adjusting your filter criteria</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sortedKeys.map((key) => {
        const [yearStr, monthStr] = key.split('-');
        const year = parseInt(yearStr, 10);
        const monthIndex = parseInt(monthStr, 10) - 1;
        const items = grouped[key];

        return (
          <div key={key}>
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-3">
              <span className="bg-slate-800/60 px-3 py-1 rounded-lg">
                {MONTH_NAMES[monthIndex]} {year}
              </span>
              <span className="text-xs text-slate-500 font-normal">
                {items.length} deadline{items.length !== 1 ? 's' : ''}
              </span>
            </h3>
            <div className="space-y-2">
              {items.map((d) => (
                <DeadlineRow key={d.id} deadline={d} onSelect={onSelectDeadline} showDate />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// SHARED ROW COMPONENT
// ============================================================================

function DeadlineRow({
  deadline,
  onSelect,
  showDate = false,
}: {
  deadline: RegulatoryDeadline;
  onSelect: (d: RegulatoryDeadline) => void;
  showDate?: boolean;
}) {
  const agencyColor = AGENCY_COLORS[deadline.agency];
  const priorityColor = PRIORITY_COLORS[deadline.priority];
  const past = isPast(deadline.date);
  const todayFlag = isToday(deadline.date);

  return (
    <button
      onClick={() => onSelect(deadline)}
      className={`w-full text-left p-4 rounded-lg border transition-all hover:shadow-lg ${
        past
          ? 'bg-slate-900/40 border-slate-700/20 opacity-60 hover:opacity-80'
          : 'bg-slate-800/40 border-slate-700/30 hover:border-slate-600/50 hover:bg-slate-800/60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${agencyColor.dot}`} />
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${agencyColor.bg} ${agencyColor.text}`}>
              {deadline.agency}
            </span>
            <span className="text-xs text-slate-500">
              {TYPE_LABELS[deadline.type]}
            </span>
            {todayFlag && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-semibold">TODAY</span>
            )}
          </div>
          <p className={`text-sm font-medium mb-1 ${past ? 'text-slate-500' : 'text-slate-200'}`}>
            {deadline.title}
          </p>
          <p className="text-xs text-slate-400 line-clamp-1">{deadline.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded border ${priorityColor.bg} ${priorityColor.text} ${priorityColor.border}`}>
            {deadline.priority}
          </span>
          {showDate && (
            <span className={`text-xs ${past ? 'text-slate-600' : 'text-slate-400'}`}>
              {formatDate(deadline.date)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function RegulatoryCalendarPage() {
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [selectedDeadline, setSelectedDeadline] = useState<RegulatoryDeadline | null>(null);

  // Filters
  const [agencyFilter, setAgencyFilter] = useState<CalendarAgency | ''>('');
  const [typeFilter, setTypeFilter] = useState<DeadlineType | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<DeadlinePriority | ''>('');

  const filteredDeadlines = useMemo(() => {
    return REGULATORY_DEADLINES.filter((d) => {
      if (agencyFilter && d.agency !== agencyFilter) return false;
      if (typeFilter && d.type !== typeFilter) return false;
      if (priorityFilter && d.priority !== priorityFilter) return false;
      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [agencyFilter, typeFilter, priorityFilter]);

  const navigateMonth = useCallback(
    (dir: -1 | 1) => {
      let newMonth = currentMonth + dir;
      let newYear = currentYear;
      if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      } else if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      }
      setCurrentMonth(newMonth);
      setCurrentYear(newYear);
    },
    [currentMonth, currentYear]
  );

  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  }, []);

  const activeFilterCount = [agencyFilter, typeFilter, priorityFilter].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <AnimatedPageHeader
          title="Regulatory Deadline Calendar"
          subtitle="Track 100+ space industry regulatory deadlines across FCC, FAA, NASA, DoD, ITU, and international bodies for 2026-2027."
          icon={
            <svg className="w-9 h-9 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          breadcrumb="Regulatory & Compliance"
          accentColor="cyan"
        >
          <Link
            href="/compliance"
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-nebula-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Compliance Hub
          </Link>
        </AnimatedPageHeader>

        {/* Stats */}
        <StatsBar />

        {/* Upcoming this week */}
        <UpcomingThisWeek />

        {/* Agency Legend */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-500 uppercase tracking-wider mr-1">Legend:</span>
          {ALL_AGENCIES.map((agency) => (
            <button
              key={agency}
              onClick={() => setAgencyFilter(agencyFilter === agency ? '' : agency)}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors ${
                agencyFilter === agency
                  ? `${AGENCY_COLORS[agency].bg} ${AGENCY_COLORS[agency].text} ring-1 ring-current`
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${AGENCY_COLORS[agency].dot}`} />
              {agency}
            </button>
          ))}
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* View toggle */}
          <div className="flex bg-slate-800/60 rounded-lg p-1 border border-slate-700/30">
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'month'
                  ? 'bg-nebula-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'agenda'
                  ? 'bg-nebula-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Agenda
            </button>
          </div>

          {/* Month navigation (only in month view) */}
          {viewMode === 'month' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/30 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
                aria-label="Previous month"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-semibold text-slate-200 min-w-[10rem] text-center">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/30 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
                aria-label="Next month"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={goToToday}
                className="ml-1 px-3 py-2 text-xs font-medium rounded-lg bg-slate-800/60 border border-slate-700/30 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
              >
                Today
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-2 ml-auto">
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setAgencyFilter('');
                  setTypeFilter('');
                  setPriorityFilter('');
                }}
                className="text-xs text-slate-400 hover:text-red-400 transition-colors px-2 py-1"
              >
                Clear filters ({activeFilterCount})
              </button>
            )}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as DeadlineType | '')}
              className="bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-nebula-500/50"
            >
              <option value="">All Types</option>
              {ALL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as DeadlinePriority | '')}
              className="bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-nebula-500/50"
            >
              <option value="">All Priorities</option>
              {ALL_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Content */}
        {viewMode === 'month' ? (
          <MonthView
            year={currentYear}
            month={currentMonth}
            deadlines={filteredDeadlines}
            onSelectDeadline={setSelectedDeadline}
          />
        ) : (
          <AgendaView
            deadlines={filteredDeadlines}
            onSelectDeadline={setSelectedDeadline}
          />
        )}

        {/* Detail Modal */}
        {selectedDeadline && (
          <DeadlineDetailPanel
            deadline={selectedDeadline}
            onClose={() => setSelectedDeadline(null)}
          />
        )}

        {/* Footer disclaimer */}
        <div className="mt-12 text-center text-xs text-slate-500">
          <p>
            Deadlines are based on publicly available regulatory schedules and may be subject to change.
            Always verify dates with the relevant agency. Data covers 2026-2027 planning horizon.
          </p>
          <p className="mt-1">
            Sources: FCC Space Bureau, FAA/AST, NASA, ITU-R, BIS/DDTC, UNOOSA, Congressional schedules
          </p>
        </div>
      </div>
    </div>
  );
}
