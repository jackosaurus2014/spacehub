'use client';

import { useState, useMemo } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

interface SpectrumBand {
  id: string;
  name: string;
  label: string;
  freqStartMHz: number;
  freqEndMHz: number;
  color: string;
  colorBg: string;
  colorBorder: string;
  colorText: string;
  wavelength: string;
  applications: string[];
  advantages: string[];
  disadvantages: string[];
  keyOperators: string[];
  rainFade: string;
  regulatoryBody: string;
  linkBudget: LinkBudget;
  terrestrialConflict?: TerrestrialConflict;
}

interface LinkBudget {
  freeSpacePathLossLEO: string;
  freeSpacePathLossGEO: string;
  typicalAntennaSize: string;
  dataRateCapability: string;
  rainAttenuation: {
    tropical: string;
    temperate: string;
    arctic: string;
  };
}

interface TerrestrialConflict {
  terrestrialUse: string;
  interferenceIssues: string;
  mitigationApproaches: string[];
}

interface EmergingTrend {
  title: string;
  description: string;
  status: 'active' | 'experimental' | 'concept';
  keyPlayers: string[];
  timeline: string;
}

interface RegulatoryRegion {
  region: string;
  name: string;
  description: string;
  keyBodies: string[];
  highlights: string[];
}

// ════════════════════════════════════════════════════════════════
// DATA
// ════════════════════════════════════════════════════════════════

const SPECTRUM_BANDS: SpectrumBand[] = [
  {
    id: 'uhf',
    name: 'UHF',
    label: 'UHF Band',
    freqStartMHz: 300,
    freqEndMHz: 1000,
    color: '#22c55e',
    colorBg: 'bg-green-500/10',
    colorBorder: 'border-green-500/30',
    colorText: 'text-green-400',
    wavelength: '30 cm - 1 m',
    applications: [
      'Military satellite communications (UHF SATCOM)',
      'Search and rescue beacons (COSPAS-SARSAT)',
      'Amateur radio satellite operations',
      'IoT satellite constellations (e.g., Myriota, Hiber)',
      'AIS ship tracking from orbit',
    ],
    advantages: [
      'Good penetration through foliage and buildings',
      'Smaller antenna requirements for mobile terminals',
      'Lower atmospheric attenuation',
      'Well-suited for narrowband data links',
    ],
    disadvantages: [
      'Limited bandwidth availability',
      'Congested spectrum (shared with terrestrial services)',
      'Lower data rates compared to higher bands',
      'Susceptible to urban RF interference',
    ],
    keyOperators: ['US DoD (UFO/MUOS)', 'NATO', 'Myriota', 'Hiber', 'ORBCOMM'],
    rainFade: 'Negligible - UHF signals experience minimal rain attenuation',
    regulatoryBody: 'ITU-R (Radio Regulations Article 5)',
    linkBudget: {
      freeSpacePathLossLEO: '~145 dB at 500 km altitude',
      freeSpacePathLossGEO: '~185 dB at 35,786 km',
      typicalAntennaSize: '0.3 - 1.5 m (helix or Yagi)',
      dataRateCapability: '1 kbps - 1 Mbps',
      rainAttenuation: {
        tropical: '< 0.1 dB',
        temperate: '< 0.05 dB',
        arctic: '< 0.02 dB',
      },
    },
  },
  {
    id: 'l-band',
    name: 'L-Band',
    label: 'L Band',
    freqStartMHz: 1000,
    freqEndMHz: 2000,
    color: '#3b82f6',
    colorBg: 'bg-blue-500/10',
    colorBorder: 'border-blue-500/30',
    colorText: 'text-blue-400',
    wavelength: '15 - 30 cm',
    applications: [
      'GPS / GNSS navigation (L1: 1575.42 MHz, L2: 1227.6 MHz)',
      'Inmarsat mobile satellite services',
      'Iridium voice and data services',
      'Globalstar satellite phone',
      'NOAA weather satellite downlinks',
    ],
    advantages: [
      'Good propagation characteristics through atmosphere',
      'Compact terminal antennas (omnidirectional possible)',
      'Reliable in adverse weather conditions',
      'Established global allocations for mobile satellite services',
    ],
    disadvantages: [
      'Moderate bandwidth (limited throughput)',
      'Increasingly congested with GNSS and MSS allocations',
      'Adjacent band interference from terrestrial LTE',
      'Not ideal for high-capacity broadband',
    ],
    keyOperators: ['Inmarsat', 'Iridium', 'Globalstar', 'GPS/Galileo/GLONASS/BeiDou'],
    rainFade: 'Very low - minimal rain attenuation below 2 GHz',
    regulatoryBody: 'ITU-R (Mobile Satellite Service allocations)',
    linkBudget: {
      freeSpacePathLossLEO: '~155 dB at 500 km',
      freeSpacePathLossGEO: '~190 dB at 35,786 km',
      typicalAntennaSize: '0.1 - 0.5 m (patch or helix)',
      dataRateCapability: '10 kbps - 500 kbps',
      rainAttenuation: {
        tropical: '< 0.3 dB',
        temperate: '< 0.1 dB',
        arctic: '< 0.05 dB',
      },
    },
  },
  {
    id: 's-band',
    name: 'S-Band',
    label: 'S Band',
    freqStartMHz: 2000,
    freqEndMHz: 4000,
    color: '#06b6d4',
    colorBg: 'bg-cyan-500/10',
    colorBorder: 'border-cyan-500/30',
    colorText: 'text-cyan-400',
    wavelength: '7.5 - 15 cm',
    applications: [
      'NASA deep space communications (S-band up/downlinks)',
      'Satellite telemetry, tracking, and command (TT&C)',
      'Weather radar (ground-based)',
      'Space-to-ground data relay',
      'ISS communication links',
    ],
    advantages: [
      'Good balance of bandwidth and propagation',
      'Established space heritage for TT&C',
      'Moderate antenna sizes for ground stations',
      'Low rain attenuation',
    ],
    disadvantages: [
      'Shared with terrestrial radar and Wi-Fi services',
      'Bandwidth limited for high-throughput applications',
      'Growing congestion from 5G and Wi-Fi 6 expansion',
      'Coordination complexity with weather radars',
    ],
    keyOperators: ['NASA', 'ESA', 'ISRO', 'JAXA', 'KSAT'],
    rainFade: 'Low - rain attenuation becomes measurable but remains modest',
    regulatoryBody: 'ITU-R (Space Research / Earth Exploration allocations)',
    linkBudget: {
      freeSpacePathLossLEO: '~162 dB at 500 km',
      freeSpacePathLossGEO: '~195 dB at 35,786 km',
      typicalAntennaSize: '0.5 - 3 m (parabolic)',
      dataRateCapability: '100 kbps - 10 Mbps',
      rainAttenuation: {
        tropical: '0.5 - 1 dB',
        temperate: '0.2 - 0.5 dB',
        arctic: '< 0.1 dB',
      },
    },
  },
  {
    id: 'c-band',
    name: 'C-Band',
    label: 'C Band',
    freqStartMHz: 4000,
    freqEndMHz: 8000,
    color: '#14b8a6',
    colorBg: 'bg-teal-500/10',
    colorBorder: 'border-teal-500/30',
    colorText: 'text-teal-400',
    wavelength: '3.75 - 7.5 cm',
    applications: [
      'Satellite TV distribution (C-band transponders)',
      'VSAT enterprise networks',
      'International backbone links',
      'Weather satellite imagery (GOES, Meteosat)',
      'Maritime and aviation communications',
    ],
    advantages: [
      'Excellent rain fade resilience',
      'Large installed base of ground infrastructure',
      'High reliability for broadcast applications',
      'Well-characterized propagation models',
    ],
    disadvantages: [
      'Large antenna requirements (2-5 m dishes)',
      'Ongoing 5G refarming reducing satellite allocations (3.7-3.98 GHz)',
      'Terrestrial interference from cellular networks',
      'Lower spectral efficiency than higher bands',
    ],
    keyOperators: ['SES', 'Intelsat', 'Eutelsat', 'ABS', 'Telesat'],
    rainFade: 'Low - C-band is the benchmark for rain fade resilience in SATCOM',
    regulatoryBody: 'ITU-R / FCC (C-band transition rules for 5G)',
    linkBudget: {
      freeSpacePathLossLEO: '~168 dB at 500 km',
      freeSpacePathLossGEO: '~200 dB at 35,786 km',
      typicalAntennaSize: '1.8 - 5 m (parabolic)',
      dataRateCapability: '10 Mbps - 500 Mbps per transponder',
      rainAttenuation: {
        tropical: '1 - 3 dB',
        temperate: '0.5 - 1 dB',
        arctic: '< 0.3 dB',
      },
    },
    terrestrialConflict: {
      terrestrialUse: '5G mid-band (3.7-3.98 GHz)',
      interferenceIssues:
        'FCC C-band transition (2020) cleared 280 MHz for 5G, displacing satellite operators. Adjacent channel interference affects remaining satellite operations. Accelerated clearing caused operational disruptions for satellite TV providers.',
      mitigationApproaches: [
        'FCC mandated transition with $9.7B reimbursement fund',
        'Band-pass filters on satellite earth stations',
        'Frequency coordination zones around earth stations',
        'Migration of affected services to Ku/Ka-band',
        'Reduced power levels for 5G near satellite facilities',
      ],
    },
  },
  {
    id: 'x-band',
    name: 'X-Band',
    label: 'X Band',
    freqStartMHz: 8000,
    freqEndMHz: 12000,
    color: '#a855f7',
    colorBg: 'bg-purple-500/10',
    colorBorder: 'border-purple-500/30',
    colorText: 'text-purple-400',
    wavelength: '2.5 - 3.75 cm',
    applications: [
      'Military satellite communications (Wideband Global SATCOM - WGS)',
      'Earth observation satellite downlinks (Copernicus, Landsat)',
      'Synthetic aperture radar (SAR) imaging',
      'Deep space communication links',
      'Weather radar (high-resolution)',
    ],
    advantages: [
      'Good bandwidth for imaging payloads',
      'Primarily government/military allocations (less commercial congestion)',
      'Moderate rain attenuation',
      'Well-suited for SAR and remote sensing missions',
    ],
    disadvantages: [
      'Restricted access (government/military priority)',
      'Limited commercial allocations',
      'Higher free space path loss than lower bands',
      'Moderate rain fade in tropical regions',
    ],
    keyOperators: ['US DoD (WGS)', 'Airbus Defence & Space', 'MDA (RADARSAT)', 'DLR', 'ISRO'],
    rainFade: 'Moderate - noticeable degradation in heavy rain, but manageable with link margin',
    regulatoryBody: 'ITU-R (Government / Military exclusive allocations)',
    linkBudget: {
      freeSpacePathLossLEO: '~173 dB at 500 km',
      freeSpacePathLossGEO: '~205 dB at 35,786 km',
      typicalAntennaSize: '1.2 - 4.5 m (parabolic)',
      dataRateCapability: '50 Mbps - 3 Gbps',
      rainAttenuation: {
        tropical: '3 - 8 dB',
        temperate: '1 - 3 dB',
        arctic: '0.5 - 1 dB',
      },
    },
  },
  {
    id: 'ku-band',
    name: 'Ku-Band',
    label: 'Ku Band',
    freqStartMHz: 12000,
    freqEndMHz: 18000,
    color: '#f97316',
    colorBg: 'bg-orange-500/10',
    colorBorder: 'border-orange-500/30',
    colorText: 'text-orange-400',
    wavelength: '1.67 - 2.5 cm',
    applications: [
      'Direct-to-home (DTH) satellite TV (DirecTV, Dish, Sky)',
      'Maritime VSAT broadband',
      'Airline in-flight connectivity (IFC)',
      'Military SATCOM (commercial leasing)',
      'News gathering (SNG) satellite uplinks',
    ],
    advantages: [
      'Smaller dish sizes (60-120 cm for consumer DTH)',
      'Wide commercial availability and global coverage',
      'Good balance of capacity and terminal cost',
      'Extensive GEO fleet with Ku-band transponders',
    ],
    disadvantages: [
      'Significant rain fade in tropical regions',
      'Orbital slot congestion at GEO for popular positions',
      'Interference from adjacent satellites at 2-degree spacing',
      'Increasing competition from Ka-band HTS systems',
    ],
    keyOperators: ['SES', 'Intelsat', 'Eutelsat', 'Telesat', 'Hughes'],
    rainFade: 'Significant - requires 3-6 dB rain margin in temperate zones, 8-12 dB in tropics',
    regulatoryBody: 'ITU-R (Fixed Satellite Service / Broadcasting Satellite Service)',
    linkBudget: {
      freeSpacePathLossLEO: '~178 dB at 500 km',
      freeSpacePathLossGEO: '~210 dB at 35,786 km',
      typicalAntennaSize: '0.6 - 2.4 m (parabolic)',
      dataRateCapability: '100 Mbps - 2 Gbps per beam',
      rainAttenuation: {
        tropical: '8 - 15 dB',
        temperate: '3 - 6 dB',
        arctic: '1 - 2 dB',
      },
    },
    terrestrialConflict: {
      terrestrialUse: 'Weather radar, police radar (13.25-13.4 GHz), automotive radar',
      interferenceIssues:
        'Shared allocations with terrestrial radar services create coordination challenges. Fixed satellite earth stations can receive interference from terrestrial microwave links. Growing automotive radar market at 77 GHz creates out-of-band emission concerns for adjacent services.',
      mitigationApproaches: [
        'ITU coordination procedures for shared bands',
        'Exclusion zones around radar installations',
        'Frequency offset and polarization discrimination',
        'Power flux density limits for satellite downlinks',
        'Adaptive coding and modulation (ACM) to handle interference',
      ],
    },
  },
  {
    id: 'ka-band',
    name: 'Ka-Band',
    label: 'Ka Band',
    freqStartMHz: 26000,
    freqEndMHz: 40000,
    color: '#ef4444',
    colorBg: 'bg-red-500/10',
    colorBorder: 'border-red-500/30',
    colorText: 'text-red-400',
    wavelength: '7.5 - 11.5 mm',
    applications: [
      'High-throughput satellite (HTS) broadband (ViaSat, Hughes Jupiter)',
      'LEO mega-constellations (Starlink, OneWeb, Kuiper)',
      'Government wideband SATCOM (military Ka)',
      'Inter-satellite links (ISLs)',
      'Broadband access for rural and underserved areas',
    ],
    advantages: [
      'Very high bandwidth availability (3.5 GHz typical allocation)',
      'Small user terminals (30-75 cm dishes)',
      'High frequency reuse with spot beam architectures',
      'Supports 100+ Gbps total satellite throughput',
    ],
    disadvantages: [
      'Severe rain fade (10-20 dB+ in heavy rain)',
      'Requires adaptive coding and modulation (ACM)',
      'Higher manufacturing cost for Ka-band electronics',
      'Atmospheric absorption increases operational complexity',
    ],
    keyOperators: ['SpaceX (Starlink)', 'ViaSat', 'Hughes (Jupiter)', 'OneWeb', 'Amazon (Kuiper)', 'Eutelsat'],
    rainFade: 'Severe - heavy rain can cause 15-25 dB attenuation; ACM and site diversity essential',
    regulatoryBody: 'ITU-R / FCC / Ofcom (HTS and NGSO coordination)',
    linkBudget: {
      freeSpacePathLossLEO: '~184 dB at 500 km',
      freeSpacePathLossGEO: '~215 dB at 35,786 km',
      typicalAntennaSize: '0.3 - 1.2 m (parabolic or flat panel)',
      dataRateCapability: '500 Mbps - 100+ Gbps total throughput',
      rainAttenuation: {
        tropical: '15 - 25 dB',
        temperate: '6 - 12 dB',
        arctic: '2 - 4 dB',
      },
    },
    terrestrialConflict: {
      terrestrialUse: 'Automotive radar (24 GHz), 5G mmWave (28 GHz), point-to-point microwave',
      interferenceIssues:
        'The 28 GHz band is shared between satellite services and 5G mmWave deployments. FCC and ITU have established power limits and geographic constraints. Automotive radar at 24 GHz creates adjacent-band concerns for Ka-band satellite ground terminals.',
      mitigationApproaches: [
        'Exclusion zones and PFD limits for NGSO constellations',
        'In-line interference coordination between NGSO operators (Article 22 of Radio Regulations)',
        'Dynamic beam avoidance near 5G base stations',
        'Dual-band terminals (Ka + Ku) for rain fade resilience',
        'Geographic spectrum sharing databases',
      ],
    },
  },
  {
    id: 'v-band',
    name: 'V-Band',
    label: 'V Band',
    freqStartMHz: 40000,
    freqEndMHz: 75000,
    color: '#ec4899',
    colorBg: 'bg-pink-500/10',
    colorBorder: 'border-pink-500/30',
    colorText: 'text-pink-400',
    wavelength: '4 - 7.5 mm',
    applications: [
      'Next-generation LEO broadband (SpaceX V-band constellation)',
      'Ultra-high-capacity inter-satellite links',
      'High-density urban broadband from LEO',
      'Experimental space-to-ground wideband links',
      'Future 6G backhaul applications',
    ],
    advantages: [
      'Massive bandwidth (10+ GHz available)',
      'Very small antenna apertures',
      'High spatial reuse in dense LEO deployments',
      'Less congested than Ka-band (for now)',
    ],
    disadvantages: [
      'Extreme rain attenuation (20-40 dB in heavy rain)',
      'Oxygen absorption peak near 60 GHz limits range',
      'Immature component ecosystem and higher costs',
      'Limited ground infrastructure deployed today',
    ],
    keyOperators: ['SpaceX (Gen2 Starlink V-band)', 'Boeing (V-band filing)', 'AST SpaceMobile (planned)'],
    rainFade: 'Extreme - rain and atmospheric absorption can exceed 30 dB; only viable for LEO with short path lengths',
    regulatoryBody: 'ITU-R / FCC (Experimental and NGSO filings)',
    linkBudget: {
      freeSpacePathLossLEO: '~190 dB at 500 km',
      freeSpacePathLossGEO: '~222 dB at 35,786 km (impractical)',
      typicalAntennaSize: '0.15 - 0.5 m (flat panel phased array)',
      dataRateCapability: '1 - 50+ Gbps per beam',
      rainAttenuation: {
        tropical: '25 - 45 dB',
        temperate: '10 - 20 dB',
        arctic: '3 - 8 dB',
      },
    },
  },
];

const EMERGING_TRENDS: EmergingTrend[] = [
  {
    title: 'V-Band for Next-Gen LEO Constellations',
    description:
      'SpaceX has filed with the FCC for a second-generation Starlink constellation using V-band (40-75 GHz) frequencies, promising multi-terabit aggregate throughput. The massive bandwidth available at V-band (10+ GHz) enables dramatically higher per-user speeds, but requires solving atmospheric absorption and rain fade challenges through dense LEO deployments and advanced adaptive coding.',
    status: 'active',
    keyPlayers: ['SpaceX', 'Boeing', 'Telesat'],
    timeline: 'First V-band satellite launches expected 2025-2027',
  },
  {
    title: 'Q-Band Experimental Allocations',
    description:
      'The Q-band (33-50 GHz) is being explored for satellite communications as an intermediate step between Ka and V-band. ESA\'s Alphasat TDP#5 experiment has demonstrated Q/V-band propagation measurements from GEO. Several operators are seeking experimental licenses to characterize Q-band channel behavior for future HTS systems.',
    status: 'experimental',
    keyPlayers: ['ESA', 'ASI (Italian Space Agency)', 'Thales Alenia Space'],
    timeline: 'Experimental campaigns ongoing; commercial deployment 2028+',
  },
  {
    title: 'Optical / Laser Communications (Non-RF)',
    description:
      'Free-space optical (FSO) communications using laser links offer 10-100x the data rates of RF with zero spectrum licensing requirements. NASA\'s LCRD and ESA\'s EDRS have demonstrated operational optical inter-satellite links. SpaceX Starlink uses laser ISLs extensively. Challenges remain for space-to-ground links due to cloud cover, requiring ground station diversity.',
    status: 'active',
    keyPlayers: ['SpaceX', 'NASA (LCRD)', 'ESA (EDRS)', 'Mynaric', 'CACI (SA Photonics)', 'Skyloom'],
    timeline: 'Operational for ISLs now; ground links maturing 2025-2028',
  },
  {
    title: 'Dynamic Spectrum Sharing (DSS)',
    description:
      'Rather than static frequency allocations, DSS enables satellite and terrestrial systems to share spectrum in real-time using sensing, databases, and AI-driven coordination. DARPA\'s COSMIC program and commercial initiatives are developing cognitive radio techniques that allow satellite ground terminals and 5G base stations to coexist without harmful interference.',
    status: 'concept',
    keyPlayers: ['DARPA', 'FCC (Spectrum Access System)', 'NTIA', 'Dynamic Spectrum Alliance'],
    timeline: 'Prototypes in development; regulatory frameworks by 2028-2030',
  },
  {
    title: 'Direct-to-Device (D2D) Cellular from Space',
    description:
      'Satellites communicating directly with unmodified smartphones using standard LTE/5G protocols in existing cellular bands. AST SpaceMobile, Lynk Global, and SpaceX/T-Mobile are pioneering this approach. Key challenges include enormous satellite antenna arrays (up to 64 m2), spectrum coordination with terrestrial MNOs, and managing inter-satellite handoffs at orbital velocities.',
    status: 'active',
    keyPlayers: ['AST SpaceMobile', 'SpaceX / T-Mobile', 'Lynk Global', 'Apple / Globalstar (emergency SOS)'],
    timeline: 'Initial broadband service 2025-2026; coverage expansion through 2030',
  },
];

const REGULATORY_REGIONS: RegulatoryRegion[] = [
  {
    region: 'Region 1',
    name: 'Europe, Africa, Middle East, CIS',
    description:
      'Governed by ITU Region 1 allocations and national administrations (CEPT in Europe, ATU in Africa). Generally more restrictive on NGSO operations and requires extensive coordination through CEPT ECC decisions.',
    keyBodies: ['ITU-R', 'CEPT / ECC', 'Ofcom (UK)', 'ANFR (France)', 'BNetzA (Germany)', 'ATU'],
    highlights: [
      'Stricter PFD limits on NGSO constellations than other regions',
      'CEPT decisions on C-band (3.4-3.8 GHz) for 5G completed',
      'Active coordination requirements for Ka-band earth stations',
      'ESA member states harmonize space spectrum policies',
    ],
  },
  {
    region: 'Region 2',
    name: 'Americas',
    description:
      'Led by the FCC (US) and CITEL for inter-American coordination. The US market drives global SATCOM innovation with relatively flexible spectrum policies for NGSO systems and market-based spectrum auctions.',
    keyBodies: ['FCC', 'NTIA', 'CITEL', 'ISED (Canada)', 'Anatel (Brazil)', 'IFT (Mexico)'],
    highlights: [
      'FCC streamlined NGSO licensing (Part 25 modernization)',
      'C-band 3.7-3.98 GHz cleared for 5G with $9.7B satellite reimbursement',
      '12 GHz band proceeding (MVDDS vs. NGSO FSS debate)',
      'NTIA manages federal (military/government) spectrum separately',
      'Market-based auctions generated $200B+ since 1994',
    ],
  },
  {
    region: 'Region 3',
    name: 'Asia-Pacific',
    description:
      'Diverse regulatory landscape with major space nations (China, Japan, India, Australia) having distinct national frameworks. APT (Asia-Pacific Telecommunity) provides regional coordination, but spectrum decisions vary significantly by country.',
    keyBodies: ['APT', 'MIIT (China)', 'MIC (Japan)', 'DoT/TRAI (India)', 'ACMA (Australia)', 'MCMC (Malaysia)'],
    highlights: [
      'China pursuing independent Ka/V-band mega-constellation (GW/SatNet ~13,000 satellites)',
      'India opening satellite broadband spectrum for private operators',
      'Japan allocating Q/V-band for HTS experiments',
      'Australia harmonizing with ITU for LEO ground station licensing',
      'Diverse 5G spectrum strategies affecting C-band satellite operations',
    ],
  },
];

const WRC_OUTCOMES = [
  {
    agendaItem: 'AI 1.2',
    topic: 'IMT identification in 3.3-3.4 GHz, 3.6-3.8 GHz, 6 GHz',
    outcome:
      'Identified additional spectrum for 5G/IMT in several bands. Upper 6 GHz (6.425-7.125 GHz) identified for IMT in Region 1, with conditions to protect satellite services.',
    impactOnSpace: 'Mixed - more 5G spectrum may increase interference to adjacent satellite bands.',
  },
  {
    agendaItem: 'AI 1.4',
    topic: 'Regulatory framework for non-GSO satellite systems',
    outcome:
      'New milestone-based regulatory framework for NGSO systems requiring deployment of 10% of constellation within 2 years of bringing into use, with additional milestones at 50% (5 years) and 100% (7 years).',
    impactOnSpace: 'Positive - prevents spectrum warehousing and ensures filed constellations actually deploy.',
  },
  {
    agendaItem: 'AI 1.5',
    topic: 'Earth stations in motion (ESIM) for Ka-band',
    outcome:
      'Established regulatory conditions for aeronautical and maritime earth stations in motion operating in Ka-band (19.7-20.2 / 29.5-30.0 GHz) with FSS GSO and NGSO systems.',
    impactOnSpace: 'Positive - enables broadband connectivity for ships and aircraft via Ka-band HTS.',
  },
  {
    agendaItem: 'AI 1.12',
    topic: 'Spectrum for space weather sensors',
    outcome:
      'Protected passive frequency bands used for space weather monitoring, ensuring satellite-based sensors for solar storms and geomagnetic disturbances retain interference-free operation.',
    impactOnSpace: 'Positive - safeguards critical space environment monitoring capabilities.',
  },
  {
    agendaItem: 'AI 1.15',
    topic: 'Inter-satellite links in 40-75 GHz',
    outcome:
      'Clarified regulatory conditions for V-band inter-satellite links, supporting deployment of high-capacity optical and RF backbones between LEO constellation satellites.',
    impactOnSpace: 'Positive - enables next-generation constellation architectures with mesh ISL networks.',
  },
];

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

function formatFreq(mhz: number): string {
  if (mhz >= 1000) return `${(mhz / 1000).toFixed(mhz >= 10000 ? 0 : 1)} GHz`;
  return `${mhz} MHz`;
}

/**
 * Returns proportional width for the spectrum bar (log scale).
 * We map 100 MHz - 100 GHz on a log10 scale.
 */
function bandWidthPercent(startMHz: number, endMHz: number): number {
  const logMin = Math.log10(100);       // 100 MHz
  const logMax = Math.log10(100000);    // 100 GHz
  const range = logMax - logMin;
  const logStart = Math.log10(startMHz);
  const logEnd = Math.log10(endMHz);
  return ((logEnd - logStart) / range) * 100;
}

function bandLeftPercent(startMHz: number): number {
  const logMin = Math.log10(100);
  const logMax = Math.log10(100000);
  const range = logMax - logMin;
  const logStart = Math.log10(startMHz);
  return ((logStart - logMin) / range) * 100;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-500/15 text-green-400 border-green-500/30',
  experimental: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  concept: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  experimental: 'Experimental',
  concept: 'Concept',
};

// ════════════════════════════════════════════════════════════════
// COMPONENTS
// ════════════════════════════════════════════════════════════════

function SpectrumBar({
  bands,
  selectedBand,
  onSelectBand,
}: {
  bands: SpectrumBand[];
  selectedBand: string | null;
  onSelectBand: (id: string | null) => void;
}) {
  return (
    <div className="card p-6 mb-8">
      <h2 className="text-lg font-semibold text-slate-100 mb-2">
        Radio Frequency Spectrum (100 MHz - 100 GHz)
      </h2>
      <p className="text-sm text-slate-400 mb-4">
        Click any band to expand its details. Widths represent logarithmic frequency range.
      </p>

      {/* Frequency axis labels */}
      <div className="relative h-6 mb-1">
        {[100, 300, 1000, 3000, 10000, 30000, 100000].map((freq) => (
          <span
            key={freq}
            className="absolute text-[10px] text-slate-500 -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${bandLeftPercent(freq)}%` }}
          >
            {formatFreq(freq)}
          </span>
        ))}
      </div>

      {/* Spectrum bar */}
      <div className="relative h-16 rounded-lg bg-slate-800/50 border border-slate-700/50 overflow-hidden flex">
        {bands.map((band) => {
          const widthPct = bandWidthPercent(band.freqStartMHz, band.freqEndMHz);
          const isSelected = selectedBand === band.id;
          return (
            <button
              key={band.id}
              onClick={() => onSelectBand(isSelected ? null : band.id)}
              className="relative h-full transition-all duration-200 group border-r border-slate-900/50 last:border-r-0"
              style={{
                width: `${widthPct}%`,
                backgroundColor: isSelected ? band.color : `${band.color}40`,
              }}
              title={`${band.name}: ${formatFreq(band.freqStartMHz)} - ${formatFreq(band.freqEndMHz)}`}
              aria-label={`Select ${band.name} band, ${formatFreq(band.freqStartMHz)} to ${formatFreq(band.freqEndMHz)}`}
            >
              <span
                className={`absolute inset-0 flex items-center justify-center text-[11px] font-bold transition-colors ${
                  isSelected ? 'text-white' : 'text-slate-200'
                } group-hover:text-white`}
              >
                {band.name}
              </span>
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: `${band.color}30` }}
              />
              {isSelected && (
                <span className="absolute bottom-0 left-0 right-0 h-1 bg-white/60" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4">
        {bands.map((band) => (
          <button
            key={band.id}
            onClick={() => onSelectBand(selectedBand === band.id ? null : band.id)}
            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-all border ${
              selectedBand === band.id
                ? `${band.colorBg} ${band.colorBorder} ${band.colorText}`
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: band.color }}
            />
            {band.name}
          </button>
        ))}

        <RelatedModules modules={PAGE_RELATIONS['rf-spectrum']} />
      </div>
    </div>
  );
}

function BandDetailCard({ band }: { band: SpectrumBand }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'link-budget' | 'conflict'>('overview');

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'link-budget' as const, label: 'Link Budget' },
    ...(band.terrestrialConflict
      ? [{ id: 'conflict' as const, label: 'Space vs Terrestrial' }]
      : []),
  ];

  return (
    <div className={`card p-6 ${band.colorBorder} border-2`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span
              className="w-4 h-4 rounded-md"
              style={{ backgroundColor: band.color }}
            />
            <h3 className={`text-xl font-bold ${band.colorText}`}>
              {band.label}
            </h3>
          </div>
          <p className="text-sm text-slate-400">
            {formatFreq(band.freqStartMHz)} - {formatFreq(band.freqEndMHz)} | Wavelength: {band.wavelength}
          </p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/30">
          {band.regulatoryBody}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 border-b border-slate-700/50 pb-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? `${band.colorBg} ${band.colorText} ${band.colorBorder} border border-b-0`
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-2">Applications</h4>
            <ul className="space-y-1.5">
              {band.applications.map((app, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0`} style={{ backgroundColor: band.color }} />
                  {app}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-green-400 mb-2">Advantages</h4>
            <ul className="space-y-1.5 mb-4">
              {band.advantages.map((adv, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {adv}
                </li>
              ))}
            </ul>
            <h4 className="text-sm font-semibold text-red-400 mb-2">Disadvantages</h4>
            <ul className="space-y-1.5">
              {band.disadvantages.map((dis, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {dis}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-2">Key Operators</h4>
            <div className="flex flex-wrap gap-2">
              {band.keyOperators.map((op, i) => (
                <span
                  key={i}
                  className={`text-xs px-2.5 py-1 rounded-lg ${band.colorBg} ${band.colorText} ${band.colorBorder} border`}
                >
                  {op}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-2">Rain Fade Characteristics</h4>
            <p className="text-sm text-slate-300">{band.rainFade}</p>
          </div>
        </div>
      )}

      {activeTab === 'link-budget' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Free Space Path Loss (LEO ~500 km)
              </h4>
              <p className={`text-lg font-bold ${band.colorText}`}>
                {band.linkBudget.freeSpacePathLossLEO}
              </p>
            </div>
            <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Free Space Path Loss (GEO ~35,786 km)
              </h4>
              <p className={`text-lg font-bold ${band.colorText}`}>
                {band.linkBudget.freeSpacePathLossGEO}
              </p>
            </div>
            <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Typical Antenna Size
              </h4>
              <p className={`text-lg font-bold ${band.colorText}`}>
                {band.linkBudget.typicalAntennaSize}
              </p>
            </div>
            <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Data Rate Capability
              </h4>
              <p className={`text-lg font-bold ${band.colorText}`}>
                {band.linkBudget.dataRateCapability}
              </p>
            </div>
          </div>

          {/* Rain attenuation table */}
          <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
            <h4 className="text-sm font-semibold text-slate-200 mb-3">
              Rain Attenuation by Region
            </h4>
            <div className="grid grid-cols-3 gap-4">
              {(['tropical', 'temperate', 'arctic'] as const).map((region) => (
                <div key={region} className="text-center">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 capitalize">
                    {region}
                  </p>
                  <p className={`text-base font-bold ${band.colorText}`}>
                    {band.linkBudget.rainAttenuation[region]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'conflict' && band.terrestrialConflict && (
        <div className="space-y-4">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h4 className="text-sm font-semibold text-amber-400">Conflict Zone</h4>
            </div>
            <p className="text-sm text-slate-300 mb-1">
              <span className="text-slate-400">Terrestrial Use:</span>{' '}
              {band.terrestrialConflict.terrestrialUse}
            </p>
            <p className="text-sm text-slate-300">
              {band.terrestrialConflict.interferenceIssues}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-2">Mitigation Approaches</h4>
            <ul className="space-y-2">
              {band.terrestrialConflict.mitigationApproaches.map((approach, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <svg className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  {approach}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function EmergingTrendsSection() {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-100 mb-4">
        Emerging Spectrum Trends
      </h2>
      <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {EMERGING_TRENDS.map((trend, idx) => (
          <StaggerItem key={idx}>
            <div className="card p-6 h-full">
              <div className="flex items-start justify-between mb-3 gap-2">
                <h3 className="text-base font-semibold text-slate-100">
                  {trend.title}
                </h3>
                <span
                  className={`text-[11px] px-2.5 py-0.5 rounded-full border whitespace-nowrap ${STATUS_STYLES[trend.status]}`}
                >
                  {STATUS_LABELS[trend.status]}
                </span>
              </div>
              <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                {trend.description}
              </p>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">Key Players</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {trend.keyPlayers.map((player, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded-md bg-slate-700/50 text-slate-300 border border-slate-600/30"
                      >
                        {player}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">Timeline</span>
                  <p className="text-sm text-cyan-400 mt-0.5">{trend.timeline}</p>
                </div>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}

function RegulatorySection() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-100 mb-4">
          Regulatory Quick Reference
        </h2>
        <StaggerContainer className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {REGULATORY_REGIONS.map((region, idx) => (
            <StaggerItem key={idx}>
              <div className="card p-6 h-full">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-medium">
                    {region.region}
                  </span>
                  <h3 className="text-base font-semibold text-slate-100">
                    {region.name}
                  </h3>
                </div>
                <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                  {region.description}
                </p>
                <div className="mb-4">
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-2">Key Bodies</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {region.keyBodies.map((body, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded-md bg-slate-700/50 text-slate-300 border border-slate-600/30"
                      >
                        {body}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-2">Highlights</h4>
                  <ul className="space-y-1.5">
                    {region.highlights.map((hl, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="mt-1 w-1 h-1 rounded-full bg-cyan-400 flex-shrink-0" />
                        {hl}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>

      {/* WRC-23 Outcomes */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 mb-4">
          WRC-23 Outcomes for Space
        </h2>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Agenda Item
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Topic
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Outcome
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Impact on Space
                  </th>
                </tr>
              </thead>
              <tbody>
                {WRC_OUTCOMES.map((item, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-700/20 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-cyan-400 whitespace-nowrap">
                      {item.agendaItem}
                    </td>
                    <td className="px-4 py-3 text-slate-200 font-medium">
                      {item.topic}
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-sm">
                      {item.outcome}
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-xs">
                      {item.impactOnSpace}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpaceVsTerrestrialSummary({ bands }: { bands: SpectrumBand[] }) {
  const conflictBands = bands.filter((b) => b.terrestrialConflict);

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-100 mb-4">
        Space vs Terrestrial Usage Conflicts
      </h2>
      <StaggerContainer className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {conflictBands.map((band, idx) => (
          <StaggerItem key={idx}>
            <div className={`card p-6 h-full ${band.colorBorder}`}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-3 h-3 rounded-md"
                  style={{ backgroundColor: band.color }}
                />
                <h3 className={`text-base font-semibold ${band.colorText}`}>
                  {band.name}
                </h3>
                <span className="text-xs text-slate-500">
                  {formatFreq(band.freqStartMHz)} - {formatFreq(band.freqEndMHz)}
                </span>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                    <p className="text-[10px] text-cyan-400 uppercase tracking-wide mb-1 font-semibold">
                      Space Use
                    </p>
                    <p className="text-xs text-slate-300">
                      {band.applications[0]}
                    </p>
                  </div>
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                    <p className="text-[10px] text-amber-400 uppercase tracking-wide mb-1 font-semibold">
                      Terrestrial Use
                    </p>
                    <p className="text-xs text-slate-300">
                      {band.terrestrialConflict!.terrestrialUse}
                    </p>
                  </div>
                </div>
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                  <p className="text-[10px] text-red-400 uppercase tracking-wide mb-1 font-semibold">
                    Interference Issues
                  </p>
                  <p className="text-xs text-slate-300 line-clamp-3">
                    {band.terrestrialConflict!.interferenceIssues}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 font-semibold">
                    Mitigation
                  </p>
                  <ul className="space-y-1">
                    {band.terrestrialConflict!.mitigationApproaches.slice(0, 3).map((m, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                        <span className="mt-1 w-1 h-1 rounded-full bg-green-400 flex-shrink-0" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}

function LinkBudgetQuickRef({ bands }: { bands: SpectrumBand[] }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-100 mb-4">
        Link Budget Quick Reference
      </h2>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Band
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  FSPL (LEO)
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  FSPL (GEO)
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Antenna Size
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Data Rate
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Rain (Tropical)
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Rain (Temperate)
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Rain (Arctic)
                </th>
              </tr>
            </thead>
            <tbody>
              {bands.map((band, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-700/20 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: band.color }}
                      />
                      <span className={`font-medium ${band.colorText}`}>
                        {band.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                    {band.linkBudget.freeSpacePathLossLEO}
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                    {band.linkBudget.freeSpacePathLossGEO}
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs">
                    {band.linkBudget.typicalAntennaSize}
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs">
                    {band.linkBudget.dataRateCapability}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-red-400 font-mono">
                    {band.linkBudget.rainAttenuation.tropical}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-amber-400 font-mono">
                    {band.linkBudget.rainAttenuation.temperate}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-cyan-400 font-mono">
                    {band.linkBudget.rainAttenuation.arctic}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════

export default function RFSpectrumPage() {
  const [selectedBand, setSelectedBand] = useState<string | null>(null);

  const activeBand = useMemo(
    () => SPECTRUM_BANDS.find((b) => b.id === selectedBand) || null,
    [selectedBand]
  );

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <Breadcrumbs
          items={[
            { label: 'Spectrum', href: '/spectrum' },
            { label: 'RF Spectrum Visualization' },
          ]}
        />

        <AnimatedPageHeader
          title="RF Spectrum Visualization"
          subtitle="Interactive visualization of radio frequency spectrum allocations for satellite and space communications. Explore frequency bands, link budgets, regulatory frameworks, and emerging spectrum trends."
          accentColor="cyan"
          icon={
            <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
            </svg>
          }
        />

        {/* ──────────── Visual Spectrum Band Diagram ──────────── */}
        <ScrollReveal>
          <SpectrumBar
            bands={SPECTRUM_BANDS}
            selectedBand={selectedBand}
            onSelectBand={setSelectedBand}
          />
        </ScrollReveal>

        {/* ──────────── Band Detail Card (expanded) ──────────── */}
        {activeBand && (
          <ScrollReveal>
            <div className="mb-8">
              <BandDetailCard band={activeBand} />
            </div>
          </ScrollReveal>
        )}

        {/* ──────────── Space vs Terrestrial Conflicts ──────────── */}
        <ScrollReveal>
          <div className="mb-8">
            <SpaceVsTerrestrialSummary bands={SPECTRUM_BANDS} />
          </div>
        </ScrollReveal>

        {/* ──────────── Link Budget Quick Reference ──────────── */}
        <ScrollReveal>
          <div className="mb-8">
            <LinkBudgetQuickRef bands={SPECTRUM_BANDS} />
          </div>
        </ScrollReveal>

        {/* ──────────── Emerging Spectrum Trends ──────────── */}
        <ScrollReveal>
          <div className="mb-8">
            <EmergingTrendsSection />
          </div>
        </ScrollReveal>

        {/* ──────────── Regulatory Quick Reference ──────────── */}
        <ScrollReveal>
          <div className="mb-8">
            <RegulatorySection />
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
