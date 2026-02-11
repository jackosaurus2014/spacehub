export interface MissionPhase {
  id: string;
  name: string;
  description: string;
  detailedDescription: string;
  typicalTPlus: number; // Seconds after T-0
  icon: string;
}

export const STANDARD_PHASES: MissionPhase[] = [
  {
    id: 'pre_launch', name: 'Pre-Launch', description: 'Vehicle on pad, systems check', typicalTPlus: -3600, icon: '🔧',
    detailedDescription: 'The launch vehicle is vertical on the pad. Ground crews perform final inspections, range safety checks, and verify all telemetry links. Weather balloons are launched to check upper-level winds.',
  },
  {
    id: 'fueling', name: 'Fueling', description: 'Propellant loading', typicalTPlus: -2400, icon: '⛽',
    detailedDescription: 'RP-1 kerosene and liquid oxygen (LOX) are loaded into the first and second stages. LOX loading continues until just before launch due to boil-off. The strongback retracts to launch position.',
  },
  {
    id: 'terminal_count', name: 'Terminal Count', description: 'Final countdown sequence', typicalTPlus: -600, icon: '⏱️',
    detailedDescription: 'Automated launch sequence begins. Flight computers take over countdown. Final range safety checks, propellant pressurization, and engine chill procedures are completed. Launch director polls all stations for GO.',
  },
  {
    id: 'ignition', name: 'Ignition', description: 'Engine ignition and liftoff', typicalTPlus: 0, icon: '🔥',
    detailedDescription: 'Nine Merlin 1D engines ignite generating 1.7 million pounds of thrust. The vehicle is released from hold-down clamps at T+0 and begins its ascent. The vehicle clears the tower within seconds.',
  },
  {
    id: 'max_q', name: 'Max-Q', description: 'Maximum dynamic pressure', typicalTPlus: 72, icon: '💨',
    detailedDescription: 'The vehicle passes through the region of maximum aerodynamic stress at approximately 35 kPa. Engines throttle down to ~70% to reduce structural loads, then throttle back up after passing through Max-Q.',
  },
  {
    id: 'meco', name: 'MECO', description: 'Main engine cutoff', typicalTPlus: 162, icon: '✂️',
    detailedDescription: 'All nine first-stage engines shut down after accelerating the vehicle to approximately 2.3 km/s. The first stage has burned through most of its propellant. Brief coast phase begins before stage separation.',
  },
  {
    id: 'stage_sep', name: 'Stage Separation', description: 'First and second stage separation', typicalTPlus: 165, icon: '🔗',
    detailedDescription: 'Pneumatic pushers separate the first and second stages. Cold gas thrusters orient the first stage for its return journey. The interstage separates cleanly, allowing the second stage engine to ignite safely.',
  },
  {
    id: 'ses', name: 'SES', description: 'Second engine start', typicalTPlus: 170, icon: '🚀',
    detailedDescription: 'The single Merlin Vacuum engine ignites in the near-vacuum of space. Its extended nozzle is optimized for vacuum operation, producing 981 kN of thrust. This burn will place the payload into its target orbit.',
  },
  {
    id: 'fairing_sep', name: 'Fairing Sep', description: 'Payload fairing separation', typicalTPlus: 210, icon: '🛡️',
    detailedDescription: 'The two halves of the payload fairing separate and fall away, exposing the payload to space. The fairing is no longer needed as the vehicle is above the sensible atmosphere. Fairings may be recovered by ships at sea.',
  },
  {
    id: 'seco', name: 'SECO', description: 'Second engine cutoff', typicalTPlus: 510, icon: '⏹️',
    detailedDescription: 'The second stage engine shuts down after achieving the target orbital velocity of approximately 7.8 km/s. The payload is now in its target orbit at approximately 250 km altitude.',
  },
  {
    id: 'payload_deploy', name: 'Payload Deploy', description: 'Payload deployment', typicalTPlus: 960, icon: '🛰️',
    detailedDescription: 'The payload separates from the second stage adapter. Springs or motorized mechanisms push the satellite away from the rocket. The satellite deploys solar panels and begins its own mission.',
  },
  {
    id: 'booster_landing', name: 'Booster Landing', description: 'First stage landing', typicalTPlus: 510, icon: '🎯',
    detailedDescription: 'The first stage performs a series of burns: boostback burn to reverse trajectory, entry burn to slow down through the atmosphere, and a single-engine landing burn. Grid fins steer the booster to a precision landing on a drone ship or landing pad.',
  },
  {
    id: 'mission_complete', name: 'Mission Complete', description: 'Mission objectives achieved', typicalTPlus: 3600, icon: '✅',
    detailedDescription: 'All primary mission objectives have been achieved. The payload is confirmed in its target orbit with healthy telemetry. The first stage has been recovered (if applicable). Mission success declared.',
  },
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
