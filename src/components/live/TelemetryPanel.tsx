'use client';

import { useState, useEffect, useCallback } from 'react';

interface TelemetryData {
  altitude: number; // km
  velocity: number; // m/s
  acceleration: number; // m/s^2
  status: string;
  missionElapsedTime: number; // seconds
  stage: number;
  maxQ: boolean;
  mecoComplete: boolean;
  stageSeparation: boolean;
  fairingSeparation: boolean;
  secondEngineCutoff: boolean;
  orbitInsertion: boolean;
}

type MissionPhase = 'pre-launch' | 'countdown' | 'launch' | 'max-q' | 'meco' | 'stage-sep' | 'second-stage' | 'fairing-sep' | 'seco' | 'orbit' | 'complete';

interface TelemetryPanelProps {
  isLive: boolean;
  scheduledTime: string;
}

export default function TelemetryPanel({ isLive, scheduledTime }: TelemetryPanelProps) {
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    altitude: 0,
    velocity: 0,
    acceleration: 0,
    status: 'Pre-Launch',
    missionElapsedTime: -300, // T-5:00
    stage: 1,
    maxQ: false,
    mecoComplete: false,
    stageSeparation: false,
    fairingSeparation: false,
    secondEngineCutoff: false,
    orbitInsertion: false,
  });

  const [missionPhase, setMissionPhase] = useState<MissionPhase>('pre-launch');

  // Simulate telemetry based on mission elapsed time
  const updateTelemetry = useCallback(() => {
    setTelemetry((prev) => {
      const met = prev.missionElapsedTime + 1;
      let altitude = prev.altitude;
      let velocity = prev.velocity;
      let acceleration = prev.acceleration;
      let status = prev.status;
      let stage = prev.stage;
      let maxQ = prev.maxQ;
      let mecoComplete = prev.mecoComplete;
      let stageSeparation = prev.stageSeparation;
      let fairingSeparation = prev.fairingSeparation;
      let secondEngineCutoff = prev.secondEngineCutoff;
      let orbitInsertion = prev.orbitInsertion;

      // Pre-launch / countdown phase
      if (met < 0) {
        status = met < -10 ? 'Final Countdown' : 'Engine Ignition';
        setMissionPhase(met < -10 ? 'countdown' : 'countdown');
      }
      // Liftoff to Max-Q (T+0 to T+80)
      else if (met >= 0 && met < 80) {
        status = 'Ascent - First Stage';
        altitude = Math.min(met * 0.15, 12); // ~12km at Max-Q
        velocity = met * 45 + Math.random() * 20; // Accelerating to ~3600 m/s
        acceleration = 25 + Math.sin(met * 0.1) * 5 + Math.random() * 2;
        stage = 1;
        setMissionPhase('launch');
        if (met > 60) {
          maxQ = true;
          status = 'Max-Q';
          setMissionPhase('max-q');
        }
      }
      // Max-Q to MECO (T+80 to T+160)
      else if (met >= 80 && met < 160) {
        status = 'First Stage Burn';
        altitude = 12 + (met - 80) * 0.5; // ~52km at MECO
        velocity = 3600 + (met - 80) * 35; // ~6400 m/s at MECO
        acceleration = 30 + (met - 80) * 0.2 + Math.random() * 3;
        maxQ = true;
        setMissionPhase('meco');
        if (met > 155) {
          status = 'MECO - Main Engine Cutoff';
          mecoComplete = true;
        }
      }
      // Stage separation (T+160 to T+165)
      else if (met >= 160 && met < 165) {
        status = 'Stage Separation';
        mecoComplete = true;
        stageSeparation = true;
        altitude = 52 + (met - 160) * 2;
        velocity = 6400 + (met - 160) * 50;
        acceleration = 5 + Math.random() * 5; // Coasting
        setMissionPhase('stage-sep');
      }
      // Second stage ignition (T+165 to T+400)
      else if (met >= 165 && met < 400) {
        status = 'Second Stage Burn';
        stage = 2;
        stageSeparation = true;
        altitude = 60 + (met - 165) * 0.7; // ~225km by SECO
        velocity = 6600 + (met - 165) * 12; // ~9400 m/s at SECO
        acceleration = 15 + Math.sin((met - 165) * 0.05) * 3 + Math.random() * 2;
        setMissionPhase('second-stage');

        // Fairing separation around T+200
        if (met > 200) {
          fairingSeparation = true;
          if (met < 210) {
            status = 'Fairing Separation';
            setMissionPhase('fairing-sep');
          }
        }
      }
      // SECO (T+400 to T+420)
      else if (met >= 400 && met < 420) {
        status = 'SECO - Second Engine Cutoff';
        stage = 2;
        secondEngineCutoff = true;
        fairingSeparation = true;
        altitude = 225 + (met - 400) * 1.5;
        velocity = 9400 - (met - 400) * 10; // Slight deceleration
        acceleration = -2 + Math.random() * 1;
        setMissionPhase('seco');
      }
      // Orbit insertion / mission complete (T+420+)
      else if (met >= 420) {
        status = 'Orbit Insertion Complete';
        stage = 2;
        secondEngineCutoff = true;
        fairingSeparation = true;
        orbitInsertion = true;
        altitude = 250 + Math.sin(met * 0.01) * 5; // Stable orbit ~250km
        velocity = 7800 + Math.sin(met * 0.02) * 50; // Orbital velocity
        acceleration = 0;
        setMissionPhase('orbit');

        if (met > 600) {
          status = 'Nominal Orbit Achieved';
          setMissionPhase('complete');
        }
      }

      return {
        ...prev,
        missionElapsedTime: met,
        altitude,
        velocity,
        acceleration,
        status,
        stage,
        maxQ,
        mecoComplete,
        stageSeparation,
        fairingSeparation,
        secondEngineCutoff,
        orbitInsertion,
      };
    });
  }, []);

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(updateTelemetry, 1000);
    return () => clearInterval(interval);
  }, [isLive, updateTelemetry]);

  // Format MET display
  const formatMET = (seconds: number): string => {
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = Math.floor(absSeconds % 60);
    const sign = seconds < 0 ? '-' : '+';
    return `T${sign}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (missionPhase === 'complete' || missionPhase === 'orbit') return 'text-green-400';
    if (missionPhase === 'max-q') return 'text-orange-400';
    if (missionPhase === 'stage-sep') return 'text-yellow-400';
    return 'text-cyan-400';
  };

  return (
    <div className="bg-gradient-to-br from-space-900/95 via-space-800/95 to-space-900/95 rounded-xl border border-slate-700/50 overflow-hidden" role="region" aria-label="Live telemetry data">
      <span className="sr-only">
        {`Telemetry: ${telemetry.status}, mission elapsed time ${formatMET(telemetry.missionElapsedTime)}, altitude ${telemetry.altitude.toFixed(1)} km, velocity ${telemetry.velocity.toFixed(0)} m/s, acceleration ${telemetry.acceleration.toFixed(1)} m/s squared, stage ${telemetry.stage}. Milestones: Max-Q ${telemetry.maxQ ? 'complete' : 'pending'}, MECO ${telemetry.mecoComplete ? 'complete' : 'pending'}, stage separation ${telemetry.stageSeparation ? 'complete' : 'pending'}, fairing separation ${telemetry.fairingSeparation ? 'complete' : 'pending'}, SECO ${telemetry.secondEngineCutoff ? 'complete' : 'pending'}, orbit insertion ${telemetry.orbitInsertion ? 'complete' : 'pending'}.`}
      </span>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 bg-space-800/50">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Live Telemetry
          </h3>
          {isLive && (
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              LIVE
            </span>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-3 border-b border-slate-700/30 bg-space-800/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Mission Status</div>
            <div className={`text-lg font-bold ${getStatusColor()}`}>{telemetry.status}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">MET</div>
            <div className="text-2xl font-display font-bold text-white tracking-wider">
              {formatMET(telemetry.missionElapsedTime)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Telemetry Grid */}
      <div className="p-4 grid grid-cols-2 gap-4">
        {/* Altitude */}
        <div className="bg-space-800/50 rounded-lg p-3 border border-slate-700/30">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
            <span className="text-slate-400 text-xs uppercase tracking-wider">Altitude</span>
          </div>
          <div className="text-2xl font-display font-bold text-white">
            {telemetry.altitude.toFixed(1)}
            <span className="text-slate-400 text-sm ml-1">km</span>
          </div>
        </div>

        {/* Velocity */}
        <div className="bg-space-800/50 rounded-lg p-3 border border-slate-700/30">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-slate-400 text-xs uppercase tracking-wider">Velocity</span>
          </div>
          <div className="text-2xl font-display font-bold text-white">
            {telemetry.velocity.toFixed(0)}
            <span className="text-slate-400 text-sm ml-1">m/s</span>
          </div>
        </div>

        {/* Acceleration */}
        <div className="bg-space-800/50 rounded-lg p-3 border border-slate-700/30">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-slate-400 text-xs uppercase tracking-wider">Acceleration</span>
          </div>
          <div className="text-2xl font-display font-bold text-white">
            {telemetry.acceleration.toFixed(1)}
            <span className="text-slate-400 text-sm ml-1">m/s<sup>2</sup></span>
          </div>
        </div>

        {/* Active Stage */}
        <div className="bg-space-800/50 rounded-lg p-3 border border-slate-700/30">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span className="text-slate-400 text-xs uppercase tracking-wider">Stage</span>
          </div>
          <div className="text-2xl font-display font-bold text-white">
            Stage {telemetry.stage}
          </div>
        </div>
      </div>

      {/* Stage Indicators */}
      <div className="px-4 pb-4">
        <div className="text-slate-400 text-xs uppercase tracking-wider mb-3">Mission Milestones</div>
        <div className="grid grid-cols-3 gap-2">
          <div className={`p-2 rounded-lg text-center text-xs font-medium transition-colors ${
            telemetry.maxQ
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/30'
          }`}>
            Max-Q
          </div>
          <div className={`p-2 rounded-lg text-center text-xs font-medium transition-colors ${
            telemetry.mecoComplete
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/30'
          }`}>
            MECO
          </div>
          <div className={`p-2 rounded-lg text-center text-xs font-medium transition-colors ${
            telemetry.stageSeparation
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/30'
          }`}>
            Stage Sep
          </div>
          <div className={`p-2 rounded-lg text-center text-xs font-medium transition-colors ${
            telemetry.fairingSeparation
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/30'
          }`}>
            Fairing Sep
          </div>
          <div className={`p-2 rounded-lg text-center text-xs font-medium transition-colors ${
            telemetry.secondEngineCutoff
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/30'
          }`}>
            SECO
          </div>
          <div className={`p-2 rounded-lg text-center text-xs font-medium transition-colors ${
            telemetry.orbitInsertion
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/30'
          }`}>
            Orbit
          </div>
        </div>
      </div>

      {/* Data disclaimer */}
      {!isLive && (
        <div className="px-4 pb-4">
          <div className="text-slate-400 text-xs text-center bg-slate-800/30 rounded-lg p-2">
            Telemetry will display when stream goes live
          </div>
        </div>
      )}
    </div>
  );
}
