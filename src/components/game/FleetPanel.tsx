'use client';

import { useState, useCallback } from 'react';
import type { GameState } from '@/lib/game/types';
import { SHIPS, SHIP_MAP, getTravelTime, generateShipName } from '@/lib/game/ships';
import type { ShipInstance } from '@/lib/game/ships';
import { LOCATIONS, LOCATION_MAP } from '@/lib/game/solar-system';
import { RESOURCE_MAP } from '@/lib/game/resources';
import { formatMoney, formatCountdown, formatDuration } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';

interface FleetPanelProps {
  state: GameState;
  onBuildShip: (shipDefId: string, locationId: string) => void;
  onStartMining: (shipInstanceId: string, resourceId: string) => void;
  onStopMining: (shipInstanceId: string) => void;
  onStartTransport: (shipInstanceId: string, toLocation: string, cargo: Record<string, number>) => void;
}

export default function FleetPanel({ state, onBuildShip, onStartMining, onStopMining, onStartTransport }: FleetPanelProps) {
  const [selectedShipyard, setSelectedShipyard] = useState('earth_surface');
  const [selectedShip, setSelectedShip] = useState<string | null>(null);

  const ships = state.ships || [];
  const builtShips = ships.filter(s => s.isBuilt);
  const buildingShips = ships.filter(s => !s.isBuilt);

  // Available ships to build
  const availableShipDefs = SHIPS.filter(s =>
    s.requiredResearch.every(r => state.completedResearch.includes(r))
  );

  // Ship being viewed
  const selectedShipInstance = selectedShip ? ships.find(s => s.instanceId === selectedShip) : null;
  const selectedShipDef = selectedShipInstance ? SHIP_MAP.get(selectedShipInstance.definitionId) : null;

  return (
    <div className="space-y-4">
      {/* Fleet Overview */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-center">
          <p className="text-cyan-400 text-lg font-bold">{builtShips.length}</p>
          <p className="text-slate-500 text-xs">Active Ships</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
          <p className="text-amber-400 text-lg font-bold">{builtShips.filter(s => s.status === 'mining').length}</p>
          <p className="text-slate-500 text-xs">Mining</p>
        </div>
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-center">
          <p className="text-green-400 text-lg font-bold">{builtShips.filter(s => s.status === 'in_transit').length}</p>
          <p className="text-slate-500 text-xs">In Transit</p>
        </div>
      </div>

      {/* Active Ships */}
      {builtShips.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3">Your Fleet</h3>
          <div className="space-y-2">
            {builtShips.map(ship => {
              const def = SHIP_MAP.get(ship.definitionId);
              if (!def) return null;
              const loc = LOCATION_MAP.get(ship.currentLocation);
              const isSelected = selectedShip === ship.instanceId;

              return (
                <button
                  key={ship.instanceId}
                  onClick={() => { playSound('click'); setSelectedShip(isSelected ? null : ship.instanceId); }}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    isSelected
                      ? 'bg-cyan-500/10 border border-cyan-500/30'
                      : 'bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{def.icon}</span>
                      <div>
                        <p className="text-white text-xs font-medium">{ship.name}</p>
                        <p className="text-slate-500 text-[10px]">{def.name} · {loc?.name || ship.currentLocation}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        ship.status === 'mining' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        ship.status === 'in_transit' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        ship.status === 'idle' ? 'bg-white/[0.06] text-slate-400 border border-white/[0.06]' :
                        'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>
                        {ship.status === 'mining' ? '⛏️ Mining' :
                         ship.status === 'in_transit' ? '🚀 In Transit' :
                         ship.status === 'idle' ? '💤 Idle' :
                         ship.status}
                      </span>
                    </div>
                  </div>

                  {/* Mining progress */}
                  {ship.status === 'mining' && ship.miningOperation && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-amber-400 text-[10px]">Mining {ship.miningOperation.resourceId.replace(/_/g, ' ')}</span>
                      <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-1 bg-amber-500 rounded-full construction-pulse" style={{ width: '60%' }} />
                      </div>
                    </div>
                  )}

                  {/* Transit progress */}
                  {ship.status === 'in_transit' && ship.route && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <span className="text-slate-500">{LOCATION_MAP.get(ship.route.from)?.name} → {LOCATION_MAP.get(ship.route.to)?.name}</span>
                        <span className="text-green-400 font-mono">
                          {formatCountdown(Math.max(0, (ship.route.arrivalAtMs - Date.now()) / 1000))}
                        </span>
                      </div>
                      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-1 bg-green-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, ((Date.now() - ship.route.departedAtMs) / (ship.route.arrivalAtMs - ship.route.departedAtMs)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Ship Actions (when a ship is selected and idle or mining) */}
      {selectedShipInstance && selectedShipDef && (selectedShipInstance.status === 'idle' || selectedShipInstance.status === 'mining') && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <h3 className="text-white text-sm font-semibold mb-3">
            {selectedShipDef.icon} {selectedShipInstance.name} — Commands
          </h3>

          {/* Mining action (for idle mining ships) */}
          {selectedShipInstance.status === 'idle' && selectedShipDef.role === 'mining' && selectedShipDef.miningTargets && (
            <div className="mb-3">
              <p className="text-slate-400 text-xs mb-2">Start Mining ({selectedShipDef.miningRate} units/min):</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedShipDef.miningTargets.map(resId => (
                  <button
                    key={resId}
                    onClick={() => { playSound('build_start'); onStartMining(selectedShipInstance.instanceId, resId); setSelectedShip(null); }}
                    className="px-2.5 py-1 text-[10px] font-medium bg-amber-600/20 text-amber-400 border border-amber-600/30 rounded-lg hover:bg-amber-600/30 transition-colors"
                  >
                    ⛏️ Mine {resId.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stop mining (for mining ships) */}
          {selectedShipInstance.status === 'mining' && (
            <button
              onClick={() => { onStopMining(selectedShipInstance.instanceId); setSelectedShip(null); }}
              className="px-3 py-1.5 text-xs font-medium bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg hover:bg-red-600/30 transition-colors mb-3"
            >
              Stop Mining
            </button>
          )}

          {/* Transport action (for idle ships) */}
          {selectedShipInstance.status === 'idle' && <div>
            <p className="text-slate-400 text-xs mb-2">Send to location (capacity: {selectedShipDef.cargoCapacity} units):</p>
            <div className="flex flex-wrap gap-1.5">
              {state.unlockedLocations
                .filter(locId => locId !== selectedShipInstance.currentLocation)
                .map(locId => {
                  const loc = LOCATION_MAP.get(locId);
                  const travelTime = getTravelTime(selectedShipInstance.currentLocation, locId);
                  return (
                    <button
                      key={locId}
                      onClick={() => { playSound('build_start'); onStartTransport(selectedShipInstance.instanceId, locId, {}); setSelectedShip(null); }}
                      className="px-2.5 py-1 text-[10px] font-medium bg-green-600/20 text-green-400 border border-green-600/30 rounded-lg hover:bg-green-600/30 transition-colors"
                    >
                      🚀 {loc?.name} ({formatDuration(travelTime)})
                    </button>
                  );
                })}
            </div>
          </div>}
        </div>
      )}

      {/* Ships Under Construction */}
      {buildingShips.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h3 className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
            Under Construction ({buildingShips.length})
          </h3>
          {buildingShips.map(ship => {
            const def = SHIP_MAP.get(ship.definitionId);
            const elapsed = ship.buildStartedAtMs ? (Date.now() - ship.buildStartedAtMs) / 1000 : 0;
            const remaining = (ship.buildDurationSeconds || 0) - elapsed;
            return (
              <div key={ship.instanceId} className="flex items-center justify-between text-xs mb-1">
                <span className="text-white">{def?.icon} {ship.name}</span>
                <span className="text-amber-400 font-mono">{formatCountdown(Math.max(0, remaining))}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Build New Ships */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3">Build Ships</h3>
        {availableShipDefs.length === 0 ? (
          <p className="text-slate-500 text-xs">Research new technologies to unlock ship construction.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {availableShipDefs.map(ship => {
              const canAffordMoney = state.money >= ship.baseCost;
              const hasResources = Object.entries(ship.resourceCost).every(
                ([resId, qty]) => (state.resources[resId] || 0) >= qty
              );
              const canBuild = canAffordMoney && hasResources;

              return (
                <div key={ship.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{ship.icon}</span>
                    <div>
                      <h4 className="text-white text-xs font-semibold">{ship.name}</h4>
                      <span className={`text-[9px] px-1 py-0.5 rounded ${
                        ship.role === 'mining' ? 'bg-amber-500/10 text-amber-400' :
                        ship.role === 'transport' ? 'bg-green-500/10 text-green-400' :
                        ship.role === 'tanker' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-purple-500/10 text-purple-400'
                      }`}>{ship.role}</span>
                    </div>
                  </div>
                  <p className="text-slate-500 text-[10px] mb-2">{ship.description}</p>

                  {/* Stats */}
                  <div className="flex gap-3 text-[9px] text-slate-400 mb-2">
                    <span>Cargo: {ship.cargoCapacity}</span>
                    {ship.miningRate && <span>Mining: {ship.miningRate}/min</span>}
                    <span>{formatDuration(ship.buildTimeSeconds)}</span>
                  </div>

                  {/* Resource costs */}
                  {Object.keys(ship.resourceCost).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {Object.entries(ship.resourceCost).map(([resId, qty]) => {
                        const have = state.resources[resId] || 0;
                        return (
                          <span key={resId} className={`text-[8px] px-1 py-0.5 rounded border ${
                            have >= qty ? 'text-slate-400 border-white/[0.06]' : 'text-red-400 border-red-500/20'
                          }`}>{resId.replace(/_/g, ' ')} {have}/{qty}</span>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono ${canAffordMoney ? 'text-green-400' : 'text-red-400'}`}>
                      {formatMoney(ship.baseCost)}
                    </span>
                    <button
                      onClick={() => { playSound('build_start'); onBuildShip(ship.id, selectedShipyard); }}
                      disabled={!canBuild}
                      className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                        canBuild
                          ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                          : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      Build
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
