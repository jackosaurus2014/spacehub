import prisma from './db';

// Helper to generate dates relative to now
const hoursFromNow = (hours: number) => {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
};

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

// ============================================================
// Types
// ============================================================

export type AlertLevel = 'green' | 'yellow' | 'orange' | 'red';
export type ConjunctionStatus = 'predicted' | 'confirmed' | 'resolved';
export type ScorecardGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type SpectrumAlertType = 'interference' | 'congestion' | 'coordination';
export type SpectrumSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SpectrumAlertStatus = 'active' | 'monitoring' | 'resolved';

export interface OperationalConjunction {
  id: string;
  eventId: string;
  primaryObject: string;
  secondaryObject: string;
  tca: Date;
  missDistance: number;
  collisionProb: number | null;
  relativeVelocity: number | null;
  alertLevel: AlertLevel;
  status: ConjunctionStatus;
  createdAt: Date;
}

export interface SustainabilityScorecard {
  id: string;
  operatorName: string;
  operatorSlug: string;
  totalSatellites: number;
  deorbitScore: number;
  maneuverScore: number;
  debrisScore: number;
  transparencyScore: number;
  overallScore: number;
  grade: ScorecardGrade;
  deorbitPlan: string | null;
  notes: string | null;
  lastUpdated: Date;
}

export interface SpectrumAlert {
  id: string;
  alertType: SpectrumAlertType;
  frequencyBand: string;
  affectedService: string | null;
  location: string | null;
  severity: SpectrumSeverity;
  description: string;
  reportedAt: Date;
  resolvedAt: Date | null;
  status: SpectrumAlertStatus;
}

// ============================================================
// Alert Level Info
// ============================================================

export const ALERT_LEVEL_INFO: Record<AlertLevel, { label: string; color: string; bgColor: string; borderColor: string }> = {
  green: { label: 'Green', color: 'text-green-400', bgColor: 'bg-green-900/30', borderColor: 'border-green-500' },
  yellow: { label: 'Yellow', color: 'text-yellow-400', bgColor: 'bg-yellow-900/30', borderColor: 'border-yellow-500' },
  orange: { label: 'Orange', color: 'text-orange-400', bgColor: 'bg-orange-900/30', borderColor: 'border-orange-500' },
  red: { label: 'Red', color: 'text-red-400', bgColor: 'bg-red-900/30', borderColor: 'border-red-500' },
};

export const SEVERITY_INFO: Record<SpectrumSeverity, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: 'text-green-400', bgColor: 'bg-green-900/30' },
  medium: { label: 'Medium', color: 'text-yellow-400', bgColor: 'bg-yellow-900/30' },
  high: { label: 'High', color: 'text-orange-400', bgColor: 'bg-orange-900/30' },
  critical: { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-900/30' },
};

export const GRADE_INFO: Record<ScorecardGrade, { label: string; color: string; bgColor: string }> = {
  A: { label: 'A - Excellent', color: 'text-green-400', bgColor: 'bg-green-900/30' },
  B: { label: 'B - Good', color: 'text-blue-400', bgColor: 'bg-blue-900/30' },
  C: { label: 'C - Adequate', color: 'text-yellow-400', bgColor: 'bg-yellow-900/30' },
  D: { label: 'D - Poor', color: 'text-orange-400', bgColor: 'bg-orange-900/30' },
  F: { label: 'F - Failing', color: 'text-red-400', bgColor: 'bg-red-900/30' },
};

// ============================================================
// Seed Data: Conjunction Events (Mock Real-Time Alerts)
// ============================================================

export const CONJUNCTION_EVENTS_SEED = [
  {
    eventId: 'CONJ-2026-001',
    primaryObject: 'Starlink-5847',
    secondaryObject: 'COSMOS 1408 Debris (DEB-0312)',
    tca: hoursFromNow(4),
    missDistance: 127,
    collisionProb: 0.00032,
    relativeVelocity: 14.2,
    alertLevel: 'red',
    status: 'confirmed',
  },
  {
    eventId: 'CONJ-2026-002',
    primaryObject: 'OneWeb-0421',
    secondaryObject: 'SL-16 Rocket Body',
    tca: hoursFromNow(18),
    missDistance: 245,
    collisionProb: 0.00018,
    relativeVelocity: 11.8,
    alertLevel: 'orange',
    status: 'predicted',
  },
  {
    eventId: 'CONJ-2026-003',
    primaryObject: 'ISS (ZARYA)',
    secondaryObject: 'Fengyun-1C Debris (DEB-0847)',
    tca: hoursFromNow(72),
    missDistance: 890,
    collisionProb: 0.000045,
    relativeVelocity: 13.5,
    alertLevel: 'yellow',
    status: 'predicted',
  },
  {
    eventId: 'CONJ-2026-004',
    primaryObject: 'Sentinel-6A',
    secondaryObject: 'CZ-4C Upper Stage',
    tca: daysFromNow(5),
    missDistance: 1250,
    collisionProb: 0.000012,
    relativeVelocity: 10.2,
    alertLevel: 'green',
    status: 'predicted',
  },
  {
    eventId: 'CONJ-2026-005',
    primaryObject: 'Kuiper-0089',
    secondaryObject: 'Iridium 33 Debris (DEB-0091)',
    tca: hoursFromNow(8),
    missDistance: 175,
    collisionProb: 0.00025,
    relativeVelocity: 15.1,
    alertLevel: 'orange',
    status: 'confirmed',
  },
  {
    eventId: 'CONJ-2026-006',
    primaryObject: 'Planet Dove-R 42',
    secondaryObject: 'Breeze-M Debris (DEB-008)',
    tca: hoursFromNow(36),
    missDistance: 520,
    collisionProb: 0.00008,
    relativeVelocity: 12.4,
    alertLevel: 'yellow',
    status: 'predicted',
  },
  {
    eventId: 'CONJ-2026-007',
    primaryObject: 'Tiangong Space Station',
    secondaryObject: 'COSMOS 2251 Debris (DEB-0215)',
    tca: hoursFromNow(6),
    missDistance: 98,
    collisionProb: 0.00048,
    relativeVelocity: 14.8,
    alertLevel: 'red',
    status: 'confirmed',
  },
  {
    eventId: 'CONJ-2026-008',
    primaryObject: 'Iridium NEXT-127',
    secondaryObject: 'Mission Shakti Debris (DEB-003)',
    tca: daysFromNow(3),
    missDistance: 780,
    collisionProb: 0.000062,
    relativeVelocity: 11.1,
    alertLevel: 'yellow',
    status: 'predicted',
  },
  {
    eventId: 'CONJ-2026-009',
    primaryObject: 'Starlink-7215',
    secondaryObject: 'H-2A Upper Stage',
    tca: daysFromNow(7),
    missDistance: 2100,
    collisionProb: 0.000005,
    relativeVelocity: 9.8,
    alertLevel: 'green',
    status: 'predicted',
  },
  {
    eventId: 'CONJ-2026-010',
    primaryObject: 'NOAA-21',
    secondaryObject: 'Delta II Debris (DEB-012)',
    tca: hoursFromNow(48),
    missDistance: 410,
    collisionProb: 0.00011,
    relativeVelocity: 13.2,
    alertLevel: 'yellow',
    status: 'predicted',
  },
];

// ============================================================
// Seed Data: Sustainability Scorecards
// ============================================================

export const SUSTAINABILITY_SCORECARDS_SEED = [
  {
    operatorName: 'SpaceX Starlink',
    operatorSlug: 'spacex-starlink',
    totalSatellites: 6284,
    deorbitScore: 92,
    maneuverScore: 95,
    debrisScore: 88,
    transparencyScore: 85,
    overallScore: 90,
    grade: 'A',
    deorbitPlan: 'Active propulsion deorbit within 5 years of end-of-life. Satellites designed to fully demise on reentry. Autonomous collision avoidance system operational since 2022.',
    notes: 'Industry leader in autonomous collision avoidance. Publishes semi-annual transparency reports. Has executed over 50,000 collision avoidance maneuvers since constellation deployment began.',
    lastUpdated: daysFromNow(-7),
  },
  {
    operatorName: 'OneWeb',
    operatorSlug: 'oneweb',
    totalSatellites: 648,
    deorbitScore: 88,
    maneuverScore: 82,
    debrisScore: 90,
    transparencyScore: 78,
    overallScore: 84,
    grade: 'B',
    deorbitPlan: 'Propulsive deorbit capability on all satellites. Target deorbit within 5 years of end-of-life. Graveyard orbit option for satellites unable to deorbit.',
    notes: 'Good compliance with international guidelines. Shares conjunction data with Space-Track. Working on improved transparency reporting for 2026.',
    lastUpdated: daysFromNow(-14),
  },
  {
    operatorName: 'Amazon Kuiper',
    operatorSlug: 'amazon-kuiper',
    totalSatellites: 578,
    deorbitScore: 94,
    maneuverScore: 90,
    debrisScore: 95,
    transparencyScore: 88,
    overallScore: 92,
    grade: 'A',
    deorbitPlan: 'Committed to 100% demise on reentry. All satellites equipped with propulsion for active deorbit. Target deorbit within 355 days of mission completion.',
    notes: 'Exceeds FCC 5-year deorbit requirements. Has committed to 99% spacecraft demise. Publishes quarterly sustainability reports.',
    lastUpdated: daysFromNow(-3),
  },
  {
    operatorName: 'Planet Labs',
    operatorSlug: 'planet-labs',
    totalSatellites: 200,
    deorbitScore: 75,
    maneuverScore: 65,
    debrisScore: 82,
    transparencyScore: 72,
    overallScore: 74,
    grade: 'C',
    deorbitPlan: 'Passive deorbit via atmospheric drag for most Dove satellites. SuperDove constellation has improved deorbit timeline. Pelican satellites will have active propulsion.',
    notes: 'Many legacy Dove satellites lack propulsion capability. Working to improve practices with newer satellite generations. Constellation primarily in VLEO for natural decay.',
    lastUpdated: daysFromNow(-21),
  },
  {
    operatorName: 'Iridium',
    operatorSlug: 'iridium',
    totalSatellites: 75,
    deorbitScore: 85,
    maneuverScore: 88,
    debrisScore: 78,
    transparencyScore: 80,
    overallScore: 82,
    grade: 'B',
    deorbitPlan: 'Active deorbit for all NEXT constellation satellites. Legacy Iridium satellites being deorbited as NEXT satellites take over. Target 15-year operational life with 5-year deorbit.',
    notes: 'Experienced the 2009 Iridium-Cosmos collision. Has since implemented rigorous collision avoidance protocols. All NEXT satellites have redundant propulsion systems.',
    lastUpdated: daysFromNow(-10),
  },
  {
    operatorName: 'SES',
    operatorSlug: 'ses',
    totalSatellites: 70,
    deorbitScore: 80,
    maneuverScore: 85,
    debrisScore: 85,
    transparencyScore: 75,
    overallScore: 81,
    grade: 'B',
    deorbitPlan: 'GEO satellites moved to graveyard orbit at end-of-life. MEO O3b satellites have propulsive deorbit capability. Committed to IADC guidelines.',
    notes: 'Long operational history with good track record. Active participant in Space Safety Coalition. O3b mPOWER constellation has enhanced sustainability features.',
    lastUpdated: daysFromNow(-18),
  },
  {
    operatorName: 'Telesat',
    operatorSlug: 'telesat',
    totalSatellites: 18,
    deorbitScore: 72,
    maneuverScore: 75,
    debrisScore: 80,
    transparencyScore: 68,
    overallScore: 74,
    grade: 'C',
    deorbitPlan: 'GEO satellites follow standard graveyard orbit procedures. Lightspeed LEO constellation will have propulsive deorbit. Planning for 25-year compliance.',
    notes: 'Transitioning from GEO to LEO operations with Lightspeed. New constellation design incorporates modern sustainability practices.',
    lastUpdated: daysFromNow(-30),
  },
  {
    operatorName: 'Spire Global',
    operatorSlug: 'spire-global',
    totalSatellites: 110,
    deorbitScore: 70,
    maneuverScore: 60,
    debrisScore: 75,
    transparencyScore: 65,
    overallScore: 68,
    grade: 'D',
    deorbitPlan: 'CubeSats rely on passive deorbit via drag. Newer LEMUR-2 satellites have improved drag devices. Working on propulsive options for future generations.',
    notes: 'Small satellite operator facing typical CubeSat sustainability challenges. Orbital altitude selection helps ensure timely decay. Participating in industry working groups on small sat sustainability.',
    lastUpdated: daysFromNow(-25),
  },
];

// ============================================================
// Seed Data: Spectrum Alerts
// ============================================================

export const SPECTRUM_ALERTS_SEED = [
  {
    alertType: 'interference',
    frequencyBand: 'Ku-band',
    affectedService: 'Direct-to-Home Television',
    location: 'North America',
    severity: 'high',
    description: 'Significant interference detected on Ku-band downlink frequencies (11.7-12.2 GHz) affecting DTH services in the northeastern United States. Source identified as adjacent satellite operator exceeding coordination limits.',
    reportedAt: hoursFromNow(-12),
    resolvedAt: null,
    status: 'active',
  },
  {
    alertType: 'congestion',
    frequencyBand: 'Ka-band',
    affectedService: 'High-Throughput Satellites',
    location: 'Global',
    severity: 'medium',
    description: 'Increasing congestion in Ka-band gateway frequencies (27.5-30.0 GHz) due to growing number of NGSO constellation deployments. Coordination meetings scheduled for Q2 2026.',
    reportedAt: daysFromNow(-5),
    resolvedAt: null,
    status: 'active',
  },
  {
    alertType: 'coordination',
    frequencyBand: 'L-band',
    affectedService: 'Mobile Satellite Services (MSS)',
    location: 'Asia-Pacific',
    severity: 'medium',
    description: 'SCS (Supplemental Coverage from Space) coordination required for new D2D (Direct-to-Device) services. Multiple operators seeking L-band spectrum access for smartphone connectivity.',
    reportedAt: daysFromNow(-3),
    resolvedAt: null,
    status: 'active',
  },
  {
    alertType: 'interference',
    frequencyBand: 'S-band',
    affectedService: 'Weather Radar',
    location: 'Europe',
    severity: 'critical',
    description: 'Critical interference to meteorological radar systems (2.7-2.9 GHz) from unauthorized satellite downlinks. CEPT and ITU investigating. Potential impact on aviation weather services.',
    reportedAt: hoursFromNow(-6),
    resolvedAt: null,
    status: 'active',
  },
  {
    alertType: 'congestion',
    frequencyBand: 'V-band',
    affectedService: 'Next-Gen Broadband',
    location: 'Global',
    severity: 'low',
    description: 'Early congestion indicators in V-band (40-75 GHz) as multiple mega-constellation operators file for spectrum access. ITU coordination framework under development.',
    reportedAt: daysFromNow(-14),
    resolvedAt: null,
    status: 'monitoring',
  },
  {
    alertType: 'coordination',
    frequencyBand: 'C-band',
    affectedService: 'Fixed Satellite Services',
    location: 'Global',
    severity: 'medium',
    description: 'Ongoing coordination between FSS operators and 5G terrestrial networks following C-band auction. Interference mitigation measures being implemented at earth stations.',
    reportedAt: daysFromNow(-45),
    resolvedAt: null,
    status: 'active',
  },
  {
    alertType: 'interference',
    frequencyBand: 'X-band',
    affectedService: 'Government/Military',
    location: 'Middle East',
    severity: 'high',
    description: 'Unauthorized transmissions detected in X-band military satellite frequencies. Source geolocation underway. Coordination with national spectrum authorities in progress.',
    reportedAt: hoursFromNow(-24),
    resolvedAt: null,
    status: 'active',
  },
  {
    alertType: 'coordination',
    frequencyBand: 'Ka-band',
    affectedService: 'LEO Broadband',
    location: 'Global',
    severity: 'medium',
    description: 'NGSO-GSO coordination framework implementation for Ka-band. Multiple LEO operators required to implement EPFD limits to protect GEO operators.',
    reportedAt: daysFromNow(-21),
    resolvedAt: null,
    status: 'active',
  },
  {
    alertType: 'interference',
    frequencyBand: 'L-band',
    affectedService: 'GPS/GNSS',
    location: 'Mediterranean',
    severity: 'critical',
    description: 'GPS/Galileo signal jamming detected in eastern Mediterranean shipping lanes. Maritime navigation safety alerts issued. Source appears terrestrial but investigation ongoing.',
    reportedAt: hoursFromNow(-2),
    resolvedAt: null,
    status: 'active',
  },
  {
    alertType: 'congestion',
    frequencyBand: 'Ku-band',
    affectedService: 'Aero/Maritime VSAT',
    location: 'Atlantic Ocean Region',
    severity: 'low',
    description: 'Moderate increase in Ku-band congestion for aeronautical and maritime VSAT services over North Atlantic routes. Peak usage during business hours affecting throughput.',
    reportedAt: daysFromNow(-7),
    resolvedAt: daysFromNow(-2),
    status: 'resolved',
  },
];

// ============================================================
// Frequency Band Information
// ============================================================

export const FREQUENCY_BANDS = [
  { band: 'L-band', range: '1-2 GHz', services: ['MSS', 'GPS/GNSS', 'D2D'], congestionLevel: 'high' },
  { band: 'S-band', range: '2-4 GHz', services: ['Weather Radar', 'MSS', 'ISS Comms'], congestionLevel: 'medium' },
  { band: 'C-band', range: '4-8 GHz', services: ['FSS', 'Broadcast Distribution'], congestionLevel: 'medium' },
  { band: 'X-band', range: '8-12 GHz', services: ['Military', 'Earth Observation'], congestionLevel: 'low' },
  { band: 'Ku-band', range: '12-18 GHz', services: ['DTH TV', 'VSAT', 'Broadband'], congestionLevel: 'high' },
  { band: 'Ka-band', range: '26.5-40 GHz', services: ['HTS', 'LEO Broadband', 'Gateways'], congestionLevel: 'very_high' },
  { band: 'V-band', range: '40-75 GHz', services: ['Next-Gen Broadband', 'Feeder Links'], congestionLevel: 'emerging' },
];

// ============================================================
// Initialize Data
// ============================================================

export async function initializeOperationalAwarenessData() {
  const results = {
    conjunctionsCreated: 0,
    scorecardsCreated: 0,
    spectrumAlertsCreated: 0,
  };

  // Clear and recreate conjunction events (time-sensitive data)
  await prisma.operationalConjunction.deleteMany({});

  for (const event of CONJUNCTION_EVENTS_SEED) {
    await prisma.operationalConjunction.create({
      data: event,
    });
    results.conjunctionsCreated++;
  }

  // Upsert sustainability scorecards
  for (const scorecard of SUSTAINABILITY_SCORECARDS_SEED) {
    await prisma.sustainabilityScorecard.upsert({
      where: { operatorSlug: scorecard.operatorSlug },
      update: {
        ...scorecard,
      },
      create: scorecard,
    });
    results.scorecardsCreated++;
  }

  // Clear and recreate spectrum alerts (time-sensitive data)
  await prisma.spectrumAlert.deleteMany({});

  for (const alert of SPECTRUM_ALERTS_SEED) {
    await prisma.spectrumAlert.create({
      data: alert,
    });
    results.spectrumAlertsCreated++;
  }

  return results;
}

// ============================================================
// Query Functions
// ============================================================

/**
 * Get all operational conjunction events, optionally filtered by alert level
 */
export async function getConjunctionEvents(options?: {
  alertLevel?: AlertLevel;
  status?: ConjunctionStatus;
  limit?: number;
}): Promise<OperationalConjunction[]> {
  const where: Record<string, unknown> = {};

  if (options?.alertLevel) {
    where.alertLevel = options.alertLevel;
  }

  if (options?.status) {
    where.status = options.status;
  }

  const events = await prisma.operationalConjunction.findMany({
    where,
    orderBy: { tca: 'asc' },
    ...(options?.limit ? { take: options.limit } : {}),
  });

  return events.map(e => ({
    ...e,
    alertLevel: e.alertLevel as AlertLevel,
    status: e.status as ConjunctionStatus,
  }));
}

/**
 * Get conjunction event counts by alert level
 */
export async function getConjunctionCounts(): Promise<Record<AlertLevel, number>> {
  const counts = await prisma.operationalConjunction.groupBy({
    by: ['alertLevel'],
    _count: { id: true },
  });

  const result: Record<AlertLevel, number> = { green: 0, yellow: 0, orange: 0, red: 0 };
  for (const count of counts) {
    result[count.alertLevel as AlertLevel] = count._count.id;
  }

  return result;
}

/**
 * Get all sustainability scorecards
 */
export async function getScorecards(options?: {
  grade?: ScorecardGrade;
  sortBy?: 'overallScore' | 'totalSatellites' | 'operatorName';
  order?: 'asc' | 'desc';
}): Promise<SustainabilityScorecard[]> {
  const where: Record<string, unknown> = {};

  if (options?.grade) {
    where.grade = options.grade;
  }

  const orderBy: Record<string, 'asc' | 'desc'> = {};
  if (options?.sortBy) {
    orderBy[options.sortBy] = options?.order || 'desc';
  } else {
    orderBy.overallScore = 'desc';
  }

  const scorecards = await prisma.sustainabilityScorecard.findMany({
    where,
    orderBy,
  });

  return scorecards.map(s => ({
    ...s,
    grade: s.grade as ScorecardGrade,
  }));
}

/**
 * Get a single scorecard by slug
 */
export async function getScorecardBySlug(slug: string): Promise<SustainabilityScorecard | null> {
  const scorecard = await prisma.sustainabilityScorecard.findUnique({
    where: { operatorSlug: slug },
  });

  if (!scorecard) return null;

  return {
    ...scorecard,
    grade: scorecard.grade as ScorecardGrade,
  };
}

/**
 * Get all spectrum alerts
 */
export async function getSpectrumAlerts(options?: {
  alertType?: SpectrumAlertType;
  severity?: SpectrumSeverity;
  status?: SpectrumAlertStatus;
  frequencyBand?: string;
  limit?: number;
}): Promise<SpectrumAlert[]> {
  const where: Record<string, unknown> = {};

  if (options?.alertType) {
    where.alertType = options.alertType;
  }

  if (options?.severity) {
    where.severity = options.severity;
  }

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.frequencyBand) {
    where.frequencyBand = options.frequencyBand;
  }

  const alerts = await prisma.spectrumAlert.findMany({
    where,
    orderBy: { reportedAt: 'desc' },
    ...(options?.limit ? { take: options.limit } : {}),
  });

  return alerts.map(a => ({
    ...a,
    alertType: a.alertType as SpectrumAlertType,
    severity: a.severity as SpectrumSeverity,
    status: a.status as SpectrumAlertStatus,
  }));
}

/**
 * Get spectrum alert counts by severity
 */
export async function getSpectrumAlertCounts(): Promise<Record<SpectrumSeverity, number>> {
  const counts = await prisma.spectrumAlert.groupBy({
    by: ['severity'],
    where: { status: 'active' },
    _count: { id: true },
  });

  const result: Record<SpectrumSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const count of counts) {
    result[count.severity as SpectrumSeverity] = count._count.id;
  }

  return result;
}

/**
 * Get comprehensive operational awareness overview
 */
export async function getOperationalOverview() {
  const [
    conjunctions,
    conjunctionCounts,
    scorecards,
    spectrumAlerts,
    spectrumCounts,
  ] = await Promise.all([
    getConjunctionEvents({ limit: 10 }),
    getConjunctionCounts(),
    getScorecards(),
    getSpectrumAlerts({ status: 'active', limit: 10 }),
    getSpectrumAlertCounts(),
  ]);

  const criticalConjunctions = conjunctions.filter(c => c.alertLevel === 'red' || c.alertLevel === 'orange');
  const criticalSpectrumAlerts = spectrumAlerts.filter(a => a.severity === 'critical' || a.severity === 'high');

  const avgSustainabilityScore = scorecards.length > 0
    ? Math.round(scorecards.reduce((sum, s) => sum + s.overallScore, 0) / scorecards.length)
    : 0;

  const gradeDistribution = scorecards.reduce((acc, s) => {
    acc[s.grade] = (acc[s.grade] || 0) + 1;
    return acc;
  }, {} as Record<ScorecardGrade, number>);

  return {
    conjunctions: {
      total: Object.values(conjunctionCounts).reduce((a, b) => a + b, 0),
      byLevel: conjunctionCounts,
      critical: criticalConjunctions,
      upcoming: conjunctions.slice(0, 5),
    },
    sustainability: {
      totalOperators: scorecards.length,
      averageScore: avgSustainabilityScore,
      gradeDistribution,
      topPerformers: scorecards.filter(s => s.grade === 'A').slice(0, 3),
      needsImprovement: scorecards.filter(s => s.grade === 'D' || s.grade === 'F'),
    },
    spectrum: {
      totalAlerts: spectrumAlerts.length,
      bySeverity: spectrumCounts,
      critical: criticalSpectrumAlerts,
      recentAlerts: spectrumAlerts.slice(0, 5),
    },
    overallStatus: {
      conjunctionThreat: criticalConjunctions.length > 0 ? 'elevated' : 'normal',
      spectrumHealth: criticalSpectrumAlerts.length > 0 ? 'degraded' : 'healthy',
      sustainabilityTrend: avgSustainabilityScore >= 80 ? 'positive' : avgSustainabilityScore >= 60 ? 'moderate' : 'concerning',
    },
  };
}
