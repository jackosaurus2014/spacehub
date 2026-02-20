/**
 * Regulatory Risk Scoring Engine for SpaceNexus
 *
 * Provides per-company/per-mission regulatory risk assessment based on
 * sector, activities, and applicable regulatory frameworks.
 *
 * Sources:
 * - FAA Office of Commercial Space Transportation
 * - FCC Space Bureau
 * - NOAA Office of Space Commerce
 * - Bureau of Industry and Security (BIS)
 * - Directorate of Defense Trade Controls (DDTC)
 * - International Telecommunication Union (ITU)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface RiskFactor {
  id: string;
  category: 'licensing' | 'export_control' | 'spectrum' | 'environmental' | 'liability' | 'international' | 'emerging';
  name: string;
  description: string;
  weight: number; // 1-10 importance
  assessmentQuestion: string;
}

export interface RiskAssessment {
  overallScore: number; // 0-100 (0 = low risk, 100 = critical)
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  categoryScores: {
    category: string;
    score: number;
    factors: { factorId: string; name: string; score: number; notes: string }[];
  }[];
  estimatedTimeline: string; // e.g., "12-18 months for all licenses"
  recommendations: string[];
  requiredLicenses: string[];
}

export interface CompanyRiskProfile {
  sector: string;
  subsector?: string;
  activitiesFlags: string[]; // e.g., ['launches_from_us', 'itar_controlled', 'uses_spectrum', 'debris_generating']
}

// ============================================================================
// RISK FACTORS DATABASE
// ============================================================================

export const RISK_FACTORS: RiskFactor[] = [
  // Licensing
  {
    id: 'faa_launch_license',
    category: 'licensing',
    name: 'FAA Launch/Reentry License',
    description: 'Required for any launch or reentry of a launch vehicle or reentry vehicle in the US. Processing time: 6-18 months.',
    weight: 9,
    assessmentQuestion: 'Does the company launch or operate reentry vehicles from US territory?',
  },
  {
    id: 'fcc_spectrum_license',
    category: 'spectrum',
    name: 'FCC Spectrum License',
    description: 'Required for any satellite using radio frequencies. Processing time: 6-24 months. Must also coordinate with ITU.',
    weight: 8,
    assessmentQuestion: 'Does the company operate or plan to operate satellites using radio frequencies?',
  },
  {
    id: 'noaa_remote_sensing',
    category: 'licensing',
    name: 'NOAA Remote Sensing License',
    description: 'Required for private remote sensing satellite systems. Recent reforms streamlined process to 3-6 months.',
    weight: 7,
    assessmentQuestion: 'Does the company operate remote sensing (imaging) satellites?',
  },
  {
    id: 'itar_compliance',
    category: 'export_control',
    name: 'ITAR Compliance',
    description: 'Defense articles and services on USML require State Department export license. Violations: criminal penalties up to $1M per violation.',
    weight: 10,
    assessmentQuestion: 'Does the company manufacture or export items on the USML (defense articles)?',
  },
  {
    id: 'ear_compliance',
    category: 'export_control',
    name: 'EAR/Commerce Controls',
    description: 'Dual-use items controlled by Commerce Department. Many satellite components are EAR-controlled. License requirements vary by destination.',
    weight: 8,
    assessmentQuestion: 'Does the company export dual-use space technology or components?',
  },
  {
    id: 'itu_coordination',
    category: 'spectrum',
    name: 'ITU Spectrum Coordination',
    description: 'International frequency coordination required for satellite networks. Can take 2-7 years for complex filings.',
    weight: 7,
    assessmentQuestion: 'Does the company plan large constellation deployments requiring international spectrum coordination?',
  },
  {
    id: 'debris_mitigation',
    category: 'environmental',
    name: 'Orbital Debris Mitigation Compliance',
    description: 'FCC 5-year deorbit rule (2024). Must demonstrate debris mitigation plan. Non-compliance can block licensing.',
    weight: 8,
    assessmentQuestion: 'Does the company deploy objects to orbit that must be deorbited?',
  },
  {
    id: 'environmental_review',
    category: 'environmental',
    name: 'Environmental Impact Review (NEPA)',
    description: 'FAA requires environmental review for launch site operations. Can add 6-18 months to licensing timeline.',
    weight: 6,
    assessmentQuestion: 'Does the company operate or plan to operate launch facilities?',
  },
  {
    id: 'liability_insurance',
    category: 'liability',
    name: 'Third-Party Liability Insurance',
    description: 'Required for FAA launch license. Maximum Probable Loss determination can be $500M+. Commercial insurance market limited.',
    weight: 7,
    assessmentQuestion: 'Does the company conduct launch or reentry operations requiring liability coverage?',
  },
  {
    id: 'foreign_ownership',
    category: 'licensing',
    name: 'Foreign Ownership Restrictions (CFIUS)',
    description: 'CFIUS review may be triggered by foreign investment in space companies. Can delay or block investments.',
    weight: 6,
    assessmentQuestion: 'Does the company have or seek foreign investors/partners for defense-adjacent space technology?',
  },
  {
    id: 'multi_jurisdiction',
    category: 'international',
    name: 'Multi-Jurisdiction Operations',
    description: 'Operating in multiple countries adds licensing complexity. Each country has different space law frameworks.',
    weight: 5,
    assessmentQuestion: 'Does the company operate in or serve customers in multiple countries?',
  },
  {
    id: 'space_traffic_mgmt',
    category: 'emerging',
    name: 'Space Traffic Management (Emerging)',
    description: 'New regulations expected for space traffic management. Companies should prepare for future compliance requirements.',
    weight: 4,
    assessmentQuestion: 'Does the company operate large constellations or in congested orbital regimes?',
  },
  {
    id: 'in_space_servicing_rules',
    category: 'emerging',
    name: 'In-Space Servicing Regulations (Emerging)',
    description: 'No clear regulatory framework yet for RPO, in-space servicing, or active debris removal. Regulatory uncertainty high.',
    weight: 5,
    assessmentQuestion: 'Does the company plan rendezvous and proximity operations or in-space servicing?',
  },
  {
    id: 'nuclear_thermal',
    category: 'licensing',
    name: 'Nuclear Systems Authorization',
    description: 'Nuclear propulsion or power systems require DOE and Presidential approval. Multi-year process.',
    weight: 9,
    assessmentQuestion: 'Does the company develop nuclear propulsion or nuclear power systems for space?',
  },
];

// ============================================================================
// SECTOR-BASED DEFAULT RISK PROFILES
// ============================================================================

export const SECTOR_RISK_PROFILES: Record<string, string[]> = {
  'launch': ['faa_launch_license', 'environmental_review', 'liability_insurance', 'itar_compliance', 'debris_mitigation'],
  'satellite': ['fcc_spectrum_license', 'itu_coordination', 'debris_mitigation', 'ear_compliance', 'noaa_remote_sensing'],
  'earth-observation': ['noaa_remote_sensing', 'fcc_spectrum_license', 'ear_compliance', 'debris_mitigation'],
  'defense': ['itar_compliance', 'ear_compliance', 'foreign_ownership', 'fcc_spectrum_license'],
  'communications': ['fcc_spectrum_license', 'itu_coordination', 'debris_mitigation', 'ear_compliance'],
  'in-space': ['debris_mitigation', 'in_space_servicing_rules', 'fcc_spectrum_license', 'liability_insurance'],
  'ground-segment': ['fcc_spectrum_license', 'ear_compliance'],
  'analytics': ['ear_compliance', 'noaa_remote_sensing'],
  'manufacturing': ['itar_compliance', 'ear_compliance', 'environmental_review'],
};

// ============================================================================
// LICENSING TIMELINE ESTIMATES
// ============================================================================

export const LICENSE_TIMELINES: Record<string, { min: number; max: number; unit: string }> = {
  'faa_launch_license': { min: 6, max: 18, unit: 'months' },
  'fcc_spectrum_license': { min: 6, max: 24, unit: 'months' },
  'noaa_remote_sensing': { min: 3, max: 6, unit: 'months' },
  'itar_compliance': { min: 3, max: 12, unit: 'months' },
  'ear_compliance': { min: 1, max: 6, unit: 'months' },
  'itu_coordination': { min: 24, max: 84, unit: 'months' },
  'debris_mitigation': { min: 1, max: 3, unit: 'months' },
  'environmental_review': { min: 6, max: 18, unit: 'months' },
  'liability_insurance': { min: 2, max: 6, unit: 'months' },
  'foreign_ownership': { min: 3, max: 12, unit: 'months' },
  'nuclear_thermal': { min: 24, max: 60, unit: 'months' },
};

// ============================================================================
// ACTIVITY FLAG DESCRIPTIONS (for UI labels)
// ============================================================================

export const ACTIVITY_FLAGS: { id: string; label: string; riskFactors: string[] }[] = [
  { id: 'launches_from_us', label: 'Launches from US territory', riskFactors: ['faa_launch_license', 'environmental_review', 'liability_insurance'] },
  { id: 'operates_satellites', label: 'Operates satellites', riskFactors: ['fcc_spectrum_license', 'debris_mitigation'] },
  { id: 'exports_technology', label: 'Exports space technology', riskFactors: ['ear_compliance', 'itar_compliance'] },
  { id: 'foreign_investors', label: 'Has or seeks foreign investors', riskFactors: ['foreign_ownership'] },
  { id: 'large_constellation', label: 'Deploys large constellations', riskFactors: ['itu_coordination', 'space_traffic_mgmt', 'debris_mitigation'] },
  { id: 'nuclear_systems', label: 'Uses nuclear propulsion/power', riskFactors: ['nuclear_thermal'] },
  { id: 'remote_sensing', label: 'Operates remote sensing satellites', riskFactors: ['noaa_remote_sensing'] },
  { id: 'rpo_operations', label: 'Performs RPO / in-space servicing', riskFactors: ['in_space_servicing_rules'] },
  { id: 'multi_country', label: 'Operates in multiple countries', riskFactors: ['multi_jurisdiction'] },
  { id: 'defense_articles', label: 'Manufactures defense articles (USML)', riskFactors: ['itar_compliance', 'foreign_ownership'] },
];

// ============================================================================
// SECTOR DESCRIPTIONS (for UI)
// ============================================================================

export const SECTORS: { id: string; label: string }[] = [
  { id: 'launch', label: 'Launch Services' },
  { id: 'satellite', label: 'Satellite Operations' },
  { id: 'earth-observation', label: 'Earth Observation' },
  { id: 'defense', label: 'Defense & National Security' },
  { id: 'communications', label: 'Communications' },
  { id: 'in-space', label: 'In-Space Services' },
  { id: 'ground-segment', label: 'Ground Segment' },
  { id: 'analytics', label: 'Space Data & Analytics' },
  { id: 'manufacturing', label: 'Space Manufacturing' },
];

// ============================================================================
// CATEGORY DISPLAY CONFIG
// ============================================================================

export const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  licensing: { label: 'Licensing', color: '#3b82f6', icon: '📋' },
  export_control: { label: 'Export Controls', color: '#ef4444', icon: '🔒' },
  spectrum: { label: 'Spectrum', color: '#8b5cf6', icon: '📡' },
  environmental: { label: 'Environmental', color: '#10b981', icon: '🌍' },
  liability: { label: 'Liability', color: '#f59e0b', icon: '🛡' },
  international: { label: 'International', color: '#06b6d4', icon: '🌐' },
  emerging: { label: 'Emerging Regulations', color: '#f97316', icon: '⚠' },
};

// ============================================================================
// RISK ASSESSMENT ENGINE
// ============================================================================

export function assessRisk(profile: CompanyRiskProfile): RiskAssessment {
  // Get applicable risk factors based on sector
  const sectorFactors = SECTOR_RISK_PROFILES[profile.sector] || [];

  // Resolve activity flags to risk factor IDs
  const activityRiskFactors: string[] = [];
  for (const flag of profile.activitiesFlags) {
    const activityDef = ACTIVITY_FLAGS.find(a => a.id === flag);
    if (activityDef) {
      activityRiskFactors.push(...activityDef.riskFactors);
    } else {
      // Treat as a direct risk factor ID
      activityRiskFactors.push(flag);
    }
  }

  const allApplicable = new Set([...sectorFactors, ...activityRiskFactors]);

  const categoryScores: RiskAssessment['categoryScores'] = [];
  const requiredLicenses: string[] = [];
  const recommendations: string[] = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;

  // Group factors by category
  const byCategory = new Map<string, RiskFactor[]>();
  for (const factor of RISK_FACTORS) {
    if (!allApplicable.has(factor.id)) continue;
    const existing = byCategory.get(factor.category) || [];
    existing.push(factor);
    byCategory.set(factor.category, existing);
  }

  for (const [category, factors] of Array.from(byCategory.entries())) {
    const catFactors = factors.map(f => {
      // Score based on weight (higher weight = higher risk contribution)
      const score = f.weight * 10; // Scale to 0-100
      totalWeightedScore += score * f.weight;
      totalWeight += f.weight;

      if (f.category === 'licensing' || f.category === 'spectrum') {
        requiredLicenses.push(f.name);
      }

      return { factorId: f.id, name: f.name, score, notes: f.description };
    });

    const catScore = catFactors.reduce((sum, f) => sum + f.score, 0) / catFactors.length;
    categoryScores.push({ category, score: Math.round(catScore), factors: catFactors });
  }

  const overallScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
  const riskLevel = overallScore >= 75 ? 'critical' : overallScore >= 50 ? 'high' : overallScore >= 25 ? 'medium' : 'low';

  // Estimate timeline
  let maxTimeline = 0;
  Array.from(allApplicable).forEach(factorId => {
    const timeline = LICENSE_TIMELINES[factorId];
    if (timeline && timeline.max > maxTimeline) maxTimeline = timeline.max;
  });
  const estimatedTimeline = maxTimeline > 0 ? `${Math.ceil(maxTimeline * 0.6)}-${maxTimeline} months` : 'Minimal regulatory timeline';

  // Generate recommendations
  if (allApplicable.has('itar_compliance')) {
    recommendations.push('Engage ITAR compliance counsel early. Establish a Technology Control Plan before any foreign engagement.');
  }
  if (allApplicable.has('fcc_spectrum_license')) {
    recommendations.push('File FCC applications 18-24 months before planned launch. Consider spectrum lease agreements as a faster alternative.');
  }
  if (allApplicable.has('debris_mitigation')) {
    recommendations.push('Design for the 5-year deorbit rule from day one. Include propulsion or drag devices in satellite design.');
  }
  if (allApplicable.has('faa_launch_license')) {
    recommendations.push('Begin FAA pre-application consultation at least 18 months before planned first launch.');
  }
  if (allApplicable.has('foreign_ownership')) {
    recommendations.push('Consider CFIUS implications before accepting foreign investment. Structure deals to minimize CFIUS review triggers.');
  }
  if (allApplicable.has('noaa_remote_sensing')) {
    recommendations.push('Take advantage of NOAA streamlined licensing reforms. Engage early for Tier 1 vs Tier 2 classification.');
  }
  if (allApplicable.has('itu_coordination')) {
    recommendations.push('Begin ITU coordination filings 3-5 years before planned constellation deployment. Coordinate with national administration early.');
  }
  if (allApplicable.has('nuclear_thermal')) {
    recommendations.push('Nuclear space systems require multi-agency coordination (DOE, NRC, NASA). Plan for a multi-year approval process.');
  }
  if (allApplicable.has('in_space_servicing_rules')) {
    recommendations.push('Monitor emerging RPO/in-space servicing regulatory developments closely. Engage with CONFERS industry standards body.');
  }
  if (allApplicable.has('multi_jurisdiction')) {
    recommendations.push('Map all jurisdictional requirements early. Consider establishing legal entities in key operating countries.');
  }
  if (overallScore >= 50) {
    recommendations.push('Consider hiring a dedicated regulatory affairs team or engaging specialized space law firm (e.g., Hogan Lovells, DLA Piper, Via Satellite).');
  }

  // Sort category scores descending by score
  categoryScores.sort((a, b) => b.score - a.score);

  return {
    overallScore,
    riskLevel,
    categoryScores,
    estimatedTimeline,
    recommendations,
    requiredLicenses,
  };
}
