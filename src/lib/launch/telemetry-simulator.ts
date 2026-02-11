import { getCurrentPhase } from './mission-phases';

export interface TelemetryPoint {
  missionTime: number; // T+ seconds
  altitude: number; // km
  velocity: number; // km/s
  downrange: number; // km
  acceleration: number; // g
  throttle: number; // 0-100%
  latitude: number;
  longitude: number;
  phase: string;
  dynamicPressure: number; // kPa
  fuelRemaining: number; // 0-100%
  stageStatus: 'attached' | 'separated' | 'landing' | 'landed';
  fairingStatus: 'attached' | 'separated';
  isMaxQ: boolean;
}

// Cape Canaveral launch site coordinates
const LAUNCH_LAT = 28.5623;
const LAUNCH_LON = -80.5774;

/**
 * Generate a realistic telemetry data point for a given mission elapsed time.
 * Based on a typical Falcon 9 orbital launch profile.
 *
 * Key milestones:
 *   T+0 to T+162:  First stage burn
 *     - Altitude: 0 -> ~80 km
 *     - Velocity: 0 -> ~2.3 km/s
 *     - Downrange: 0 -> ~100 km
 *   T+162 to T+165: Stage separation (coast)
 *   T+165 to T+510: Second stage burn
 *     - Altitude: 80 km -> ~250 km
 *     - Velocity: 2.3 -> ~7.8 km/s
 *     - Downrange: 100 km -> ~2000 km
 *   T+510+: Orbital coast / payload deploy
 */
export function generateTelemetryPoint(
  missionTimeSeconds: number,
  _vehicleType: string = 'falcon9'
): TelemetryPoint {
  const t = missionTimeSeconds;
  const phase = getCurrentPhase(t);

  // Add small noise for realism
  const noise = (amplitude: number) => (Math.random() - 0.5) * amplitude;

  let altitude = 0;
  let velocity = 0;
  let downrange = 0;
  let acceleration = 0;
  let throttle = 0;
  let latitude = LAUNCH_LAT;
  let longitude = LAUNCH_LON;

  let dynamicPressure = 0;
  let fuelRemaining = 100;
  let stageStatus: TelemetryPoint['stageStatus'] = 'attached';
  let fairingStatus: TelemetryPoint['fairingStatus'] = 'attached';
  let isMaxQ = false;

  if (t < 0) {
    // Pre-launch: everything at zero
    altitude = 0;
    velocity = 0;
    downrange = 0;
    acceleration = 0;
    throttle = t > -10 ? 100 : 0; // Engine ramp in final 10 seconds
    latitude = LAUNCH_LAT;
    longitude = LAUNCH_LON;
    fuelRemaining = 100;
  } else if (t <= 162) {
    // First stage burn
    // Altitude: quadratic ramp to ~80 km
    const tNorm = t / 162;
    altitude = 80 * (tNorm * tNorm * 0.3 + tNorm * 0.7) + noise(0.5);

    // Velocity: ~0 to ~2.3 km/s (builds up with thrust)
    velocity = 2.3 * tNorm * (0.5 + 0.5 * tNorm) + noise(0.02);

    // Downrange: cubic growth
    downrange = 100 * tNorm * tNorm * tNorm + noise(0.3);

    // Acceleration: starts ~1.3g, ramps to ~3.5g as fuel burns off
    acceleration = 1.3 + 2.2 * tNorm + noise(0.05);

    // Throttle: full except around Max-Q (~T+60-80)
    if (t >= 50 && t <= 80) {
      throttle = 70 + noise(2); // Throttle down for Max-Q
    } else {
      throttle = 100 + noise(1);
    }

    // Trajectory: heading east from Cape Canaveral
    latitude = LAUNCH_LAT + tNorm * 2 + noise(0.01);
    longitude = LAUNCH_LON + tNorm * 5 + noise(0.01);

    // Dynamic pressure: peaks ~35 kPa at T+72s (Max-Q)
    const qPeak = 35;
    const qSigma = 25;
    dynamicPressure = qPeak * Math.exp(-0.5 * Math.pow((t - 72) / qSigma, 2)) + noise(0.3);
    dynamicPressure = Math.max(0, dynamicPressure);

    // Max-Q detection (within 5 seconds of peak)
    isMaxQ = t >= 67 && t <= 77;

    // Fuel remaining: S1 100% -> 0% by MECO (T+162)
    fuelRemaining = Math.max(0, 100 * (1 - tNorm)) + noise(0.2);
    stageStatus = 'attached';
    fairingStatus = 'attached';
  } else if (t <= 165) {
    // Stage separation - brief coast
    altitude = 80 + (t - 162) * 0.5 + noise(0.3);
    velocity = 2.3 + noise(0.01);
    downrange = 100 + (t - 162) * 2 + noise(0.2);
    acceleration = 0 + noise(0.1);
    throttle = 0;
    latitude = LAUNCH_LAT + 2 + noise(0.01);
    longitude = LAUNCH_LON + 5 + noise(0.01);
    dynamicPressure = 0;
    fuelRemaining = 0;
    stageStatus = 'separated';
    fairingStatus = 'attached';
  } else if (t <= 510) {
    // Second stage burn
    const t2 = t - 165;
    const t2Norm = t2 / (510 - 165);

    // Altitude: 80 km -> 250 km
    altitude = 80 + 170 * t2Norm + noise(0.5);

    // Velocity: 2.3 -> 7.8 km/s
    velocity = 2.3 + 5.5 * t2Norm + noise(0.02);

    // Downrange: 100 -> 2000 km
    downrange = 100 + 1900 * t2Norm * (0.3 + 0.7 * t2Norm) + noise(1);

    // Acceleration: starts ~0.8g, ramps to ~3g
    acceleration = 0.8 + 2.2 * t2Norm + noise(0.05);

    // Throttle: full
    throttle = 100 + noise(1);

    // Continue heading east
    latitude = LAUNCH_LAT + 2 + t2Norm * 10 + noise(0.02);
    longitude = LAUNCH_LON + 5 + t2Norm * 30 + noise(0.02);

    // Dynamic pressure: negligible in upper atmosphere
    dynamicPressure = Math.max(0, 0.5 * (1 - t2Norm) + noise(0.05));

    // Fuel remaining: S2 resets to 100% at T+170, burns to ~15% by SECO
    fuelRemaining = Math.max(0, 100 * (1 - t2Norm * 0.85)) + noise(0.2);

    // Stage statuses
    stageStatus = t >= 480 ? 'landing' : 'separated';
    fairingStatus = t >= 210 ? 'separated' : 'attached';
  } else {
    // Orbital coast / payload deployment
    const tCoast = t - 510;
    const coastNorm = Math.min(1, tCoast / 3600);

    altitude = 250 + Math.sin(coastNorm * Math.PI * 2) * 5 + noise(0.2);
    velocity = 7.8 + Math.sin(coastNorm * Math.PI * 2) * 0.05 + noise(0.005);
    downrange = 2000 + tCoast * 7.8 + noise(2);
    acceleration = 0 + noise(0.01);
    throttle = 0;

    // Orbital trajectory (simplified)
    latitude = LAUNCH_LAT + 12 + coastNorm * 20 * Math.sin(coastNorm * Math.PI) + noise(0.05);
    longitude = LAUNCH_LON + 35 + coastNorm * 60 + noise(0.05);

    dynamicPressure = 0;
    fuelRemaining = Math.max(0, 15 * (1 - coastNorm * 0.3)) + noise(0.1);
    stageStatus = tCoast < 30 ? 'landing' : 'landed';
    fairingStatus = 'separated';
  }

  // Clamp values to reasonable ranges
  altitude = Math.max(0, altitude);
  velocity = Math.max(0, velocity);
  downrange = Math.max(0, downrange);
  throttle = Math.max(0, Math.min(100, throttle));
  fuelRemaining = Math.max(0, Math.min(100, fuelRemaining));
  dynamicPressure = Math.max(0, dynamicPressure);

  return {
    missionTime: t,
    altitude: Math.round(altitude * 100) / 100,
    velocity: Math.round(velocity * 1000) / 1000,
    downrange: Math.round(downrange * 100) / 100,
    acceleration: Math.round(acceleration * 100) / 100,
    throttle: Math.round(throttle * 10) / 10,
    latitude: Math.round(latitude * 10000) / 10000,
    longitude: Math.round(longitude * 10000) / 10000,
    phase: phase.id,
    dynamicPressure: Math.round(dynamicPressure * 100) / 100,
    fuelRemaining: Math.round(fuelRemaining * 10) / 10,
    stageStatus,
    fairingStatus,
    isMaxQ,
  };
}

/**
 * Get noise-free canonical telemetry values for a given mission time.
 * Useful for plotting "nominal profile" overlays.
 */
export function getTypicalProfile(missionTimeSec: number): Pick<TelemetryPoint, 'altitude' | 'velocity' | 'downrange' | 'acceleration' | 'dynamicPressure'> {
  const t = missionTimeSec;

  if (t < 0) {
    return { altitude: 0, velocity: 0, downrange: 0, acceleration: 0, dynamicPressure: 0 };
  }

  if (t <= 162) {
    const tNorm = t / 162;
    return {
      altitude: Math.round(80 * (tNorm * tNorm * 0.3 + tNorm * 0.7) * 100) / 100,
      velocity: Math.round(2.3 * tNorm * (0.5 + 0.5 * tNorm) * 1000) / 1000,
      downrange: Math.round(100 * tNorm * tNorm * tNorm * 100) / 100,
      acceleration: Math.round((1.3 + 2.2 * tNorm) * 100) / 100,
      dynamicPressure: Math.round(35 * Math.exp(-0.5 * Math.pow((t - 72) / 25, 2)) * 100) / 100,
    };
  }

  if (t <= 165) {
    return {
      altitude: Math.round((80 + (t - 162) * 0.5) * 100) / 100,
      velocity: 2.3,
      downrange: Math.round((100 + (t - 162) * 2) * 100) / 100,
      acceleration: 0,
      dynamicPressure: 0,
    };
  }

  if (t <= 510) {
    const t2Norm = (t - 165) / (510 - 165);
    return {
      altitude: Math.round((80 + 170 * t2Norm) * 100) / 100,
      velocity: Math.round((2.3 + 5.5 * t2Norm) * 1000) / 1000,
      downrange: Math.round((100 + 1900 * t2Norm * (0.3 + 0.7 * t2Norm)) * 100) / 100,
      acceleration: Math.round((0.8 + 2.2 * t2Norm) * 100) / 100,
      dynamicPressure: Math.round(0.5 * (1 - t2Norm) * 100) / 100,
    };
  }

  return {
    altitude: 250,
    velocity: 7.8,
    downrange: Math.round((2000 + (t - 510) * 7.8) * 100) / 100,
    acceleration: 0,
    dynamicPressure: 0,
  };
}

/**
 * Generate a batch of telemetry points for a time range.
 */
export function generateTelemetryBatch(
  startTime: number,
  endTime: number,
  intervalSeconds: number = 1,
  vehicleType: string = 'falcon9'
): TelemetryPoint[] {
  const points: TelemetryPoint[] = [];
  for (let t = startTime; t <= endTime; t += intervalSeconds) {
    points.push(generateTelemetryPoint(t, vehicleType));
  }
  return points;
}
