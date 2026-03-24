'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GameState } from '@/lib/game/types';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';
import {
  ESPIONAGE_ACTIONS,
  SECURITY_LEVELS,
  getActionCost,
  getSecurityUpgradeCost,
  type EspionageActionType,
} from '@/lib/game/espionage-system';

// ─── Types ──────────────────────────────────────────────────────────────────

interface EspionageTarget {
  profileId: string;
  companyName: string;
  bracket: number;
  bracketName: string;
  allianceTag: string | null;
  securityIndicator: 'low' | 'medium' | 'high';
  isOnline: boolean;
  recentlyTargeted: boolean;
  cooldowns: Record<string, string | null>;
}

interface IntelReport {
  missionId: string;
  actionType: string;
  targetCompanyName: string;
  intel: Record<string, unknown>;
  expiresAt: string;
  gatheredAt: string;
  isStale: boolean;
}

interface MissionRecord {
  id: string;
  actionType: string;
  targetCompanyName: string;
  succeeded: boolean;
  detected: boolean;
  tracedBack: boolean;
  cost: number;
  successRate: number;
  createdAt: string;
}

interface IncomingDetection {
  id: string;
  actionType: string;
  succeeded: boolean;
  tracedBack: boolean;
  attackerName: string | null;
  createdAt: string;
}

interface EspionageProfile {
  securityLevel: number;
  securityName: string;
  defenseBonus: number;
  detectionChance: number;
  monthlyCost: number;
  heightenedAlert: boolean;
  alertExpiresAt: string | null;
  blacklist: string[];
}

interface EspionageState {
  profile: EspionageProfile;
  actions: {
    actionsToday: number;
    maxActionsPerDay: number;
    remaining: number;
    unlockedActions: string[];
  };
  activeIntel: IntelReport[];
  staleIntel: IntelReport[];
  recentMissions: MissionRecord[];
  incomingDetected: IncomingDetection[];
}

type SubTab = 'operations' | 'reports' | 'security' | 'history';

interface EspionagePanelProps {
  state: GameState;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'expired';
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / 60_000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const BRACKET_COLORS: Record<number, string> = {
  0: 'text-gray-400 bg-gray-700/50',
  1: 'text-blue-400 bg-blue-900/30',
  2: 'text-purple-400 bg-purple-900/30',
  3: 'text-amber-400 bg-amber-900/30',
};

const SECURITY_COLORS: Record<string, string> = {
  low: 'text-green-400',
  medium: 'text-amber-400',
  high: 'text-red-400',
};

const ACTION_ICONS: Record<string, string> = {
  scout: 'S',
  market_spy: 'M',
  tech_probe: 'R',
  workforce_intel: 'W',
  contract_snipe: 'C',
  disinformation: 'D',
  supply_chain_analysis: 'F',
  trade_route_intel: 'T',
  research_theft_attempt: 'A',
  employee_headhunt: 'H',
  counter_intelligence: 'CI',
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function EspionagePanel({ state }: EspionagePanelProps) {
  const [subTab, setSubTab] = useState<SubTab>('operations');
  const [espState, setEspState] = useState<EspionageState | null>(null);
  const [targets, setTargets] = useState<EspionageTarget[]>([]);
  const [myBracket, setMyBracket] = useState<{ id: number; name: string }>({ id: 0, name: 'Startup' });
  const [selectedTarget, setSelectedTarget] = useState<EspionageTarget | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // ── Fetch espionage profile ──
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/space-tycoon/espionage');
      if (res.ok) {
        const data = await res.json();
        setEspState(data);
      }
    } catch { /* silent */ }
  }, []);

  // ── Fetch targets ──
  const fetchTargets = useCallback(async () => {
    try {
      const url = searchQuery
        ? `/api/space-tycoon/espionage/targets?search=${encodeURIComponent(searchQuery)}`
        : '/api/space-tycoon/espionage/targets';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTargets(data.targets || []);
        setMyBracket({ id: data.myBracket, name: data.myBracketName });
      }
    } catch { /* silent */ }
  }, [searchQuery]);

  // ── Initial load ──
  useEffect(() => {
    Promise.all([fetchProfile(), fetchTargets()]).finally(() => setLoading(false));
  }, [fetchProfile, fetchTargets]);

  // ── Refetch targets when search changes ──
  useEffect(() => {
    const timer = setTimeout(() => fetchTargets(), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchTargets]);

  // ── Auto-dismiss messages ──
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // ── Execute espionage action ──
  const handleExecute = async (actionType: EspionageActionType) => {
    if (!selectedTarget || executing) return;
    setExecuting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/space-tycoon/espionage/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: selectedTarget.profileId,
          actionType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Operation failed.' });
        playSound('error');
      } else if (data.status === 'success') {
        setMessage({
          type: 'success',
          text: `Intelligence gathered from ${data.intelReport.targetCompanyName}! Report available for ${ESPIONAGE_ACTIONS[actionType].intelDurationHours}h.`,
        });
        playSound('money');
        fetchProfile();
        fetchTargets();
      } else {
        setMessage({
          type: 'info',
          text: data.message || 'Mission failed. Cost deducted.',
        });
        playSound('error');
        fetchProfile();
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Try again.' });
    } finally {
      setExecuting(false);
    }
  };

  // ── Upgrade security ──
  const handleUpgrade = async () => {
    if (!espState || upgrading) return;
    const targetLevel = espState.profile.securityLevel + 1;
    if (targetLevel > 10) return;

    setUpgrading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/space-tycoon/espionage/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLevel }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Upgrade failed.' });
        playSound('error');
      } else {
        setMessage({
          type: 'success',
          text: `Security upgraded to Level ${data.newSecurityLevel}: ${data.securityName}. Defense: +${Math.round(data.newDefenseBonus * 100)}%.`,
        });
        playSound('money');
        fetchProfile();
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Try again.' });
    } finally {
      setUpgrading(false);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 animate-pulse">Loading intelligence systems...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-xl font-bold text-white">
          Intelligence Operations
        </h2>
        {espState && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-400">
              Actions Today:{' '}
              <span className={espState.actions.remaining > 0 ? 'text-amber-400' : 'text-red-400'}>
                {espState.actions.actionsToday}/{espState.actions.maxActionsPerDay}
              </span>
            </span>
            <span className="text-gray-400">
              Bracket: <span className="text-amber-400">{myBracket.name}</span>
            </span>
          </div>
        )}
      </div>

      {/* Message banner */}
      {message && (
        <div
          className={`px-4 py-2 rounded text-sm ${
            message.type === 'success'
              ? 'bg-green-900/50 text-green-300 border border-green-700/50'
              : message.type === 'error'
                ? 'bg-red-900/50 text-red-300 border border-red-700/50'
                : 'bg-amber-900/50 text-amber-300 border border-amber-700/50'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Sub-tab navigation */}
      <div className="flex gap-1 bg-gray-800/50 p-1 rounded-lg overflow-x-auto">
        {(['operations', 'reports', 'security', 'history'] as SubTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`flex-1 min-w-[80px] px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap ${
              subTab === tab
                ? 'bg-red-900/60 text-red-300 border border-red-700/40'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            }`}
          >
            {tab === 'operations' && 'Operations'}
            {tab === 'reports' && `Reports${espState ? ` (${espState.activeIntel.length})` : ''}`}
            {tab === 'security' && 'Security'}
            {tab === 'history' && 'History'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {subTab === 'operations' && (
        <OperationsTab
          state={state}
          espState={espState}
          targets={targets}
          selectedTarget={selectedTarget}
          searchQuery={searchQuery}
          executing={executing}
          onSelectTarget={setSelectedTarget}
          onSearch={setSearchQuery}
          onExecute={handleExecute}
        />
      )}
      {subTab === 'reports' && <ReportsTab espState={espState} />}
      {subTab === 'security' && (
        <SecurityTab
          espState={espState}
          upgrading={upgrading}
          onUpgrade={handleUpgrade}
        />
      )}
      {subTab === 'history' && <HistoryTab espState={espState} />}
    </div>
  );
}

// ─── Operations Tab ─────────────────────────────────────────────────────────

function OperationsTab({
  state,
  espState,
  targets,
  selectedTarget,
  searchQuery,
  executing,
  onSelectTarget,
  onSearch,
  onExecute,
}: {
  state: GameState;
  espState: EspionageState | null;
  targets: EspionageTarget[];
  selectedTarget: EspionageTarget | null;
  searchQuery: string;
  executing: boolean;
  onSelectTarget: (t: EspionageTarget | null) => void;
  onSearch: (q: string) => void;
  onExecute: (a: EspionageActionType) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Target Selector (Left) */}
      <div className="bg-gray-800/40 rounded-lg border border-gray-700/50 p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Select Target</h3>

        {/* Search */}
        <input
          type="text"
          placeholder="Search companies..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700/50 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-700/50 mb-3"
        />

        {/* Target list */}
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {targets.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">No valid targets found.</p>
          ) : (
            targets.map((target) => (
              <button
                key={target.profileId}
                onClick={() => onSelectTarget(selectedTarget?.profileId === target.profileId ? null : target)}
                className={`w-full text-left px-3 py-2 rounded transition-colors ${
                  selectedTarget?.profileId === target.profileId
                    ? 'bg-red-900/40 border border-red-700/40'
                    : 'bg-gray-900/30 border border-transparent hover:bg-gray-700/40 hover:border-gray-600/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Online indicator */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${target.isOnline ? 'bg-green-400' : 'bg-gray-600'}`} />
                    <span className="text-sm text-white truncate">{target.companyName}</span>
                    {target.allianceTag && (
                      <span className="text-xs text-gray-500 flex-shrink-0">[{target.allianceTag}]</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {target.recentlyTargeted && (
                      <span className="text-xs text-amber-500" title="Cooldown active">CD</span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded ${BRACKET_COLORS[target.bracket] || ''}`}>
                      {target.bracketName}
                    </span>
                    <span className={`text-xs ${SECURITY_COLORS[target.securityIndicator] || ''}`} title={`Security: ${target.securityIndicator}`}>
                      {target.securityIndicator === 'high' ? 'HI' : target.securityIndicator === 'medium' ? 'MD' : 'LO'}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Action Panel (Right) */}
      <div className="bg-gray-800/40 rounded-lg border border-gray-700/50 p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">
          {selectedTarget ? `Operations vs ${selectedTarget.companyName}` : 'Select a target'}
        </h3>

        {!selectedTarget ? (
          <p className="text-gray-500 text-sm py-8 text-center">
            Choose a target from the list to view available operations.
          </p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {(Object.keys(ESPIONAGE_ACTIONS) as EspionageActionType[]).map((actionType) => {
              const action = ESPIONAGE_ACTIONS[actionType];
              const isUnlocked = espState?.actions.unlockedActions.includes(actionType);
              const cost = getActionCost(actionType, state.money > 0 ? state.money : 0);
              const canAfford = state.money >= cost;
              const actionsLeft = espState?.actions.remaining ?? 0;

              // Cooldown
              const cooldownStr = selectedTarget.cooldowns[actionType];
              const isOnCooldown = cooldownStr ? new Date(cooldownStr) > new Date() : false;
              const cooldownRemaining = isOnCooldown && cooldownStr ? timeUntil(cooldownStr) : null;

              // counter_intelligence is self-targeted
              const isSelfTargeted = actionType === 'counter_intelligence';

              const isDisabled =
                !isUnlocked ||
                !canAfford ||
                actionsLeft <= 0 ||
                (isOnCooldown && !isSelfTargeted) ||
                executing;

              return (
                <div
                  key={actionType}
                  className={`p-3 rounded border transition-colors ${
                    isDisabled
                      ? 'bg-gray-900/30 border-gray-700/30 opacity-60'
                      : 'bg-gray-900/50 border-gray-600/40 hover:border-red-700/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 flex items-center justify-center text-xs font-bold bg-red-900/40 text-red-400 rounded border border-red-800/40">
                        {ACTION_ICONS[actionType] || '?'}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-white">{action.name}</div>
                        <div className="text-xs text-gray-500">{action.description.substring(0, 80)}...</div>
                      </div>
                    </div>
                    <span className="text-xs text-amber-400 whitespace-nowrap font-mono">
                      {formatMoney(cost)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                    <span className="text-gray-400">
                      Success: <span className="text-white">{Math.round(action.baseSuccessRate * 100)}%</span>
                    </span>
                    <span className="text-gray-400">
                      Duration: <span className="text-white">{action.intelDurationHours}h</span>
                    </span>
                    {isOnCooldown && !isSelfTargeted && (
                      <span className="text-amber-500">
                        CD: {cooldownRemaining}
                      </span>
                    )}
                    {!isUnlocked && (
                      <span className="text-red-500">
                        Requires: {action.unlockRequirement}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onExecute(actionType)}
                    disabled={isDisabled}
                    className={`mt-2 w-full py-1.5 rounded text-xs font-semibold transition-colors ${
                      isDisabled
                        ? 'bg-gray-700/40 text-gray-500 cursor-not-allowed'
                        : 'bg-red-900/60 text-red-300 hover:bg-red-800/60 border border-red-700/40'
                    }`}
                  >
                    {executing ? 'Executing...' : isSelfTargeted ? 'ACTIVATE' : 'LAUNCH OPERATION'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reports Tab ────────────────────────────────────────────────────────────

function ReportsTab({ espState }: { espState: EspionageState | null }) {
  const allReports = [
    ...(espState?.activeIntel || []),
    ...(espState?.staleIntel || []),
  ];

  if (allReports.length === 0) {
    return (
      <div className="bg-gray-800/40 rounded-lg border border-gray-700/50 p-8 text-center">
        <p className="text-gray-500 text-sm">No intelligence reports gathered yet.</p>
        <p className="text-gray-600 text-xs mt-1">Launch operations to gather intel on competitors.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {allReports.map((report) => {
        const actionDef = ESPIONAGE_ACTIONS[report.actionType as EspionageActionType];
        const expiresIn = timeUntil(report.expiresAt);
        const total = new Date(report.expiresAt).getTime() - new Date(report.gatheredAt).getTime();
        const remaining = new Date(report.expiresAt).getTime() - Date.now();
        const pctRemaining = Math.max(0, Math.min(100, (remaining / total) * 100));

        let borderColor = 'border-green-700/40';
        if (report.isStale) borderColor = 'border-red-700/40';
        else if (pctRemaining < 50) borderColor = 'border-amber-700/40';

        return (
          <div
            key={report.missionId}
            className={`bg-gray-900/50 rounded-lg border p-4 ${borderColor} ${report.isStale ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded">
                  {actionDef?.name || report.actionType}
                </span>
                {report.isStale && (
                  <span className="text-xs text-red-400 border border-red-700/30 px-1 rounded">STALE</span>
                )}
              </div>
              <span className="text-xs text-gray-500">{timeAgo(report.gatheredAt)}</span>
            </div>

            <div className="text-sm font-medium text-white mb-2">{report.targetCompanyName}</div>

            {/* Intel data preview */}
            <div className="bg-gray-800/60 rounded p-2 text-xs space-y-1 max-h-[150px] overflow-y-auto mb-2">
              {Object.entries(report.intel).map(([key, value]) => {
                if (key === 'note') return <p key={key} className="text-gray-400 italic">{String(value)}</p>;
                if (typeof value === 'object' && value !== null) {
                  return (
                    <div key={key}>
                      <span className="text-gray-500">{key}:</span>{' '}
                      <span className="text-gray-300">{JSON.stringify(value).substring(0, 100)}</span>
                    </div>
                  );
                }
                return (
                  <div key={key}>
                    <span className="text-gray-500">{key}:</span>{' '}
                    <span className="text-gray-300">{String(value)}</span>
                  </div>
                );
              })}
            </div>

            {/* Expiry bar */}
            <div className="flex items-center justify-between text-xs">
              <span className={report.isStale ? 'text-red-400' : pctRemaining < 50 ? 'text-amber-400' : 'text-green-400'}>
                {report.isStale ? 'Expired' : `Expires in ${expiresIn}`}
              </span>
              <div className="w-24 h-1.5 bg-gray-700 rounded overflow-hidden">
                <div
                  className={`h-full rounded transition-all ${
                    report.isStale ? 'bg-red-600' : pctRemaining < 50 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${pctRemaining}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Security Tab ───────────────────────────────────────────────────────────

function SecurityTab({
  espState,
  upgrading,
  onUpgrade,
}: {
  espState: EspionageState | null;
  upgrading: boolean;
  onUpgrade: () => void;
}) {
  if (!espState) {
    return <div className="text-gray-500 text-sm py-8 text-center">Loading security data...</div>;
  }

  const { profile } = espState;
  const currentLevel = profile.securityLevel;
  const nextLevel = currentLevel + 1;
  const canUpgrade = nextLevel <= 10;
  const upgradeCost = canUpgrade ? getSecurityUpgradeCost(nextLevel) : 0;
  const nextDef = canUpgrade ? SECURITY_LEVELS[nextLevel] : null;

  return (
    <div className="space-y-4">
      {/* Security Level Panel */}
      <div className="bg-gray-800/40 rounded-lg border border-gray-700/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-300">Corporate Security</h3>
          <span className="text-sm text-amber-400 font-mono">Level {currentLevel}/10</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-red-600 to-amber-500 rounded-full transition-all"
            style={{ width: `${(currentLevel / 10) * 100}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-xs text-gray-500">Level</div>
            <div className="text-sm font-medium text-white">{profile.securityName}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Defense</div>
            <div className="text-sm font-medium text-green-400">+{Math.round(profile.defenseBonus * 100)}%</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Detection</div>
            <div className="text-sm font-medium text-amber-400">{Math.round(profile.detectionChance * 100)}%</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Monthly Cost</div>
            <div className="text-sm font-medium text-white">{formatMoney(profile.monthlyCost)}/mo</div>
          </div>
        </div>

        {/* Heightened alert indicator */}
        {profile.heightenedAlert && profile.alertExpiresAt && new Date(profile.alertExpiresAt) > new Date() && (
          <div className="mt-3 px-3 py-2 bg-amber-900/30 border border-amber-700/40 rounded text-xs text-amber-300">
            HEIGHTENED ALERT ACTIVE — +15% defense bonus. Expires in {timeUntil(profile.alertExpiresAt)}.
          </div>
        )}

        {/* Upgrade button */}
        {canUpgrade && nextDef && (
          <div className="mt-4 p-3 bg-gray-900/50 rounded border border-gray-700/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white font-medium">
                Upgrade to Level {nextLevel}: {nextDef.name}
              </span>
              <span className="text-xs text-amber-400 font-mono">{formatMoney(upgradeCost)}</span>
            </div>
            <div className="text-xs text-gray-400 mb-2">
              Defense: +{Math.round(nextDef.defenseBonus * 100)}% | Detection: {Math.round(nextDef.detectionChance * 100)}% | Monthly: {formatMoney(nextDef.monthlyCost)}/mo
            </div>
            <button
              onClick={onUpgrade}
              disabled={upgrading}
              className="w-full py-2 rounded text-sm font-semibold bg-amber-900/50 text-amber-300 hover:bg-amber-800/50 border border-amber-700/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {upgrading ? 'Upgrading...' : `UPGRADE SECURITY — ${formatMoney(upgradeCost)}`}
            </button>
          </div>
        )}

        {!canUpgrade && (
          <div className="mt-3 text-center text-xs text-green-400">
            Maximum security level reached. Fortress Protocol active.
          </div>
        )}
      </div>

      {/* Blacklist Panel */}
      <div className="bg-gray-800/40 rounded-lg border border-gray-700/50 p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">
          Blacklist ({profile.blacklist.length}/5)
        </h3>
        {profile.blacklist.length === 0 ? (
          <p className="text-gray-500 text-xs">
            No companies blacklisted. Blacklisted attackers have their success rate halved.
          </p>
        ) : (
          <div className="space-y-1">
            {profile.blacklist.map((id) => (
              <div key={id} className="flex items-center justify-between px-2 py-1 bg-gray-900/40 rounded text-xs">
                <span className="text-gray-300">{id}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detection Log */}
      <div className="bg-gray-800/40 rounded-lg border border-gray-700/50 p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Detected Espionage Attempts</h3>
        {(espState.incomingDetected || []).length === 0 ? (
          <p className="text-gray-500 text-xs">No detected espionage attempts in the last 7 days.</p>
        ) : (
          <div className="space-y-2">
            {espState.incomingDetected.map((d) => {
              const actionDef = ESPIONAGE_ACTIONS[d.actionType as EspionageActionType];
              return (
                <div
                  key={d.id}
                  className="flex items-start justify-between p-2 bg-gray-900/40 rounded border border-gray-700/30"
                >
                  <div>
                    <div className="text-xs text-red-400 font-medium">
                      {actionDef?.name || d.actionType} attempt detected
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {d.tracedBack && d.attackerName
                        ? `By: "${d.attackerName}"`
                        : 'Attacker: Unknown'}{' '}
                      | {d.succeeded ? 'Succeeded' : 'Failed'}
                    </div>
                  </div>
                  <span className="text-xs text-gray-600">{timeAgo(d.createdAt)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── History Tab ────────────────────────────────────────────────────────────

function HistoryTab({ espState }: { espState: EspionageState | null }) {
  const missions = espState?.recentMissions || [];

  if (missions.length === 0) {
    return (
      <div className="bg-gray-800/40 rounded-lg border border-gray-700/50 p-8 text-center">
        <p className="text-gray-500 text-sm">No mission history yet.</p>
        <p className="text-gray-600 text-xs mt-1">Your espionage operations will appear here.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/40 rounded-lg border border-gray-700/50 overflow-hidden">
      {/* Table header */}
      <div className="hidden sm:grid grid-cols-6 gap-2 px-4 py-2 bg-gray-900/60 text-xs text-gray-500 font-medium border-b border-gray-700/50">
        <span>Action</span>
        <span>Target</span>
        <span>Result</span>
        <span>Success %</span>
        <span>Cost</span>
        <span>When</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-700/30">
        {missions.map((m) => {
          const actionDef = ESPIONAGE_ACTIONS[m.actionType as EspionageActionType];
          return (
            <div
              key={m.id}
              className="grid grid-cols-2 sm:grid-cols-6 gap-2 px-4 py-2.5 text-xs hover:bg-gray-800/40 transition-colors"
            >
              <span className="text-gray-300 font-medium truncate">{actionDef?.name || m.actionType}</span>
              <span className="text-gray-400 truncate">{m.targetCompanyName}</span>
              <span>
                {m.succeeded ? (
                  <span className="text-green-400">Success</span>
                ) : (
                  <span className="text-red-400">Failed</span>
                )}
                {m.detected && <span className="text-amber-400 ml-1">[D]</span>}
                {m.tracedBack && <span className="text-red-500 ml-1">[T]</span>}
              </span>
              <span className="text-gray-400 hidden sm:block">{Math.round(m.successRate * 100)}%</span>
              <span className="text-amber-400 hidden sm:block font-mono">{formatMoney(m.cost)}</span>
              <span className="text-gray-600 hidden sm:block">{timeAgo(m.createdAt)}</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 bg-gray-900/40 border-t border-gray-700/50 text-xs text-gray-600">
        [D] = Detected by target | [T] = Traced back to you
      </div>
    </div>
  );
}
