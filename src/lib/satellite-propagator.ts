/**
 * Simplified SGP4-lite satellite position propagator
 *
 * Uses TLE (Two-Line Element) data to compute approximate satellite positions.
 * This is a simplified circular-orbit approximation suitable for visualization
 * purposes. For mission-critical calculations, use a full SGP4 implementation.
 */

// ─── Constants ──────────────────────────────────────────────────────────────
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const EARTH_RADIUS_KM = 6371;
const EARTH_MU = 398600.4418; // km^3/s^2  (standard gravitational parameter)
const MINUTES_PER_DAY = 1440;
const SECONDS_PER_DAY = 86400;
const TWO_PI = 2 * Math.PI;
const J2000_EPOCH = Date.UTC(2000, 0, 1, 12, 0, 0); // J2000.0 in ms

// ─── Types ──────────────────────────────────────────────────────────────────
export interface TLEData {
  noradId: string;
  name: string;
  epoch: Date;
  /** Degrees */
  inclination: number;
  /** Right Ascension of Ascending Node (degrees) */
  raan: number;
  /** Eccentricity (dimensionless, 0-1) */
  eccentricity: number;
  /** Argument of Perigee (degrees) */
  argPerigee: number;
  /** Mean Anomaly (degrees) */
  meanAnomaly: number;
  /** Revolutions per day */
  meanMotion: number;
  /** Revolution number at epoch */
  revNumber: number;
  /** Raw TLE lines for reference */
  line1: string;
  line2: string;
}

export interface SatPosition {
  lat: number;
  lng: number;
  /** Altitude in km above mean sea level */
  altitude: number;
  /** Velocity in km/s */
  velocity: number;
}

// ─── TLE Epoch Parsing ──────────────────────────────────────────────────────
function parseTLEEpoch(epochStr: string): Date {
  // TLE epoch format: YYDDD.DDDDDDDD
  // YY = 2-digit year (00-56 = 2000-2056, 57-99 = 1957-1999)
  // DDD.DDDDDDDD = fractional day of year
  const yearStr = epochStr.substring(0, 2);
  const dayStr = epochStr.substring(2);

  let year = parseInt(yearStr, 10);
  year = year < 57 ? 2000 + year : 1900 + year;

  const dayOfYear = parseFloat(dayStr);
  const intDay = Math.floor(dayOfYear);
  const fracDay = dayOfYear - intDay;

  // Start of year
  const date = new Date(Date.UTC(year, 0, 1));
  // Add days (intDay is 1-based in TLE)
  date.setUTCDate(date.getUTCDate() + intDay - 1);
  // Add fractional day
  const msInDay = fracDay * SECONDS_PER_DAY * 1000;
  date.setTime(date.getTime() + msInDay);

  return date;
}

// ─── Parse TLE ──────────────────────────────────────────────────────────────
/**
 * Parse a Two-Line Element set into structured data.
 * Expects the standard TLE format (line1 starts with "1 ", line2 starts with "2 ").
 */
export function parseTLE(line1: string, line2: string, name?: string): TLEData {
  // Line 1 fields (column-based, 1-indexed in spec)
  const noradId = line1.substring(2, 7).trim();
  const epochStr = line1.substring(18, 32).trim();
  const epoch = parseTLEEpoch(epochStr);

  // Line 2 fields
  const inclination = parseFloat(line2.substring(8, 16).trim());
  const raan = parseFloat(line2.substring(17, 25).trim());
  // Eccentricity is stored as implied decimal: e.g. "0006703" -> 0.0006703
  const eccStr = line2.substring(26, 33).trim();
  const eccentricity = parseFloat('0.' + eccStr);
  const argPerigee = parseFloat(line2.substring(34, 42).trim());
  const meanAnomaly = parseFloat(line2.substring(43, 51).trim());
  const meanMotion = parseFloat(line2.substring(52, 63).trim());
  const revNumber = parseInt(line2.substring(63, 68).trim(), 10) || 0;

  return {
    noradId,
    name: name || `SAT-${noradId}`,
    epoch,
    inclination,
    raan,
    eccentricity,
    argPerigee,
    meanAnomaly,
    meanMotion,
    revNumber,
    line1,
    line2,
  };
}

// ─── Kepler Equation Solver ────────────────────────────────────────────────
/**
 * Solve Kepler's equation M = E - e*sin(E) for eccentric anomaly E
 * using Newton-Raphson iteration.
 */
function solveKepler(meanAnomalyRad: number, eccentricity: number): number {
  let E = meanAnomalyRad; // initial guess
  for (let i = 0; i < 20; i++) {
    const dE = (E - eccentricity * Math.sin(E) - meanAnomalyRad) /
               (1 - eccentricity * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

// ─── TLE to Lat/Lng ────────────────────────────────────────────────────────
/**
 * Convert TLE data to geographic latitude, longitude, and altitude at a given time.
 * Uses simplified orbital mechanics with Earth rotation for ground track.
 */
export function tleToLatLng(tle: TLEData, date?: Date): SatPosition {
  const now = date || new Date();

  // Compute semi-major axis from mean motion (rev/day -> rad/s)
  const n = (tle.meanMotion * TWO_PI) / SECONDS_PER_DAY; // rad/s
  const a = Math.pow(EARTH_MU / (n * n), 1 / 3); // km
  const altitude = a - EARTH_RADIUS_KM;

  // Time since epoch in seconds
  const dtSec = (now.getTime() - tle.epoch.getTime()) / 1000;

  // Mean anomaly at current time (rad)
  const M = (tle.meanAnomaly * DEG2RAD) + n * dtSec;
  const Mnorm = ((M % TWO_PI) + TWO_PI) % TWO_PI;

  // Solve Kepler's equation for eccentric anomaly
  const E = solveKepler(Mnorm, tle.eccentricity);

  // True anomaly
  const sinV = (Math.sqrt(1 - tle.eccentricity * tle.eccentricity) * Math.sin(E)) /
               (1 - tle.eccentricity * Math.cos(E));
  const cosV = (Math.cos(E) - tle.eccentricity) /
               (1 - tle.eccentricity * Math.cos(E));
  const trueAnomaly = Math.atan2(sinV, cosV);

  // Argument of latitude (angle from ascending node in orbital plane)
  const argLat = trueAnomaly + tle.argPerigee * DEG2RAD;

  // Geocentric latitude
  const lat = Math.asin(Math.sin(tle.inclination * DEG2RAD) * Math.sin(argLat));

  // Right ascension in ECI frame
  // Account for nodal precession (simplified J2 perturbation)
  const raanRad = tle.raan * DEG2RAD;

  // RAAN at current time (simplified precession)
  const j2 = 1.08263e-3;
  const raanDot = -1.5 * j2 * n * Math.pow(EARTH_RADIUS_KM / a, 2) *
                  Math.cos(tle.inclination * DEG2RAD);
  const currentRaan = raanRad + raanDot * dtSec;

  // Right ascension of satellite
  const raSat = Math.atan2(
    Math.cos(tle.inclination * DEG2RAD) * Math.sin(argLat),
    Math.cos(argLat)
  ) + currentRaan;

  // Greenwich Mean Sidereal Time (approximate)
  const jd = now.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;
  const gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
               0.000387933 * T * T;
  const gmstRad = ((gmst % 360 + 360) % 360) * DEG2RAD;

  // Geographic longitude
  let lng = (raSat - gmstRad) * RAD2DEG;
  lng = ((lng % 360) + 540) % 360 - 180; // Normalize to [-180, 180]

  // Orbital velocity (vis-viva for circular approximation)
  const velocity = Math.sqrt(EARTH_MU / a);

  return {
    lat: lat * RAD2DEG,
    lng,
    altitude: Math.max(altitude, 0),
    velocity,
  };
}

// ─── Orbit Ground Track ────────────────────────────────────────────────────
/**
 * Calculate orbit ground track positions over one full orbital period.
 * @param tle - TLE data
 * @param steps - Number of points to compute (default 120)
 * @returns Array of positions along the ground track
 */
export function getOrbitPath(tle: TLEData, steps: number = 120): SatPosition[] {
  const periodSeconds = SECONDS_PER_DAY / tle.meanMotion;
  const positions: SatPosition[] = [];
  const now = new Date();

  for (let i = 0; i <= steps; i++) {
    const t = new Date(now.getTime() + (i / steps) * periodSeconds * 1000);
    positions.push(tleToLatLng(tle, t));
  }

  return positions;
}

// ─── Visible Satellites ────────────────────────────────────────────────────
/**
 * Filter satellites that are above a minimum elevation angle from a ground observer.
 * Uses simplified geometric visibility (no atmospheric refraction).
 *
 * @param satellites - Array of TLE data to filter
 * @param observerLat - Observer latitude in degrees
 * @param observerLng - Observer longitude in degrees
 * @param minElevation - Minimum elevation angle in degrees (default 10)
 * @returns Filtered array of visible satellites
 */
export function getVisibleSatellites(
  satellites: TLEData[],
  observerLat: number,
  observerLng: number,
  minElevation: number = 10
): TLEData[] {
  const now = new Date();

  return satellites.filter((tle) => {
    const pos = tleToLatLng(tle, now);

    // Angular distance between observer and sub-satellite point (Haversine)
    const dLat = (pos.lat - observerLat) * DEG2RAD;
    const dLng = (pos.lng - observerLng) * DEG2RAD;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(observerLat * DEG2RAD) * Math.cos(pos.lat * DEG2RAD) *
              Math.sin(dLng / 2) ** 2;
    const centralAngle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Earth central angle to the sub-satellite point
    const earthAngle = centralAngle; // radians

    // Compute elevation angle from observer
    // Using the relationship: tan(elevation) = (cos(earthAngle) - R/(R+h)) / sin(earthAngle)
    const R = EARTH_RADIUS_KM;
    const h = pos.altitude;
    const rRatio = R / (R + h);

    if (earthAngle < 1e-10) {
      // Satellite is directly overhead
      return true;
    }

    const elevation = Math.atan2(
      Math.cos(earthAngle) - rRatio,
      Math.sin(earthAngle)
    ) * RAD2DEG;

    return elevation >= minElevation;
  });
}

// ─── Orbit Classification ──────────────────────────────────────────────────
export type OrbitClass = 'LEO' | 'MEO' | 'GEO' | 'HEO';

/**
 * Classify a satellite's orbit based on its TLE parameters.
 */
export function classifyOrbit(tle: TLEData): OrbitClass {
  // Semi-major axis from mean motion
  const n = (tle.meanMotion * TWO_PI) / SECONDS_PER_DAY;
  const a = Math.pow(EARTH_MU / (n * n), 1 / 3);
  const altitude = a - EARTH_RADIUS_KM;

  // High eccentricity = HEO (e.g., Molniya orbits)
  if (tle.eccentricity > 0.1) return 'HEO';

  // GEO: ~35,786 km altitude, low inclination
  if (altitude > 34000 && altitude < 37000 && tle.inclination < 5) return 'GEO';

  // MEO: 2,000 - 34,000 km
  if (altitude > 2000 && altitude <= 34000) return 'MEO';

  // LEO: < 2,000 km
  return 'LEO';
}

// ─── Parse 3LE (Three-Line Element) format ─────────────────────────────────
/**
 * Parse raw TLE text (3LE format: name + line1 + line2, repeated) into TLEData array.
 */
export function parseTLEText(text: string): TLEData[] {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  const results: TLEData[] = [];

  let i = 0;
  while (i < lines.length) {
    // Detect if current line is a name line (does not start with "1 " or "2 ")
    if (lines[i] && !lines[i].startsWith('1 ') && !lines[i].startsWith('2 ')) {
      // 3LE format: name, line1, line2
      const name = lines[i];
      const l1 = lines[i + 1];
      const l2 = lines[i + 2];
      if (l1?.startsWith('1 ') && l2?.startsWith('2 ')) {
        try {
          results.push(parseTLE(l1, l2, name));
        } catch {
          // Skip malformed entries
        }
        i += 3;
        continue;
      }
    } else if (lines[i]?.startsWith('1 ') && lines[i + 1]?.startsWith('2 ')) {
      // 2LE format: just line1 + line2
      try {
        results.push(parseTLE(lines[i], lines[i + 1]));
      } catch {
        // Skip malformed entries
      }
      i += 2;
      continue;
    }
    i++;
  }

  return results;
}
