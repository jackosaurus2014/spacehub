export interface MissionPhase {
  id: string;
  name: string;
  description: string;
  typicalTPlus: number; // Seconds after T-0
  icon: string;
}

export const STANDARD_PHASES: MissionPhase[] = [
  { id: 'pre_launch', name: 'Pre-Launch', description: 'Vehicle on pad, systems check', typicalTPlus: -3600, icon: '🔧' },
  { id: 'fueling', name: 'Fueling', description: 'Propellant loading', typicalTPlus: -2400, icon: '⛽' },
  { id: 'terminal_count', name: 'Terminal Count', description: 'Final countdown sequence', typicalTPlus: -600, icon: '⏱️' },
  { id: 'ignition', name: 'Ignition', description: 'Engine ignition and liftoff', typicalTPlus: 0, icon: '🔥' },
  { id: 'max_q', name: 'Max-Q', description: 'Maximum dynamic pressure', typicalTPlus: 72, icon: '💨' },
  { id: 'meco', name: 'MECO', description: 'Main engine cutoff', typicalTPlus: 162, icon: '✂️' },
  { id: 'stage_sep', name: 'Stage Separation', description: 'First and second stage separation', typicalTPlus: 165, icon: '🔗' },
  { id: 'ses', name: 'SES', description: 'Second engine start', typicalTPlus: 170, icon: '🚀' },
  { id: 'fairing_sep', name: 'Fairing Sep', description: 'Payload fairing separation', typicalTPlus: 210, icon: '🛡️' },
  { id: 'seco', name: 'SECO', description: 'Second engine cutoff', typicalTPlus: 510, icon: '⏹️' },
  { id: 'payload_deploy', name: 'Payload Deploy', description: 'Payload deployment', typicalTPlus: 960, icon: '🛰️' },
  { id: 'booster_landing', name: 'Booster Landing', description: 'First stage landing', typicalTPlus: 510, icon: '🎯' },
  { id: 'mission_complete', name: 'Mission Complete', description: 'Mission objectives achieved', typicalTPlus: 3600, icon: '✅' },
];

/**
 * Get the current mission phase based on mission elapsed time (T+ seconds).
 */
export function getCurrentPhase(missionTimeSeconds: number): MissionPhase {
  // Find the latest phase whose typicalTPlus has been reached
  let currentPhase = STANDARD_PHASES[0];

  for (const phase of STANDARD_PHASES) {
    if (missionTimeSeconds >= phase.typicalTPlus) {
      currentPhase = phase;
    }
  }

  return currentPhase;
}

/**
 * Get the current phase, its progress, and the next phase.
 */
export function getPhaseProgress(missionTimeSeconds: number): {
  currentPhase: MissionPhase;
  progress: number;
  nextPhase: MissionPhase | null;
} {
  const sortedPhases = [...STANDARD_PHASES].sort((a, b) => a.typicalTPlus - b.typicalTPlus);

  let currentIndex = 0;
  for (let i = 0; i < sortedPhases.length; i++) {
    if (missionTimeSeconds >= sortedPhases[i].typicalTPlus) {
      currentIndex = i;
    }
  }

  const currentPhase = sortedPhases[currentIndex];
  const nextPhase = currentIndex < sortedPhases.length - 1 ? sortedPhases[currentIndex + 1] : null;

  let progress = 1;
  if (nextPhase) {
    const phaseDuration = nextPhase.typicalTPlus - currentPhase.typicalTPlus;
    const elapsed = missionTimeSeconds - currentPhase.typicalTPlus;
    progress = Math.min(1, Math.max(0, elapsed / phaseDuration));
  }

  return { currentPhase, progress, nextPhase };
}

/**
 * Format mission time as T+HH:MM:SS or T-HH:MM:SS
 */
export function formatMissionTime(seconds: number): string {
  const sign = seconds < 0 ? '-' : '+';
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = Math.floor(abs % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');

  if (h > 0) {
    return `T${sign}${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `T${sign}${pad(m)}:${pad(s)}`;
}
