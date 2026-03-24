'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EventContribution {
  profileId: string;
  companyName: string;
  score: number;
  details: Record<string, number> | null;
  isYou: boolean;
}

interface BracketStanding {
  rank: number;
  allianceId: string;
  allianceName: string;
  allianceTag: string;
  totalScore: number;
  perCapitaScore: number;
  activeMemberCount: number;
  memberCount: number;
  isYou: boolean;
}

interface AllianceEventData {
  id: string;
  type: string;
  category: string;
  name: string;
  icon: string;
  description: string;
  startsAt: string;
  endsAt: string;
  timeRemainingMs: number;
  allianceScore: {
    totalScore: number;
    perCapitaScore: number;
    activeMemberCount: number;
    bracketRank: number | null;
    meetsThreshold: boolean;
  };
  contributions: EventContribution[];
  bracketStandings: BracketStanding[];
}

interface DailyTask {
  index: number;
  id: string;
  description: string;
  target: number;
  xpReward: number;
  completed: boolean;
}

interface EventHistoryItem {
  id: string;
  type: string;
  name: string;
  icon: string;
  endsAt: string;
  totalScore: number;
  perCapitaScore: number;
  bracketRank: number | null;
  rewardXP: number;
  rewardBonus: { revenueBonusPct: number; durationDays: number } | null;
}

interface AllianceInfo {
  id: string;
  name: string;
  tag: string;
  level: number;
  tier: number;
  memberCount: number;
}

interface EventsPanelData {
  alliance: AllianceInfo;
  activeEvents: AllianceEventData[];
  eventHistory: EventHistoryItem[];
  dailyTasks: DailyTask[];
  dailyTaskId: string;
  allTasksCompleted: boolean;
  announcements: Array<{ text: string; authorId: string; createdAt: string }>;
  myRole: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AllianceEventsPanel() {
  const [data, setData] = useState<EventsPanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'standings' | 'tasks' | 'history'>('events');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/space-tycoon/alliance-events');
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to load' }));
        throw new Error(err.error || 'Failed to load alliance events');
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
        <div className="inline-block w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-slate-400 text-xs">Loading alliance events...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
        <p className="text-red-400 text-xs mb-2">{error || 'No data available'}</p>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="px-4 py-1.5 text-xs font-medium text-white bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { alliance, activeEvents, eventHistory, dailyTasks, allTasksCompleted, announcements } = data;

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-1 bg-white/[0.02] rounded-lg p-1 border border-white/[0.06]">
        {(['events', 'standings', 'tasks', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-colors ${
              activeTab === tab
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
            }`}
          >
            {tab === 'events' ? 'Events' : tab === 'standings' ? 'Bracket' : tab === 'tasks' ? 'Daily' : 'History'}
          </button>
        ))}
      </div>

      {/* Announcements / Event Directive */}
      {announcements.length > 0 && activeTab === 'events' && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <h4 className="text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-1.5">
            Alliance Directive
          </h4>
          {announcements.slice(0, 3).map((a, i) => (
            <p key={i} className="text-amber-200/80 text-xs mb-1">{a.text}</p>
          ))}
        </div>
      )}

      {/* ─── Events Tab ─────────────────────────────────────────────── */}
      {activeTab === 'events' && (
        <>
          {activeEvents.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
              <span className="text-2xl block mb-2">🏁</span>
              <p className="text-slate-400 text-xs">No active alliance events right now.</p>
              <p className="text-slate-600 text-[10px] mt-1">Check back for the next weekly Sprint!</p>
            </div>
          ) : (
            activeEvents.map(event => (
              <EventCard key={event.id} event={event} alliance={alliance} />
            ))
          )}
        </>
      )}

      {/* ─── Bracket Standings Tab ──────────────────────────────────── */}
      {activeTab === 'standings' && (
        <>
          {activeEvents.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
              <p className="text-slate-400 text-xs">No active event to show standings for.</p>
            </div>
          ) : (
            activeEvents.map(event => (
              <BracketStandings key={event.id} event={event} />
            ))
          )}
        </>
      )}

      {/* ─── Daily Tasks Tab ────────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <DailyTasksCard tasks={dailyTasks} allCompleted={allTasksCompleted} />
      )}

      {/* ─── History Tab ────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <EventHistory history={eventHistory} />
      )}
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function EventCard({ event, alliance }: { event: AllianceEventData; alliance: AllianceInfo }) {
  const timeStr = formatTimeRemaining(event.timeRemainingMs);
  const { allianceScore, contributions } = event;

  return (
    <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
      {/* Event Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{event.icon}</span>
          <div>
            <h3 className="text-white text-sm font-semibold">{event.name}</h3>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold uppercase">
              {event.category.replace('_', ' ')}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-amber-300 text-xs font-mono font-bold">{timeStr}</p>
          <p className="text-slate-500 text-[10px]">remaining</p>
        </div>
      </div>

      <p className="text-slate-400 text-[10px] mb-3">{event.description}</p>

      {/* Alliance Score */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.04] text-center">
          <p className="text-slate-500 text-[9px] uppercase tracking-wider">Total Score</p>
          <p className="text-white text-sm font-bold font-mono">{allianceScore.totalScore.toLocaleString()}</p>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.04] text-center">
          <p className="text-slate-500 text-[9px] uppercase tracking-wider">Per Capita</p>
          <p className="text-cyan-300 text-sm font-bold font-mono">{allianceScore.perCapitaScore.toFixed(1)}</p>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.04] text-center">
          <p className="text-slate-500 text-[9px] uppercase tracking-wider">Rank</p>
          <p className={`text-sm font-bold font-mono ${
            allianceScore.bracketRank && allianceScore.bracketRank <= 3 ? 'text-amber-300' : 'text-white'
          }`}>
            {allianceScore.bracketRank ? `#${allianceScore.bracketRank}` : '--'}
          </p>
        </div>
      </div>

      {/* Active Members */}
      <div className="flex items-center justify-between mb-3 text-[10px]">
        <span className="text-slate-500">
          Active: {allianceScore.activeMemberCount}/{alliance.memberCount} members
        </span>
        {allianceScore.meetsThreshold ? (
          <span className="text-green-400">Qualifies for rewards</span>
        ) : (
          <span className="text-amber-400">Below minimum threshold</span>
        )}
      </div>

      {/* Top Contributors */}
      {contributions.length > 0 && (
        <div>
          <h4 className="text-white text-[10px] font-bold uppercase tracking-wider mb-2">
            Top Contributors
          </h4>
          <div className="space-y-1">
            {contributions.slice(0, 5).map((c, idx) => (
              <div
                key={c.profileId}
                className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg ${
                  c.isYou ? 'bg-cyan-500/5 border border-cyan-500/10' : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 text-[10px] font-mono w-4">{idx + 1}.</span>
                  <span className={`text-xs ${c.isYou ? 'text-cyan-300 font-semibold' : 'text-white'}`}>
                    {c.companyName}
                  </span>
                  {c.isYou && (
                    <span className="text-[8px] px-1 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold">
                      YOU
                    </span>
                  )}
                </div>
                <span className="text-slate-300 text-xs font-mono">{c.score.toLocaleString()} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BracketStandings({ event }: { event: AllianceEventData }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{event.icon}</span>
        <h3 className="text-white text-xs font-bold uppercase tracking-wider">
          {event.name} — Bracket Standings
        </h3>
      </div>

      {event.bracketStandings.length === 0 ? (
        <p className="text-slate-500 text-xs text-center py-4">No standings yet.</p>
      ) : (
        <div className="space-y-1.5">
          {event.bracketStandings.map(s => (
            <div
              key={s.allianceId}
              className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                s.isYou ? 'bg-purple-500/10 border border-purple-500/20' : 'hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`text-sm font-bold font-mono w-6 ${
                  s.rank === 1 ? 'text-amber-300' : s.rank === 2 ? 'text-slate-300' : s.rank === 3 ? 'text-amber-600' : 'text-slate-500'
                }`}>
                  #{s.rank}
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-medium ${s.isYou ? 'text-purple-300' : 'text-white'}`}>
                      {s.allianceName}
                    </span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-white/[0.06] text-slate-400 font-mono">
                      [{s.allianceTag}]
                    </span>
                    {s.isYou && (
                      <span className="text-[8px] px-1 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold">
                        YOU
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {s.activeMemberCount}/{s.memberCount} active
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white text-xs font-mono font-bold">{s.perCapitaScore.toFixed(1)}</p>
                <p className="text-slate-600 text-[9px]">per capita</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DailyTasksCard({ tasks, allCompleted }: { tasks: DailyTask[]; allCompleted: boolean }) {
  const completedCount = tasks.filter(t => t.completed).length;
  const totalXP = tasks.reduce((sum, t) => sum + t.xpReward, 0);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
          <span>📋</span> Daily Alliance Tasks
        </h3>
        <span className={`text-[10px] font-bold ${completedCount >= 3 ? 'text-green-400' : 'text-slate-500'}`}>
          {completedCount}/3 done
        </span>
      </div>

      <div className="space-y-2 mb-3">
        {tasks.map(task => (
          <div
            key={task.index}
            className={`flex items-center justify-between py-2 px-3 rounded-lg border ${
              task.completed
                ? 'bg-green-500/5 border-green-500/20'
                : 'bg-white/[0.02] border-white/[0.04]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {task.completed ? '✅' : '⬜'}
              </span>
              <span className={`text-xs ${task.completed ? 'text-green-300 line-through' : 'text-white'}`}>
                {task.description}
              </span>
            </div>
            <span className={`text-[10px] font-mono font-bold ${
              task.completed ? 'text-green-400' : 'text-amber-300'
            }`}>
              +{task.xpReward} XP
            </span>
          </div>
        ))}
      </div>

      {/* Completion bonus */}
      <div className={`p-2.5 rounded-lg border text-center ${
        allCompleted
          ? 'bg-amber-500/5 border-amber-500/20'
          : 'bg-white/[0.02] border-white/[0.04]'
      }`}>
        <p className={`text-[10px] font-medium ${allCompleted ? 'text-amber-300' : 'text-slate-500'}`}>
          {allCompleted ? 'All tasks complete! +15 bonus XP' : `Complete all 3 for +15 bonus XP (${totalXP + 15} XP total)`}
        </p>
      </div>
    </div>
  );
}

function EventHistory({ history }: { history: EventHistoryItem[] }) {
  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
        <p className="text-slate-400 text-xs">No completed events yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <span>📜</span> Recent Event Results
      </h3>
      <div className="space-y-2">
        {history.map(h => (
          <div
            key={h.id}
            className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/[0.03] border border-white/[0.04]"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{h.icon}</span>
              <div>
                <p className="text-white text-xs font-medium">{h.name}</p>
                <p className="text-slate-500 text-[10px]">
                  {new Date(h.endsAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                {h.bracketRank && (
                  <span className={`text-xs font-bold font-mono ${
                    h.bracketRank <= 3 ? 'text-amber-300' : 'text-slate-400'
                  }`}>
                    #{h.bracketRank}
                  </span>
                )}
                <span className="text-green-400 text-[10px] font-mono">+{h.rewardXP} XP</span>
              </div>
              {h.rewardBonus && (
                <p className="text-[9px] text-cyan-400">
                  +{h.rewardBonus.revenueBonusPct}% rev ({h.rewardBonus.durationDays}d)
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Ended';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
