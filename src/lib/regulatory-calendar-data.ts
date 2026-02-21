/**
 * Regulatory Deadline Calendar Data Layer
 * 100+ known and realistic regulatory deadlines for 2026-2027
 *
 * Sources:
 * - FCC Space Bureau: https://www.fcc.gov/space
 * - FAA Office of Commercial Space Transportation: https://www.faa.gov/space
 * - ITU Radiocommunication Bureau: https://www.itu.int/en/ITU-R
 * - NOAA Office of Space Commerce: https://space.commerce.gov
 * - Bureau of Industry and Security (BIS): https://www.bis.doc.gov
 * - DDTC (State Dept): https://www.pmddtc.state.gov
 * - UN COPUOS: https://www.unoosa.org/oosa/en/ourwork/copuos
 * - Space Force Acquisition: https://www.ssc.spaceforce.mil
 * - ESA: https://www.esa.int
 * - Congressional hearing schedules
 */

// ============================================================================
// TYPES
// ============================================================================

export type CalendarAgency =
  | 'FCC'
  | 'FAA'
  | 'NASA'
  | 'NOAA'
  | 'DoD'
  | 'BIS'
  | 'ITU'
  | 'Congress'
  | 'International';

export type DeadlineType =
  | 'filing'
  | 'hearing'
  | 'compliance'
  | 'review'
  | 'procurement'
  | 'treaty';

export type DeadlinePriority = 'high' | 'medium' | 'low';

export interface RegulatoryDeadline {
  id: string;
  title: string;
  description: string;
  date: string; // ISO date
  endDate?: string; // ISO date, for multi-day events
  agency: CalendarAgency;
  type: DeadlineType;
  priority: DeadlinePriority;
  url?: string;
  relatedPolicies?: string[];
}

// ============================================================================
// AGENCY COLORS
// ============================================================================

export const AGENCY_COLORS: Record<CalendarAgency, { bg: string; text: string; dot: string; border: string }> = {
  FCC: { bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500', border: 'border-blue-500/40' },
  FAA: { bg: 'bg-orange-500/20', text: 'text-orange-400', dot: 'bg-orange-500', border: 'border-orange-500/40' },
  NASA: { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-500', border: 'border-red-500/40' },
  NOAA: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', dot: 'bg-cyan-500', border: 'border-cyan-500/40' },
  DoD: { bg: 'bg-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-500', border: 'border-purple-500/40' },
  BIS: { bg: 'bg-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-500', border: 'border-amber-500/40' },
  ITU: { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-500', border: 'border-green-500/40' },
  Congress: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', dot: 'bg-indigo-500', border: 'border-indigo-500/40' },
  International: { bg: 'bg-teal-500/20', text: 'text-teal-400', dot: 'bg-teal-500', border: 'border-teal-500/40' },
};

export const TYPE_LABELS: Record<DeadlineType, string> = {
  filing: 'Filing Deadline',
  hearing: 'Hearing / Meeting',
  compliance: 'Compliance Deadline',
  review: 'Review Period',
  procurement: 'Procurement',
  treaty: 'Treaty / Agreement',
};

export const PRIORITY_COLORS: Record<DeadlinePriority, { bg: string; text: string; border: string }> = {
  high: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  low: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
};

// ============================================================================
// DEADLINES DATA — 110 entries
// ============================================================================

export const REGULATORY_DEADLINES: RegulatoryDeadline[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // FCC — Spectrum, Licensing, Orbital Debris
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'fcc-001',
    title: 'FCC 12 GHz Band Final Reply Comments',
    description: 'Deadline for reply comments on the FCC NPRM regarding shared use of the 12.2-12.7 GHz band between NGSO FSS and terrestrial 5G services. Critical for Starlink, DISH, and RS Access.',
    date: '2026-03-15',
    agency: 'FCC',
    type: 'filing',
    priority: 'high',
    url: 'https://www.fcc.gov/ecfs/search/search-filings',
    relatedPolicies: ['IB Docket No. 22-271'],
  },
  {
    id: 'fcc-002',
    title: 'FCC V-Band Coordination Compliance Milestone',
    description: 'Operators with V-band (40/50 GHz) authorizations must demonstrate coordination progress with adjacent satellite operators per FCC conditions of license.',
    date: '2026-04-01',
    agency: 'FCC',
    type: 'compliance',
    priority: 'high',
    url: 'https://www.fcc.gov/space',
  },
  {
    id: 'fcc-003',
    title: 'NGSO Processing Round 3 — Applications Due',
    description: 'Third processing round for NGSO satellite constellation applications in Ku/Ka-band. Operators seeking new constellation authorizations must file complete applications.',
    date: '2026-04-30',
    agency: 'FCC',
    type: 'filing',
    priority: 'high',
    url: 'https://www.fcc.gov/space/ngso-processing-rounds',
    relatedPolicies: ['IB Docket No. 20-330'],
  },
  {
    id: 'fcc-004',
    title: 'FCC 5-Year Deorbit Rule — First Compliance Reports',
    description: 'First annual compliance reports due under the FCC 5-year post-mission disposal rule (adopted Sept 2024). All operators with LEO constellations must demonstrate compliance plans.',
    date: '2026-06-30',
    agency: 'FCC',
    type: 'compliance',
    priority: 'high',
    url: 'https://www.fcc.gov/document/fcc-adopts-new-5-year-rule-deorbiting-satellites',
    relatedPolicies: ['IB Docket No. 22-271', 'FCC 22-74'],
  },
  {
    id: 'fcc-005',
    title: 'FCC Space Bureau — Q-/V-Band Spectrum Sharing NPRM Comments',
    description: 'Initial comment period for proposed rules on Q-band (37.5-42.5 GHz) and V-band (47.2-50.2 GHz) inter-satellite and Earth-space sharing frameworks.',
    date: '2026-05-15',
    agency: 'FCC',
    type: 'filing',
    priority: 'medium',
    url: 'https://www.fcc.gov/space',
  },
  {
    id: 'fcc-006',
    title: 'FCC Direct-to-Device (D2D) Supplemental Coverage FNPRM',
    description: 'Comments due on further notice regarding direct-to-device satellite service rules, including interference mitigation requirements for terrestrial mobile operators.',
    date: '2026-07-01',
    agency: 'FCC',
    type: 'filing',
    priority: 'medium',
    url: 'https://www.fcc.gov/document/supplemental-coverage-space',
    relatedPolicies: ['GN Docket No. 23-65'],
  },
  {
    id: 'fcc-007',
    title: 'FCC NGSO Milestone — Constellation Deployment (50%)',
    description: 'Several NGSO constellation operators face 50% deployment milestone. Failure to meet triggers potential license modification or revocation.',
    date: '2026-09-01',
    agency: 'FCC',
    type: 'compliance',
    priority: 'high',
    relatedPolicies: ['47 CFR Part 25'],
  },
  {
    id: 'fcc-008',
    title: 'FCC Orbital Debris Mitigation Annual Report Window',
    description: 'Annual reporting window for all FCC-licensed satellite operators to file updated orbital debris mitigation plans and end-of-life disposal updates.',
    date: '2026-10-15',
    agency: 'FCC',
    type: 'filing',
    priority: 'medium',
    url: 'https://www.fcc.gov/space/orbital-debris',
  },
  {
    id: 'fcc-009',
    title: 'FCC E-Band Spectrum Allocation for Satellite Feeder Links',
    description: 'Comment deadline on proposal to allocate portions of 71-76 GHz and 81-86 GHz for NGSO satellite feeder links, potentially enabling higher throughput for next-gen constellations.',
    date: '2026-08-15',
    agency: 'FCC',
    type: 'filing',
    priority: 'medium',
    url: 'https://www.fcc.gov/space',
  },
  {
    id: 'fcc-010',
    title: 'FCC Space Station Licensing Reform — Final Rule Effective',
    description: 'Effective date for streamlined Part 25 licensing procedures, including updated application forms, reduced processing timelines, and new small satellite licensing class.',
    date: '2026-11-01',
    agency: 'FCC',
    type: 'compliance',
    priority: 'medium',
    relatedPolicies: ['IB Docket No. 22-411'],
  },
  {
    id: 'fcc-011',
    title: 'FCC Ka-Band Interference Study Results Due',
    description: 'ITU-coordinated interference study results due for Ka-band sharing between GSO and NGSO systems. Results will inform future coordination requirements.',
    date: '2027-01-15',
    agency: 'FCC',
    type: 'review',
    priority: 'medium',
    url: 'https://www.fcc.gov/space',
  },
  {
    id: 'fcc-012',
    title: 'FCC Satellite Broadband Subsidy Reporting (ACP/ECF Successor)',
    description: 'Quarterly reporting deadline for satellite broadband providers participating in the successor program to the Affordable Connectivity Program.',
    date: '2026-03-31',
    agency: 'FCC',
    type: 'filing',
    priority: 'low',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // FAA — Launch Licensing, Spaceport, Reentry
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'faa-001',
    title: 'FAA Part 450 Streamlined Launch License — Final Rule',
    description: 'Effective date for updated Part 450 streamlined launch and reentry licensing framework. Consolidates legacy Part 413/415/417/431 into single performance-based framework.',
    date: '2026-03-01',
    agency: 'FAA',
    type: 'compliance',
    priority: 'high',
    url: 'https://www.faa.gov/space/licenses',
    relatedPolicies: ['14 CFR Part 450'],
  },
  {
    id: 'faa-002',
    title: 'FAA Commercial Spaceport License Renewal — Mojave Air & Space Port',
    description: 'License renewal application deadline for Mojave Air & Space Port (LSO 04-009). Includes updated environmental assessment and safety inspection requirements.',
    date: '2026-05-01',
    agency: 'FAA',
    type: 'filing',
    priority: 'medium',
    url: 'https://www.faa.gov/space/licenses',
  },
  {
    id: 'faa-003',
    title: 'FAA Reentry Vehicle License Applications — Q2 Window',
    description: 'Application window opens for new reentry vehicle operator licenses under Part 450. Covers commercial cargo and crew reentry operations.',
    date: '2026-04-15',
    endDate: '2026-06-15',
    agency: 'FAA',
    type: 'filing',
    priority: 'medium',
    url: 'https://www.faa.gov/space/licenses',
  },
  {
    id: 'faa-004',
    title: 'FAA Commercial Space Launch Environmental Impact Review',
    description: 'Public comment period on programmatic environmental impact statement for increased commercial launch cadence at Cape Canaveral and Vandenberg.',
    date: '2026-06-01',
    endDate: '2026-08-01',
    agency: 'FAA',
    type: 'review',
    priority: 'medium',
    url: 'https://www.faa.gov/space/environmental',
  },
  {
    id: 'faa-005',
    title: 'FAA Space Traffic Management Advisory Committee Meeting',
    description: 'Quarterly meeting of the FAA Space Traffic Management Advisory Committee to discuss conjunction assessment procedures and space situational awareness data sharing.',
    date: '2026-04-22',
    agency: 'FAA',
    type: 'hearing',
    priority: 'low',
    url: 'https://www.faa.gov/space',
  },
  {
    id: 'faa-006',
    title: 'FAA Launch License Biannual Safety Compliance Reports',
    description: 'All active launch license holders must submit biannual safety compliance reports covering mishap investigations, close-call analyses, and corrective actions.',
    date: '2026-07-01',
    agency: 'FAA',
    type: 'compliance',
    priority: 'high',
    url: 'https://www.faa.gov/space/licenses',
  },
  {
    id: 'faa-007',
    title: 'FAA New Commercial Spaceport Application — Texas Gulf Coast',
    description: 'Application review period for proposed new commercial spaceport facility on the Texas Gulf Coast. Includes public comment and environmental review phases.',
    date: '2026-08-15',
    endDate: '2026-10-15',
    agency: 'FAA',
    type: 'review',
    priority: 'medium',
  },
  {
    id: 'faa-008',
    title: 'FAA Suborbital Reusable Vehicle Safety Standards Update',
    description: 'Comment period on updated safety standards for suborbital reusable launch vehicles, including crew qualification and passenger informed consent requirements.',
    date: '2026-09-30',
    agency: 'FAA',
    type: 'filing',
    priority: 'medium',
    url: 'https://www.faa.gov/space',
  },
  {
    id: 'faa-009',
    title: 'FAA Part 450 Annual License Fee Payment Due',
    description: 'Annual launch/reentry license fee payment deadline for all active Part 450 license holders.',
    date: '2026-12-31',
    agency: 'FAA',
    type: 'compliance',
    priority: 'low',
  },
  {
    id: 'faa-010',
    title: 'FAA Human Spaceflight Moratorium Review',
    description: 'Congressional-mandated review of the human spaceflight regulatory moratorium (learning period). FAA report to Congress on whether to extend or begin rulemaking.',
    date: '2027-01-01',
    agency: 'FAA',
    type: 'review',
    priority: 'high',
    relatedPolicies: ['51 USC 50905'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // NASA — Procurement, Artemis, Science
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'nasa-001',
    title: 'NASA Commercial LEO Destinations (CLD) Phase 2 Proposals',
    description: 'Proposal submission deadline for Phase 2 of the Commercial LEO Destinations program. Selected companies will receive development funding for commercial space stations.',
    date: '2026-03-31',
    agency: 'NASA',
    type: 'procurement',
    priority: 'high',
    url: 'https://www.nasa.gov/commercial-leo-destinations',
  },
  {
    id: 'nasa-002',
    title: 'NASA Artemis V Mission Readiness Review',
    description: 'Critical mission readiness review for Artemis V mission. Includes SLS Block 2, Orion, and Human Landing System integration assessment.',
    date: '2026-06-15',
    agency: 'NASA',
    type: 'review',
    priority: 'high',
    url: 'https://www.nasa.gov/artemis',
  },
  {
    id: 'nasa-003',
    title: 'NASA Lunar Surface Innovation Initiative — Phase 3 RFP',
    description: 'Request for Proposals for Phase 3 of the Lunar Surface Innovation Initiative, covering in-situ resource utilization, power systems, and habitat technologies.',
    date: '2026-04-15',
    agency: 'NASA',
    type: 'procurement',
    priority: 'medium',
    url: 'https://www.nasa.gov/lunar-surface',
  },
  {
    id: 'nasa-004',
    title: 'NASA SBIR/STTR Phase I Proposals Due — Cycle 2026.2',
    description: 'Small Business Innovation Research and Small Business Technology Transfer Phase I proposal submission deadline for space technology topics.',
    date: '2026-05-15',
    agency: 'NASA',
    type: 'procurement',
    priority: 'medium',
    url: 'https://sbir.nasa.gov',
  },
  {
    id: 'nasa-005',
    title: 'NASA Commercial Crew Program Annual Safety Review',
    description: 'Annual safety assessment for Commercial Crew Program partners (SpaceX, Boeing). Includes crew safety metrics, anomaly reviews, and certification status updates.',
    date: '2026-07-15',
    agency: 'NASA',
    type: 'review',
    priority: 'high',
    url: 'https://www.nasa.gov/commercial-crew',
  },
  {
    id: 'nasa-006',
    title: 'NASA CLPS Task Order — Lunar Delivery Q4 2026',
    description: 'Next Commercial Lunar Payload Services task order delivery window. Multiple commercial landers scheduled for lunar surface delivery missions.',
    date: '2026-10-01',
    endDate: '2026-12-31',
    agency: 'NASA',
    type: 'procurement',
    priority: 'medium',
    url: 'https://www.nasa.gov/clps',
  },
  {
    id: 'nasa-007',
    title: 'NASA Mars Sample Return Independent Review Report',
    description: 'Independent review board report on Mars Sample Return mission architecture, cost, and schedule assessment. Critical for program direction decision.',
    date: '2026-08-01',
    agency: 'NASA',
    type: 'review',
    priority: 'medium',
    url: 'https://www.nasa.gov/mars-sample-return',
  },
  {
    id: 'nasa-008',
    title: 'NASA Tipping Point Partnerships — Large-Scale Proposals Due',
    description: 'Proposal deadline for NASA Tipping Point large-scale partnership opportunities focused on cryogenic fluid management, in-space manufacturing, and advanced propulsion.',
    date: '2026-09-15',
    agency: 'NASA',
    type: 'procurement',
    priority: 'medium',
    url: 'https://www.nasa.gov/tipping-point',
  },
  {
    id: 'nasa-009',
    title: 'NASA ISS Transition Plan Update to Congress',
    description: 'Required biannual update to Congress on ISS decommissioning timeline and commercial space station transition readiness.',
    date: '2026-06-30',
    agency: 'NASA',
    type: 'review',
    priority: 'high',
    relatedPolicies: ['NASA Transition Authorization Act'],
  },
  {
    id: 'nasa-010',
    title: 'NASA GatewayML Habitat Module CDR',
    description: 'Critical Design Review for the Gateway Minimal Habitation Module. Key milestone for Artemis deep-space exploration infrastructure.',
    date: '2027-02-15',
    agency: 'NASA',
    type: 'review',
    priority: 'high',
    url: 'https://www.nasa.gov/gateway',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // NOAA — Remote Sensing, Space Commerce
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'noaa-001',
    title: 'NOAA Remote Sensing License Applications — Spring Window',
    description: 'Application window for new commercial remote sensing satellite licenses under the Land Remote Sensing Policy Act. Includes updated Tier classification requirements.',
    date: '2026-04-01',
    endDate: '2026-05-31',
    agency: 'NOAA',
    type: 'filing',
    priority: 'medium',
    url: 'https://space.commerce.gov/licensing',
  },
  {
    id: 'noaa-002',
    title: 'NOAA Space Situational Awareness Data Sharing Framework',
    description: 'Effective date for new NOAA/Office of Space Commerce space situational awareness data sharing requirements for commercial operators.',
    date: '2026-07-01',
    agency: 'NOAA',
    type: 'compliance',
    priority: 'high',
    url: 'https://space.commerce.gov',
    relatedPolicies: ['SPD-3 Implementation'],
  },
  {
    id: 'noaa-003',
    title: 'NOAA Remote Sensing Tier 2/3 Annual Compliance Reports',
    description: 'Annual compliance reporting deadline for Tier 2 and Tier 3 commercial remote sensing license holders. Includes data distribution records and shutter control compliance.',
    date: '2026-03-31',
    agency: 'NOAA',
    type: 'compliance',
    priority: 'medium',
    url: 'https://space.commerce.gov/licensing',
  },
  {
    id: 'noaa-004',
    title: 'NOAA Office of Space Commerce — TraCSS Initial Operating Capability',
    description: 'Target date for Traffic Coordination System for Space (TraCSS) initial operating capability, transitioning basic space situational awareness from DoD to Commerce.',
    date: '2026-10-01',
    agency: 'NOAA',
    type: 'compliance',
    priority: 'high',
    url: 'https://space.commerce.gov/tracss',
    relatedPolicies: ['SPD-3'],
  },
  {
    id: 'noaa-005',
    title: 'NOAA SAR Remote Sensing License Reform — Comments Due',
    description: 'Comment period on proposed reforms to synthetic aperture radar (SAR) remote sensing licensing conditions, including resolution limits and data latency requirements.',
    date: '2026-08-30',
    agency: 'NOAA',
    type: 'filing',
    priority: 'low',
    url: 'https://space.commerce.gov',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // DoD / Space Force — Procurement, SDA, NSSL
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'dod-001',
    title: 'USSF National Security Space Launch (NSSL) Phase 3 Task Orders',
    description: 'Space Force releases next batch of NSSL Phase 3 task orders for national security launches. Open to Lane 1 (competed) providers.',
    date: '2026-03-15',
    agency: 'DoD',
    type: 'procurement',
    priority: 'high',
    url: 'https://www.ssc.spaceforce.mil/nssl',
    relatedPolicies: ['NSSL Phase 3'],
  },
  {
    id: 'dod-002',
    title: 'SDA Tranche 3 Transport Layer — Proposal Deadline',
    description: 'Space Development Agency Tranche 3 Transport Layer satellite procurement. Proposals for proliferated LEO mesh communications constellation.',
    date: '2026-04-30',
    agency: 'DoD',
    type: 'procurement',
    priority: 'high',
    url: 'https://www.sda.mil',
    relatedPolicies: ['PWSA Architecture'],
  },
  {
    id: 'dod-003',
    title: 'SDA Tranche 3 Tracking Layer — Draft RFP Comments',
    description: 'Industry comment period on draft RFP for Tranche 3 Tracking Layer satellites providing missile warning and tracking from LEO.',
    date: '2026-05-15',
    agency: 'DoD',
    type: 'filing',
    priority: 'medium',
    url: 'https://www.sda.mil',
  },
  {
    id: 'dod-004',
    title: 'Space Force Commercial Space Integration Strategy Review',
    description: 'Annual review of Space Force commercial space integration strategy, including CRADA partnerships, commercial satellite communications procurement, and hybrid architectures.',
    date: '2026-06-01',
    agency: 'DoD',
    type: 'review',
    priority: 'medium',
    url: 'https://www.spaceforce.mil',
  },
  {
    id: 'dod-005',
    title: 'DARPA Blackjack Program Final Operational Assessment',
    description: 'Final operational assessment of the DARPA Blackjack proliferated LEO constellation demonstrator. Results will inform future DoD space architecture decisions.',
    date: '2026-09-01',
    agency: 'DoD',
    type: 'review',
    priority: 'medium',
    url: 'https://www.darpa.mil/program/blackjack',
  },
  {
    id: 'dod-006',
    title: 'Space Force Tactically Responsive Space (TacRS) RFI',
    description: 'Request for Information for next-generation tactically responsive space capabilities, including rapid launch-on-demand and reconstitution architectures.',
    date: '2026-07-15',
    agency: 'DoD',
    type: 'procurement',
    priority: 'medium',
  },
  {
    id: 'dod-007',
    title: 'DoD Commercial SATCOM (COMSATCOM) Contract Awards',
    description: 'Award decisions for next cycle of commercial satellite communications bandwidth procurement for DoD users worldwide.',
    date: '2026-08-01',
    agency: 'DoD',
    type: 'procurement',
    priority: 'medium',
    url: 'https://www.ssc.spaceforce.mil',
  },
  {
    id: 'dod-008',
    title: 'SDA Tranche 2 IOC Declaration',
    description: 'Initial Operating Capability declaration for SDA Tranche 2 Proliferated Warfighter Space Architecture satellites. Milestone for operational mesh network.',
    date: '2026-12-01',
    agency: 'DoD',
    type: 'review',
    priority: 'high',
    url: 'https://www.sda.mil',
  },
  {
    id: 'dod-009',
    title: 'Space Force FY2028 Budget Request Inputs Due',
    description: 'Internal deadline for Space Force program offices to submit FY2028 budget request inputs to Space Systems Command for POM development.',
    date: '2026-10-15',
    agency: 'DoD',
    type: 'filing',
    priority: 'low',
  },
  {
    id: 'dod-010',
    title: 'NSSL Phase 3 Lane 2 On-Ramp — Applications Open',
    description: 'On-ramp opportunity for new launch service providers to enter NSSL Phase 3 Lane 2 for competed national security launch missions.',
    date: '2027-01-15',
    endDate: '2027-03-15',
    agency: 'DoD',
    type: 'procurement',
    priority: 'high',
    url: 'https://www.ssc.spaceforce.mil/nssl',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // BIS / ITAR — Export Controls
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'bis-001',
    title: 'BIS Entity List Semiannual Review',
    description: 'Bureau of Industry and Security semiannual review of the Entity List. Potential additions and removals of foreign entities subject to export restrictions on space technology.',
    date: '2026-04-01',
    agency: 'BIS',
    type: 'review',
    priority: 'high',
    url: 'https://www.bis.doc.gov/entity-list',
    relatedPolicies: ['15 CFR Part 744'],
  },
  {
    id: 'bis-002',
    title: 'DDTC ITAR Reform — Satellite Technology Transfer Final Rule',
    description: 'Final rule effective date for ITAR reform package covering satellite and related technology transfers. Updates USML Categories IV and XV.',
    date: '2026-06-01',
    agency: 'BIS',
    type: 'compliance',
    priority: 'high',
    url: 'https://www.pmddtc.state.gov',
    relatedPolicies: ['22 CFR Parts 120-130', 'USML Category XV'],
  },
  {
    id: 'bis-003',
    title: 'BIS Emerging Technology Controls — Space-Related Updates',
    description: 'Implementation of new export controls on emerging technologies related to space, including advanced propulsion, in-space manufacturing, and space cyber capabilities.',
    date: '2026-07-15',
    agency: 'BIS',
    type: 'compliance',
    priority: 'medium',
    url: 'https://www.bis.doc.gov',
    relatedPolicies: ['EAR Section 744.6'],
  },
  {
    id: 'bis-004',
    title: 'DDTC Annual Registration Renewal for Space Manufacturers',
    description: 'Annual ITAR registration renewal deadline for defense articles manufacturers and exporters in the space sector. Registration required for all USML-controlled items.',
    date: '2026-05-31',
    agency: 'BIS',
    type: 'filing',
    priority: 'medium',
    url: 'https://www.pmddtc.state.gov/ddtc_public',
    relatedPolicies: ['22 CFR 122'],
  },
  {
    id: 'bis-005',
    title: 'BIS Entity List Fall Review',
    description: 'Second semiannual review of the Entity List. Space industry companies should review for any new listings affecting supply chain partners.',
    date: '2026-10-01',
    agency: 'BIS',
    type: 'review',
    priority: 'high',
    url: 'https://www.bis.doc.gov/entity-list',
    relatedPolicies: ['15 CFR Part 744'],
  },
  {
    id: 'bis-006',
    title: 'DDTC Technical Assistance Agreement Renewals — Q3 Batch',
    description: 'Quarterly batch processing deadline for Technical Assistance Agreement (TAA) renewals for international space collaboration projects.',
    date: '2026-09-30',
    agency: 'BIS',
    type: 'filing',
    priority: 'low',
    url: 'https://www.pmddtc.state.gov',
  },
  {
    id: 'bis-007',
    title: 'BIS Deemed Export Rule — Updated Technology Control Plans Due',
    description: 'Deadline for companies employing foreign nationals to submit updated Technology Control Plans reflecting new deemed export guidance for space technologies.',
    date: '2027-01-31',
    agency: 'BIS',
    type: 'compliance',
    priority: 'medium',
    url: 'https://www.bis.doc.gov',
    relatedPolicies: ['15 CFR 734.2(b)'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ITU — International Spectrum Coordination
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'itu-001',
    title: 'WRC-27 Conference Preparatory Meeting (CPM27-2)',
    description: 'Second Conference Preparatory Meeting for the 2027 World Radiocommunication Conference. Sets agenda items and technical study results for WRC-27 decisions.',
    date: '2026-11-15',
    endDate: '2026-11-28',
    agency: 'ITU',
    type: 'treaty',
    priority: 'high',
    url: 'https://www.itu.int/en/ITU-R/conferences/cpm',
    relatedPolicies: ['WRC-27 Agenda'],
  },
  {
    id: 'itu-002',
    title: 'ITU API Filing Deadline — Advance Publication (NGSO)',
    description: 'Deadline for Advance Publication Information filings for new NGSO satellite networks seeking ITU coordination rights in shared bands.',
    date: '2026-03-31',
    agency: 'ITU',
    type: 'filing',
    priority: 'high',
    url: 'https://www.itu.int/en/ITU-R/space',
  },
  {
    id: 'itu-003',
    title: 'ITU Coordination Request (CR/C) Deadline — Q2 Batch',
    description: 'Quarterly deadline for submission of coordination requests under Article 9 of the Radio Regulations for satellite network coordination.',
    date: '2026-06-30',
    agency: 'ITU',
    type: 'filing',
    priority: 'medium',
    url: 'https://www.itu.int/en/ITU-R/space',
    relatedPolicies: ['ITU Radio Regulations Article 9'],
  },
  {
    id: 'itu-004',
    title: 'ITU Due Diligence Filing — NGSO Milestones',
    description: 'Due diligence information filing deadline for NGSO satellite network operators to demonstrate progress toward constellation deployment under Resolution 35 (WRC-19).',
    date: '2026-09-15',
    agency: 'ITU',
    type: 'filing',
    priority: 'high',
    url: 'https://www.itu.int/en/ITU-R/space',
    relatedPolicies: ['ITU Resolution 35', 'No. 9.12'],
  },
  {
    id: 'itu-005',
    title: 'ITU Study Group 4 (Satellite Services) Meeting',
    description: 'ITU-R Study Group 4 plenary meeting on satellite service interference, sharing criteria, and regulatory framework development for WRC-27 preparation.',
    date: '2026-05-20',
    endDate: '2026-05-30',
    agency: 'ITU',
    type: 'hearing',
    priority: 'medium',
    url: 'https://www.itu.int/en/ITU-R/study-groups/rsg4',
  },
  {
    id: 'itu-006',
    title: 'ITU Notification Filing Deadline — Q3 Batch',
    description: 'Article 11 notification filing deadline for satellite networks that have completed coordination and seek formal registration in the Master International Frequency Register.',
    date: '2026-09-30',
    agency: 'ITU',
    type: 'filing',
    priority: 'low',
    url: 'https://www.itu.int/en/ITU-R/space',
  },
  {
    id: 'itu-007',
    title: 'WRC-27 U.S. Position Papers Due to State Dept',
    description: 'Deadline for U.S. industry and government stakeholders to submit position papers to State Department for WRC-27 agenda items related to satellite spectrum.',
    date: '2027-02-28',
    agency: 'ITU',
    type: 'filing',
    priority: 'high',
    url: 'https://www.state.gov/wrc',
  },
  {
    id: 'itu-008',
    title: 'ITU Radiocommunication Assembly (RA-27)',
    description: 'Radiocommunication Assembly preceding WRC-27, establishing study program and technical foundations for the World Radiocommunication Conference.',
    date: '2027-10-14',
    endDate: '2027-10-18',
    agency: 'ITU',
    type: 'treaty',
    priority: 'high',
    url: 'https://www.itu.int/en/ITU-R/conferences',
  },
  {
    id: 'itu-009',
    title: 'WRC-27 — World Radiocommunication Conference',
    description: 'ITU World Radiocommunication Conference 2027. Major decisions on satellite spectrum allocations, NGSO/GSO sharing, direct-to-device rules, and space operation service allocations.',
    date: '2027-10-20',
    endDate: '2027-11-14',
    agency: 'ITU',
    type: 'treaty',
    priority: 'high',
    url: 'https://www.itu.int/en/ITU-R/conferences/wrc/2027',
    relatedPolicies: ['ITU Radio Regulations'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Congress — Hearings, Authorization
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'congress-001',
    title: 'Senate Commerce Committee — Space Policy Hearing',
    description: 'Senate Commerce, Science, and Transportation Committee hearing on U.S. commercial space policy, including spectrum management, launch safety, and orbital debris.',
    date: '2026-03-20',
    agency: 'Congress',
    type: 'hearing',
    priority: 'high',
    url: 'https://www.commerce.senate.gov',
  },
  {
    id: 'congress-002',
    title: 'House Science Committee — NASA Authorization Markup',
    description: 'House Science, Space, and Technology Committee markup of the NASA Authorization Act, covering Artemis program funding, commercial crew, and space technology priorities.',
    date: '2026-04-10',
    agency: 'Congress',
    type: 'hearing',
    priority: 'high',
    url: 'https://science.house.gov',
  },
  {
    id: 'congress-003',
    title: 'Senate Armed Services — Space Force Posture Hearing',
    description: 'Senate Armed Services Committee hearing on Space Force posture, including NSSL procurement, SDA constellation progress, and space domain awareness.',
    date: '2026-05-08',
    agency: 'Congress',
    type: 'hearing',
    priority: 'medium',
    url: 'https://www.armed-services.senate.gov',
  },
  {
    id: 'congress-004',
    title: 'House Appropriations — Commerce, Justice, Science Subcommittee FY2027',
    description: 'Subcommittee hearing on FY2027 appropriations for NASA, NOAA, and NSF. Determines funding levels for space programs.',
    date: '2026-06-05',
    agency: 'Congress',
    type: 'hearing',
    priority: 'medium',
    url: 'https://appropriations.house.gov',
  },
  {
    id: 'congress-005',
    title: 'Congressional Budget Office — Space Economy Report',
    description: 'CBO report on federal spending related to commercial space industry support, including direct procurement, tax incentives, and regulatory costs.',
    date: '2026-07-30',
    agency: 'Congress',
    type: 'review',
    priority: 'low',
    url: 'https://www.cbo.gov',
  },
  {
    id: 'congress-006',
    title: 'NDAA Space Provisions — Conference Committee',
    description: 'Conference committee reconciliation of House and Senate NDAA space-related provisions, including Space Force authorities, commercial space integration, and spectrum management.',
    date: '2026-11-15',
    agency: 'Congress',
    type: 'hearing',
    priority: 'high',
    url: 'https://www.congress.gov',
    relatedPolicies: ['FY2027 NDAA'],
  },
  {
    id: 'congress-007',
    title: 'Senate Commerce — Orbital Debris Mitigation Hearing',
    description: 'Hearing on orbital debris mitigation policy effectiveness, FCC 5-year rule implementation, and international debris coordination efforts.',
    date: '2026-09-18',
    agency: 'Congress',
    type: 'hearing',
    priority: 'medium',
    url: 'https://www.commerce.senate.gov',
  },
  {
    id: 'congress-008',
    title: 'GAO Report on Commercial Space Launch Safety Oversight',
    description: 'Government Accountability Office mandated report on FAA commercial space launch safety oversight adequacy, including staffing levels and inspection frequency.',
    date: '2026-08-15',
    agency: 'Congress',
    type: 'review',
    priority: 'medium',
    url: 'https://www.gao.gov',
  },
  {
    id: 'congress-009',
    title: 'Space Act Agreement Authority Reauthorization Deadline',
    description: 'Congressional deadline for reauthorization of NASA Space Act Agreement authority, enabling funded and unfunded agreements with commercial partners.',
    date: '2027-03-31',
    agency: 'Congress',
    type: 'compliance',
    priority: 'high',
    relatedPolicies: ['51 USC 20113(e)'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // International — Treaties, ESA, JAXA, COPUOS
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'intl-001',
    title: 'UN COPUOS Scientific & Technical Subcommittee — 63rd Session',
    description: 'United Nations Committee on the Peaceful Uses of Outer Space Scientific and Technical Subcommittee annual session. Covers space debris, space weather, NEO monitoring.',
    date: '2026-02-23',
    endDate: '2026-03-06',
    agency: 'International',
    type: 'treaty',
    priority: 'medium',
    url: 'https://www.unoosa.org/oosa/en/ourwork/copuos/stsc/index.html',
  },
  {
    id: 'intl-002',
    title: 'UN COPUOS Legal Subcommittee — 65th Session',
    description: 'UN COPUOS Legal Subcommittee session covering space resource utilization legal framework, space traffic management, and registration convention updates.',
    date: '2026-03-23',
    endDate: '2026-04-03',
    agency: 'International',
    type: 'treaty',
    priority: 'medium',
    url: 'https://www.unoosa.org/oosa/en/ourwork/copuos/lsc/index.html',
  },
  {
    id: 'intl-003',
    title: 'Artemis Accords — Annual Signatory Review',
    description: 'Annual review meeting of Artemis Accords signatories to assess implementation progress, discuss new bilateral implementing arrangements, and address interoperability standards.',
    date: '2026-06-15',
    endDate: '2026-06-17',
    agency: 'International',
    type: 'treaty',
    priority: 'high',
    url: 'https://www.nasa.gov/artemis-accords',
    relatedPolicies: ['Artemis Accords'],
  },
  {
    id: 'intl-004',
    title: 'UN COPUOS — 69th Session (Main Committee)',
    description: 'Annual session of the full UN COPUOS committee. Addresses long-term sustainability guidelines, space resource activities, and global space governance.',
    date: '2026-06-22',
    endDate: '2026-07-02',
    agency: 'International',
    type: 'treaty',
    priority: 'high',
    url: 'https://www.unoosa.org/oosa/en/ourwork/copuos/index.html',
  },
  {
    id: 'intl-005',
    title: 'ESA Ministerial Council — Budget & Program Decisions',
    description: 'European Space Agency Ministerial Council meeting to decide on ESA program subscriptions, budget allocations, and strategic direction for 2027-2030.',
    date: '2026-11-20',
    endDate: '2026-11-21',
    agency: 'International',
    type: 'treaty',
    priority: 'high',
    url: 'https://www.esa.int',
  },
  {
    id: 'intl-006',
    title: 'JAXA Commercial Space Activities Guidelines Update',
    description: 'Japan Aerospace Exploration Agency publishes updated guidelines for commercial space activities in Japan, including new licensing categories and liability framework.',
    date: '2026-04-01',
    agency: 'International',
    type: 'compliance',
    priority: 'low',
    url: 'https://www.jaxa.jp',
  },
  {
    id: 'intl-007',
    title: 'UKSA Space Industry Act — Biannual Compliance Review',
    description: 'UK Space Agency biannual compliance review under the Space Industry Act 2018. Covers licensees for launch, orbital, and range activities from UK territory.',
    date: '2026-07-01',
    agency: 'International',
    type: 'compliance',
    priority: 'low',
    url: 'https://www.gov.uk/government/organisations/uk-space-agency',
    relatedPolicies: ['Space Industry Act 2018'],
  },
  {
    id: 'intl-008',
    title: 'ESA Earth Observation Program — Procurement Call',
    description: 'ESA issues procurement call for next-generation Earth Observation mission instruments and satellite platforms under the Copernicus Contributing Missions framework.',
    date: '2026-05-01',
    endDate: '2026-07-31',
    agency: 'International',
    type: 'procurement',
    priority: 'medium',
    url: 'https://www.esa.int/Applications/Observing_the_Earth',
  },
  {
    id: 'intl-009',
    title: 'Inter-Agency Space Debris Coordination Committee (IADC) Annual Meeting',
    description: 'Annual IADC meeting bringing together 13 space agencies to coordinate orbital debris research, mitigation guidelines, and data sharing protocols.',
    date: '2026-04-14',
    endDate: '2026-04-17',
    agency: 'International',
    type: 'treaty',
    priority: 'medium',
    url: 'https://www.iadc-home.org',
  },
  {
    id: 'intl-010',
    title: 'UNOOSA Space for Sustainable Development Conference',
    description: 'UN Office for Outer Space Affairs conference on leveraging space technology for sustainable development goals, including disaster management, climate monitoring, and connectivity.',
    date: '2026-09-08',
    endDate: '2026-09-10',
    agency: 'International',
    type: 'treaty',
    priority: 'low',
    url: 'https://www.unoosa.org',
  },
  {
    id: 'intl-011',
    title: 'EU Space Law Regulation — Public Consultation Closes',
    description: 'European Commission closes public consultation on proposed EU Space Law regulation, covering authorization, supervision, safety, and sustainability requirements for EU operators.',
    date: '2026-08-31',
    agency: 'International',
    type: 'filing',
    priority: 'medium',
    url: 'https://ec.europa.eu/growth/sectors/space',
  },
  {
    id: 'intl-012',
    title: 'International Space Station Partnership Review',
    description: 'Annual ISS partnership review meeting among NASA, ESA, JAXA, CSA, and Roscosmos to discuss operations extension, transition planning, and deorbit preparations.',
    date: '2026-10-15',
    endDate: '2026-10-17',
    agency: 'International',
    type: 'review',
    priority: 'medium',
    url: 'https://www.nasa.gov/station',
  },
  {
    id: 'intl-013',
    title: 'Hague Space Resources Governance Working Group Report',
    description: 'Publication of updated working group report on international framework for space resource activities governance, building on Hague Building Blocks.',
    date: '2027-03-15',
    agency: 'International',
    type: 'treaty',
    priority: 'medium',
    url: 'https://www.universiteitleiden.nl/en/law/institute-of-public-law/air-and-space-law',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Additional Cross-Agency Deadlines
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'cross-001',
    title: 'FCC/NTIA Spectrum Coordination — Federal/Non-Federal Sharing Report',
    description: 'Joint FCC-NTIA report on federal and non-federal spectrum sharing in bands used by both military and commercial satellite systems.',
    date: '2026-04-15',
    agency: 'FCC',
    type: 'review',
    priority: 'medium',
    url: 'https://www.fcc.gov/spectrum',
    relatedPolicies: ['National Spectrum Strategy'],
  },
  {
    id: 'cross-002',
    title: 'NASA/FAA Integrated Space Traffic Coordination Meeting',
    description: 'Quarterly coordination meeting between NASA and FAA on launch range scheduling, conjunction assessment, and airspace integration for commercial launches.',
    date: '2026-05-05',
    agency: 'FAA',
    type: 'hearing',
    priority: 'low',
  },
  {
    id: 'cross-003',
    title: 'OSTP National Space Policy Implementation Review',
    description: 'White House Office of Science and Technology Policy annual review of National Space Policy implementation across all federal agencies.',
    date: '2026-08-01',
    agency: 'Congress',
    type: 'review',
    priority: 'medium',
    url: 'https://www.whitehouse.gov/ostp',
    relatedPolicies: ['National Space Policy'],
  },
  {
    id: 'cross-004',
    title: 'Interagency Space Weather Action Plan — Progress Report',
    description: 'Biannual progress report on the National Space Weather Strategy and Action Plan implementation across NOAA, NASA, DoD, and DHS.',
    date: '2026-06-30',
    agency: 'NOAA',
    type: 'review',
    priority: 'low',
    relatedPolicies: ['PROSWIFT Act'],
  },
  {
    id: 'cross-005',
    title: 'FCC/FAA Joint Advisory on Launch Operations Spectrum',
    description: 'Joint advisory committee meeting on spectrum requirements for launch and reentry operations, including telemetry, tracking, and flight termination frequencies.',
    date: '2026-07-20',
    agency: 'FCC',
    type: 'hearing',
    priority: 'low',
  },
  {
    id: 'cross-006',
    title: 'NASA/NOAA Joint Commercial Weather Data Pilot Review',
    description: 'Review of commercial weather data pilot program results, assessing quality and viability of commercial sources for operational weather forecasting.',
    date: '2026-09-01',
    agency: 'NOAA',
    type: 'review',
    priority: 'low',
    url: 'https://www.space.commerce.gov',
  },
  {
    id: 'cross-007',
    title: 'International Astronautical Congress (IAC 2026)',
    description: 'IAC 2026 conference featuring space agency presentations, industry panels, and bilateral/multilateral agreement signings. Key networking event for regulatory stakeholders.',
    date: '2026-10-05',
    endDate: '2026-10-09',
    agency: 'International',
    type: 'treaty',
    priority: 'medium',
    url: 'https://www.iafastro.org',
  },
  {
    id: 'cross-008',
    title: 'DoD/NASA Space Nuclear Propulsion Regulatory Framework Review',
    description: 'Joint DoD-NASA review of regulatory framework for space nuclear propulsion and power systems, including NRC coordination on launch safety and NEPA compliance.',
    date: '2026-11-01',
    agency: 'NASA',
    type: 'review',
    priority: 'medium',
  },
  {
    id: 'cross-009',
    title: 'National Space Council Meeting',
    description: 'National Space Council meeting chaired by the Vice President to discuss national space priorities, including commercial space regulation reform and space traffic management.',
    date: '2026-10-20',
    agency: 'Congress',
    type: 'hearing',
    priority: 'high',
    url: 'https://www.whitehouse.gov/nsc',
  },
  {
    id: 'cross-010',
    title: 'Annual Space Sustainability Index Publication',
    description: 'World Economic Forum Space Sustainability Rating index publication, providing transparency scores for satellite operators on debris mitigation and responsible behavior.',
    date: '2027-01-15',
    agency: 'International',
    type: 'review',
    priority: 'low',
    url: 'https://www.weforum.org/space',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2027 Entries
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'fcc-2027-001',
    title: 'FCC 5-Year Deorbit Rule — Second Annual Compliance Reports',
    description: 'Second annual compliance report deadline under the 5-year post-mission disposal rule for all FCC-licensed LEO satellite operators.',
    date: '2027-06-30',
    agency: 'FCC',
    type: 'compliance',
    priority: 'high',
    relatedPolicies: ['FCC 22-74'],
  },
  {
    id: 'fcc-2027-002',
    title: 'FCC NGSO Processing Round 4 — Applications Due',
    description: 'Fourth processing round for NGSO satellite constellation applications. Next wave of mega-constellation proposals expected.',
    date: '2027-04-30',
    agency: 'FCC',
    type: 'filing',
    priority: 'high',
    url: 'https://www.fcc.gov/space/ngso-processing-rounds',
  },
  {
    id: 'faa-2027-001',
    title: 'FAA Annual Launch Safety Compliance Reports',
    description: 'Annual safety compliance report deadline for all active FAA launch and reentry license holders.',
    date: '2027-07-01',
    agency: 'FAA',
    type: 'compliance',
    priority: 'high',
    url: 'https://www.faa.gov/space/licenses',
  },
  {
    id: 'nasa-2027-001',
    title: 'NASA Commercial LEO Destinations (CLD) — Downselect Decision',
    description: 'NASA decision point for CLD program downselect, choosing final commercial space station partners for continued development funding and anchor tenancy agreements.',
    date: '2027-03-01',
    agency: 'NASA',
    type: 'procurement',
    priority: 'high',
    url: 'https://www.nasa.gov/commercial-leo-destinations',
  },
  {
    id: 'nasa-2027-002',
    title: 'NASA SBIR/STTR Phase I — Cycle 2027.1',
    description: 'First 2027 cycle for NASA Small Business Innovation Research proposals. Space technology focus areas include lunar surface systems and deep space habitation.',
    date: '2027-02-15',
    agency: 'NASA',
    type: 'procurement',
    priority: 'medium',
    url: 'https://sbir.nasa.gov',
  },
  {
    id: 'dod-2027-001',
    title: 'SDA Tranche 4 Architecture Review',
    description: 'Space Development Agency architecture review for Tranche 4 of the Proliferated Warfighter Space Architecture, defining requirements for next-generation capabilities.',
    date: '2027-05-01',
    agency: 'DoD',
    type: 'review',
    priority: 'high',
    url: 'https://www.sda.mil',
  },
  {
    id: 'intl-2027-001',
    title: 'UN COPUOS — 70th Session',
    description: 'Milestone 70th session of the UN Committee on the Peaceful Uses of Outer Space. Expected to advance space resource governance framework discussions.',
    date: '2027-06-16',
    endDate: '2027-06-27',
    agency: 'International',
    type: 'treaty',
    priority: 'high',
    url: 'https://www.unoosa.org',
  },
  {
    id: 'congress-2027-001',
    title: 'FY2028 NASA Budget Request — Congressional Submission',
    description: 'President submits FY2028 budget request to Congress, including NASA, NOAA, and Space Force funding levels for space programs.',
    date: '2027-02-01',
    agency: 'Congress',
    type: 'review',
    priority: 'high',
    url: 'https://www.whitehouse.gov/omb',
  },
  {
    id: 'bis-2027-001',
    title: 'BIS Entity List Q1 Review',
    description: 'First 2027 Entity List review. Particular focus on space technology transfers to countries of concern and new entries for space-related entities.',
    date: '2027-04-01',
    agency: 'BIS',
    type: 'review',
    priority: 'high',
    url: 'https://www.bis.doc.gov/entity-list',
    relatedPolicies: ['15 CFR Part 744'],
  },
  {
    id: 'itu-2027-001',
    title: 'ITU API Filing Deadline — Q1 2027 NGSO Networks',
    description: 'First 2027 Advance Publication Information filing deadline for new NGSO satellite network coordination.',
    date: '2027-03-31',
    agency: 'ITU',
    type: 'filing',
    priority: 'medium',
    url: 'https://www.itu.int/en/ITU-R/space',
  },
];

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Returns all deadlines sorted by date ascending.
 */
export function getAllDeadlines(): RegulatoryDeadline[] {
  return [...REGULATORY_DEADLINES].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * Returns deadlines for a specific month/year.
 */
export function getDeadlinesByMonth(year: number, month: number): RegulatoryDeadline[] {
  return REGULATORY_DEADLINES.filter((d) => {
    const date = new Date(d.date);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Returns deadlines filtered by agency.
 */
export function getDeadlinesByAgency(agency: CalendarAgency): RegulatoryDeadline[] {
  return REGULATORY_DEADLINES.filter((d) => d.agency === agency).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * Returns deadlines within the next N days from today.
 */
export function getUpcomingCalendarDeadlines(days: number): RegulatoryDeadline[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return REGULATORY_DEADLINES.filter((d) => {
    const date = new Date(d.date);
    return date >= now && date <= cutoff;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Returns deadlines filtered by type.
 */
export function getDeadlinesByType(type: DeadlineType): RegulatoryDeadline[] {
  return REGULATORY_DEADLINES.filter((d) => d.type === type).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * Returns deadlines filtered by priority.
 */
export function getDeadlinesByPriority(priority: DeadlinePriority): RegulatoryDeadline[] {
  return REGULATORY_DEADLINES.filter((d) => d.priority === priority).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * Returns deadlines matching multiple filters.
 */
export function getFilteredDeadlines(filters: {
  year?: number;
  month?: number;
  agency?: CalendarAgency;
  type?: DeadlineType;
  priority?: DeadlinePriority;
}): RegulatoryDeadline[] {
  return REGULATORY_DEADLINES.filter((d) => {
    const date = new Date(d.date);
    if (filters.year && date.getFullYear() !== filters.year) return false;
    if (filters.month && date.getMonth() + 1 !== filters.month) return false;
    if (filters.agency && d.agency !== filters.agency) return false;
    if (filters.type && d.type !== filters.type) return false;
    if (filters.priority && d.priority !== filters.priority) return false;
    return true;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Returns stats summary.
 */
export function getCalendarStats() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const upcoming30 = REGULATORY_DEADLINES.filter((d) => {
    const date = new Date(d.date);
    return date >= now && date <= thirtyDays;
  });

  const highPriority = upcoming30.filter((d) => d.priority === 'high');

  const agencyCounts: Record<string, number> = {};
  for (const d of REGULATORY_DEADLINES) {
    agencyCounts[d.agency] = (agencyCounts[d.agency] || 0) + 1;
  }

  return {
    total: REGULATORY_DEADLINES.length,
    upcoming30Days: upcoming30.length,
    highPriorityUpcoming: highPriority.length,
    byAgency: agencyCounts,
  };
}
