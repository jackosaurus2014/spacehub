'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GameState } from '@/lib/game/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ZoneInfluencer {
  profileId: string | null;
  companyName: string;
  allianceTag: string | null;
  sharePct: number;
  status: string;
}

interface ZoneChallenge {
  challengerName: string;
  challengerIP: number;
  governorIP: number;
  endsAt: string;
  hoursRemaining: number;
}

interface SubZone {
  subZoneId: string;
  name: string;
  activityFocus: string;
}

interface ZoneData {
  zoneId: string;
  name: string;
  defaultName: string;
  tier: number;
  accentColor: string;
  governor: {
    profileId: string;
    companyName: string;
    sharePct: number;
  } | null;
  challenge: ZoneChallenge | null;
  topInfluencers: ZoneInfluencer[];
  totalParticipants: number;
  totalIp: number;
  myInfluence: {
    influencePoints: number;
    sharePct: number;
    status: string;
  } | null;
  subZones: SubZone[];
}

interface TerritoryPanelProps {
  state: GameState;
}

// ─── Zone tier icons ─────────────────────────────────────────────────────────

const TIER_LABELS: Record<number, string> = {
  1: 'Inner System',
  2: 'Cislunar',
  3: 'Mid System',
  4: 'Outer Planets',
  5: 'Deep Space',
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  governor: { label: 'Governor', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  major_stakeholder: { label: 'Major Stakeholder', className: 'bg-gray-400/20 text-gray-300 border-gray-400/30' },
  stakeholder: { label: 'Stakeholder', className: 'bg-amber-700/20 text-amber-400 border-amber-700/30' },
  contributor: { label: 'Contributor', className: 'bg-orange-800/20 text-orange-400 border-orange-800/30' },
  present: { label: 'Present', className: 'bg-gray-700/20 text-gray-400 border-gray-700/30' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function TerritoryPanel({ state }: TerritoryPanelProps) {
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeMessage, setChallengeMessage] = useState<string | null>(null);

  // ─── Fetch Zone Data ─────────────────────────────────────────────────────

  const fetchZones = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/space-tycoon/zones');
      if (!res.ok) throw new Error('Failed to load zone data');
      const data = await res.json();
      setZones(data.zones || []);
    } catch (err) {
      setError('Failed to load territory data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  // Refresh periodically
  useEffect(() => {
    const interval = setInterval(fetchZones, 60_000);
    return () => clearInterval(interval);
  }, [fetchZones]);

  // ─── Challenge Governor ──────────────────────────────────────────────────

  const handleChallenge = async (zoneSlug: string) => {
    setChallengeLoading(true);
    setChallengeMessage(null);
    try {
      const res = await fetch('/api/space-tycoon/zones/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneSlug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setChallengeMessage(data.error || 'Challenge failed');
      } else {
        setChallengeMessage('Governance challenge initiated! 72-hour countdown started.');
        fetchZones();
      }
    } catch {
      setChallengeMessage('Failed to initiate challenge');
    } finally {
      setChallengeLoading(false);
    }
  };

  const selectedZoneData = zones.find(z => z.zoneId === selectedZone);

  // Count governed zones for summary
  const governedZones = zones.filter(z => z.myInfluence?.status === 'governor');
  const contestedZones = zones.filter(z => z.challenge !== null);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold text-white">Territory Influence</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="bg-gray-800/50 rounded-lg p-4 animate-pulse h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold text-white mb-4">Territory Influence</h2>
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
          {error}
          <button
            onClick={fetchZones}
            className="ml-3 text-sm underline hover:text-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-white">Solar System Influence Map</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {governedZones.length > 0 ? (
              <>
                Governor of:{' '}
                <span className="text-yellow-300">
                  {governedZones.map(z => z.name).join(', ')}
                </span>
              </>
            ) : (
              'Build infrastructure to earn zone influence'
            )}
            {contestedZones.length > 0 && (
              <span className="ml-2 text-red-400">
                | {contestedZones.length} contested
              </span>
            )}
          </p>
        </div>
        {selectedZone && (
          <button
            onClick={() => setSelectedZone(null)}
            className="text-sm text-blue-400 hover:text-blue-300 shrink-0"
          >
            Back to Overview
          </button>
        )}
      </div>

      {/* Zone Grid or Detail View */}
      {!selectedZone ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {zones.map(zone => (
            <ZoneCard
              key={zone.zoneId}
              zone={zone}
              onClick={() => setSelectedZone(zone.zoneId)}
            />
          ))}
        </div>
      ) : (
        selectedZoneData && (
          <ZoneDetail
            zone={selectedZoneData}
            onChallenge={handleChallenge}
            challengeLoading={challengeLoading}
            challengeMessage={challengeMessage}
          />
        )
      )}
    </div>
  );
}

// ─── Zone Card (Grid View) ───────────────────────────────────────────────────

function ZoneCard({ zone, onClick }: { zone: ZoneData; onClick: () => void }) {
  const isGoverned = zone.myInfluence?.status === 'governor';
  const isContested = zone.challenge !== null;
  const myShare = zone.myInfluence?.sharePct || 0;

  return (
    <button
      onClick={onClick}
      className={`
        relative text-left rounded-lg p-4 transition-all hover:scale-[1.02] hover:brightness-110
        ${isGoverned
          ? 'bg-gradient-to-br from-yellow-900/30 to-gray-800/80 border-2 border-yellow-500/40'
          : isContested
            ? 'bg-gradient-to-br from-red-900/20 to-gray-800/80 border-2 border-red-500/30 animate-pulse-slow'
            : myShare > 0
              ? 'bg-gray-800/70 border border-gray-600/50 hover:border-gray-500/70'
              : 'bg-gray-800/40 border border-gray-700/30 hover:border-gray-600/50 opacity-80'
        }
      `}
    >
      {/* Zone tier badge */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-white text-sm leading-tight">{zone.name}</h3>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">
            {TIER_LABELS[zone.tier] || 'Unknown'} (T{zone.tier})
          </span>
        </div>
        {isContested && (
          <span className="text-xs bg-red-600/30 text-red-300 px-1.5 py-0.5 rounded border border-red-500/30 shrink-0">
            CONTESTED
          </span>
        )}
      </div>

      {/* Governor */}
      <div className="text-xs text-gray-400 mb-2">
        {zone.governor ? (
          <>
            Gov:{' '}
            <span className={isGoverned ? 'text-yellow-300 font-medium' : 'text-gray-300'}>
              {isGoverned ? 'You' : zone.governor.companyName}
            </span>
          </>
        ) : (
          <span className="text-gray-500">No Governor</span>
        )}
      </div>

      {/* Influence Bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-gray-400">Your influence</span>
          <span className={myShare > 0 ? 'text-white font-medium' : 'text-gray-500'}>
            {myShare > 0 ? `${myShare.toFixed(1)}%` : '--'}
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, myShare)}%`,
              backgroundColor: zone.accentColor,
              opacity: myShare > 0 ? 1 : 0,
            }}
          />
        </div>
      </div>

      {/* Status badge */}
      {zone.myInfluence && zone.myInfluence.status !== 'none' && (
        <div className="flex items-center gap-1">
          {STATUS_BADGES[zone.myInfluence.status] && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_BADGES[zone.myInfluence.status].className}`}>
              {STATUS_BADGES[zone.myInfluence.status].label}
            </span>
          )}
        </div>
      )}

      {/* Challenge countdown */}
      {isContested && zone.challenge && (
        <div className="mt-2 text-[10px] text-red-300">
          {zone.challenge.hoursRemaining.toFixed(0)}h remaining
        </div>
      )}

      {/* Participants */}
      <div className="mt-2 text-[10px] text-gray-500">
        {zone.totalParticipants} player{zone.totalParticipants !== 1 ? 's' : ''} | {formatIp(zone.totalIp)} total IP
      </div>
    </button>
  );
}

function formatIp(ip: number) {
  if (ip >= 1000) return `${(ip / 1000).toFixed(1)}K`;
  return ip.toFixed(0);
}

// ─── Zone Detail Panel ───────────────────────────────────────────────────────

function ZoneDetail({
  zone,
  onChallenge,
  challengeLoading,
  challengeMessage,
}: {
  zone: ZoneData;
  onChallenge: (slug: string) => void;
  challengeLoading: boolean;
  challengeMessage: string | null;
}) {
  const isGoverned = zone.myInfluence?.status === 'governor';
  const isContested = zone.challenge !== null;
  const myShare = zone.myInfluence?.sharePct || 0;
  const myIp = zone.myInfluence?.influencePoints || 0;

  // Can the player challenge?
  const canChallenge = zone.governor
    && !isGoverned
    && !isContested
    && myShare > 0
    && myIp >= (zone.governor.sharePct * 0.8); // Approximate check

  return (
    <div className="space-y-4">
      {/* Zone Header */}
      <div
        className="rounded-lg p-4 border"
        style={{
          borderColor: `${zone.accentColor}40`,
          background: `linear-gradient(135deg, ${zone.accentColor}10, transparent)`,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-white">{zone.name}</h3>
            <span className="text-xs text-gray-400">
              Tier {zone.tier} | {TIER_LABELS[zone.tier]}
            </span>
          </div>
          {isContested && (
            <span className="text-sm bg-red-600/20 text-red-300 px-3 py-1 rounded-full border border-red-500/30">
              GOVERNANCE CONTESTED
            </span>
          )}
        </div>

        {/* Governor info */}
        <div className="mt-3 text-sm">
          {zone.governor ? (
            <div className="text-gray-300">
              Governor:{' '}
              <span className={isGoverned ? 'text-yellow-300 font-semibold' : 'text-white font-medium'}>
                {isGoverned ? `${zone.governor.companyName} (You)` : zone.governor.companyName}
              </span>
              <span className="text-gray-500 ml-2">
                ({zone.governor.sharePct.toFixed(1)}% influence)
              </span>
            </div>
          ) : (
            <span className="text-gray-500">No Governor - unclaimed territory</span>
          )}
        </div>

        {/* Challenge info */}
        {zone.challenge && (
          <div className="mt-2 bg-red-900/20 rounded p-2 border border-red-500/20 text-sm">
            <p className="text-red-300">
              Challenger: <span className="font-medium text-red-200">{zone.challenge.challengerName}</span>
            </p>
            <p className="text-red-400/80 text-xs mt-1">
              {zone.challenge.hoursRemaining.toFixed(1)} hours remaining in challenge period
            </p>
          </div>
        )}
      </div>

      {/* Influence Leaderboard */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
        <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">
          Influence Leaderboard
        </h4>
        {zone.topInfluencers.length === 0 ? (
          <p className="text-sm text-gray-500">No players have influence in this zone yet.</p>
        ) : (
          <div className="space-y-2">
            {zone.topInfluencers.map((inf, i) => (
              <div
                key={inf.profileId || i}
                className="flex items-center gap-3"
              >
                <span className="text-xs text-gray-500 w-5 text-right">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-white truncate">
                      {inf.companyName}
                    </span>
                    {inf.allianceTag && (
                      <span className="text-[10px] text-blue-400">[{inf.allianceTag}]</span>
                    )}
                    {STATUS_BADGES[inf.status] && (
                      <span className={`text-[10px] px-1 py-0.5 rounded border ${STATUS_BADGES[inf.status].className}`}>
                        {STATUS_BADGES[inf.status].label}
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, inf.sharePct * 1.67)}%`, // Scale so 60% fills the bar
                        backgroundColor: zone.accentColor,
                        opacity: 0.5 + (inf.sharePct / 100) * 0.5,
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm text-gray-300 font-medium w-14 text-right shrink-0">
                  {inf.sharePct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 text-xs text-gray-500">
          {zone.totalParticipants} total participant{zone.totalParticipants !== 1 ? 's' : ''} | {formatIp(zone.totalIp)} total IP
        </div>
      </div>

      {/* Your Influence Breakdown */}
      {zone.myInfluence && zone.myInfluence.sharePct > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
          <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">
            Your Influence
          </h4>
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl font-bold text-white">{myIp.toFixed(0)} IP</span>
            <span className="text-lg text-gray-300">{myShare.toFixed(1)}% share</span>
          </div>

          {/* Your influence bar vs governor */}
          {zone.governor && !isGoverned && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>You: {myShare.toFixed(1)}%</span>
                <span>Governor: {zone.governor.sharePct.toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden flex">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${(myShare / Math.max(myShare + zone.governor.sharePct, 1)) * 100}%`,
                    backgroundColor: zone.accentColor,
                  }}
                />
                <div
                  className="h-full bg-yellow-500/60 transition-all duration-500"
                  style={{
                    width: `${(zone.governor.sharePct / Math.max(myShare + zone.governor.sharePct, 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Challenge button */}
          {canChallenge && (
            <button
              onClick={() => onChallenge(zone.zoneId)}
              disabled={challengeLoading}
              className="w-full mt-2 py-2 px-4 bg-red-600/30 hover:bg-red-600/50 text-red-300
                         border border-red-500/40 rounded-lg text-sm font-medium transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {challengeLoading ? 'Initiating...' : 'Challenge Governor (72h)'}
            </button>
          )}
          {challengeMessage && (
            <p className={`text-xs mt-2 ${challengeMessage.includes('initiated') ? 'text-green-400' : 'text-red-400'}`}>
              {challengeMessage}
            </p>
          )}
        </div>
      )}

      {/* Governor Benefits */}
      {isGoverned && (
        <div className="bg-yellow-900/10 rounded-lg p-4 border border-yellow-500/20">
          <h4 className="text-sm font-semibold text-yellow-300 mb-3 uppercase tracking-wider">
            Governor Benefits (Active)
          </h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2 text-gray-300">
              <span className="text-yellow-400 shrink-0">Tax</span>
              <span>2% of zone service revenue (game-generated bonus)</span>
            </li>
            <li className="flex items-start gap-2 text-gray-300">
              <span className="text-yellow-400 shrink-0">Services</span>
              <span>+5% to your service revenue in this zone</span>
            </li>
            <li className="flex items-start gap-2 text-gray-300">
              <span className="text-yellow-400 shrink-0">Title</span>
              <span>&quot;{zone.name} Governor&quot; on your profile</span>
            </li>
            <li className="flex items-start gap-2 text-gray-300">
              <span className="text-yellow-400 shrink-0">Naming</span>
              <span>Set a custom name for the zone</span>
            </li>
          </ul>
        </div>
      )}

      {/* Sub-Zones */}
      {zone.subZones.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
          <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">
            Sub-Zones
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {zone.subZones.map(sz => (
              <div
                key={sz.subZoneId}
                className="rounded bg-gray-700/30 p-3 border border-gray-600/20"
              >
                <p className="text-sm font-medium text-white">{sz.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sz.activityFocus}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
