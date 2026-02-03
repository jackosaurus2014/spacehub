import prisma from './db';
import { ExportRegime, ClassificationCategory, RegulationType, RegulationCategory, RegulationStatus } from '@/types';

// Seed data for EAR/ITAR Export Classifications
const EXPORT_CLASSIFICATIONS_SEED = [
  // ITAR - USML Category IV (Launch Vehicles)
  {
    slug: 'usml-iv-launch-vehicles',
    regime: 'ITAR' as ExportRegime,
    classification: 'USML Category IV',
    name: 'Launch Vehicles, Guided Missiles, Ballistic Missiles',
    description: 'Launch vehicles and all specifically designed components, parts, accessories, attachments, and associated equipment.',
    category: 'launch_vehicle' as ClassificationCategory,
    controlReason: 'Missile Technology (MT)',
    licenseRequired: 'DSP-5 or DSP-73 required for export',
    technicalNotes: 'Includes all stages, thrust vector controls, and propulsion systems',
  },
  {
    slug: 'usml-iv-rocket-engines',
    regime: 'ITAR' as ExportRegime,
    classification: 'USML Category IV(h)',
    name: 'Liquid and Solid Rocket Engines',
    description: 'Rocket engines including liquid propellant rocket engines with thrust greater than 25,000 lbs.',
    category: 'component' as ClassificationCategory,
    subCategory: 'propulsion',
    controlReason: 'Missile Technology (MT)',
    licenseRequired: 'Export license required; no license exceptions',
  },
  // ITAR - USML Category XV (Satellites)
  {
    slug: 'usml-xv-satellites',
    regime: 'ITAR' as ExportRegime,
    classification: 'USML Category XV',
    name: 'Spacecraft and Related Articles',
    description: 'Spacecraft, including satellites, space vehicles, and spacecraft buses, specifically designed for defense purposes.',
    category: 'satellite' as ClassificationCategory,
    controlReason: 'National Security (NS)',
    licenseRequired: 'DSP-5 required; strict end-use monitoring',
    technicalNotes: 'Includes reconnaissance, early warning, and defense communication satellites',
  },
  {
    slug: 'usml-xv-radiation-hardened',
    regime: 'ITAR' as ExportRegime,
    classification: 'USML Category XV(e)',
    name: 'Radiation-Hardened Microelectronics',
    description: 'Radiation-hardened microelectronic circuits specifically designed for spacecraft.',
    category: 'component' as ClassificationCategory,
    subCategory: 'avionics',
    controlReason: 'National Security (NS)',
    licenseRequired: 'Export license required',
  },
  // EAR - 9A515 (Spacecraft)
  {
    slug: 'ear-9a515-spacecraft',
    regime: 'EAR' as ExportRegime,
    classification: '9A515',
    name: 'Spacecraft and Related Commodities',
    description: 'Commercial communication satellites and related items not controlled under ITAR.',
    category: 'spacecraft' as ClassificationCategory,
    controlReason: 'National Security (NS), Regional Stability (RS)',
    licenseRequired: 'License required for most destinations; License Exception STA may apply',
    exceptions: ['STA', 'TMP', 'RPL'],
  },
  {
    slug: 'ear-9a515-y-commercial-comms',
    regime: 'EAR' as ExportRegime,
    classification: '9A515.y',
    name: 'Commercial Communication Satellite Bus',
    description: 'Commercial communication satellite buses and related components.',
    category: 'satellite' as ClassificationCategory,
    controlReason: 'Regional Stability (RS)',
    licenseRequired: 'License required; STA eligible to certain destinations',
    exceptions: ['STA'],
  },
  // EAR - 9E515 (Technology)
  {
    slug: 'ear-9e515-spacecraft-tech',
    regime: 'EAR' as ExportRegime,
    classification: '9E515',
    name: 'Spacecraft Technology',
    description: 'Technology required for the development, production, or use of items controlled under 9A515, 9B515, or 9D515.',
    category: 'technology' as ClassificationCategory,
    controlReason: 'National Security (NS)',
    licenseRequired: 'License required; deemed export rules apply',
  },
  // EAR - 9D515 (Software)
  {
    slug: 'ear-9d515-spacecraft-software',
    regime: 'EAR' as ExportRegime,
    classification: '9D515',
    name: 'Spacecraft Software',
    description: 'Software for the development, production, operation, or maintenance of spacecraft.',
    category: 'software' as ClassificationCategory,
    controlReason: 'National Security (NS)',
    licenseRequired: 'License required; cloud computing considerations apply',
  },
  // Components
  {
    slug: 'ear-9a004-rocket-propulsion',
    regime: 'EAR' as ExportRegime,
    classification: '9A004',
    name: 'Space Launch Vehicle Components',
    description: 'Sounding rockets and components capable of a range of at least 300km.',
    category: 'component' as ClassificationCategory,
    subCategory: 'propulsion',
    controlReason: 'Missile Technology (MT)',
    licenseRequired: 'License required under MTCR',
  },
  {
    slug: 'ear-3a001-rad-hard-electronics',
    regime: 'EAR' as ExportRegime,
    classification: '3A001.a.1',
    name: 'Radiation-Hardened Integrated Circuits',
    description: 'Integrated circuits rated for total dose greater than 5 x 10^3 Gy (Si).',
    category: 'component' as ClassificationCategory,
    subCategory: 'avionics',
    controlReason: 'National Security (NS)',
    licenseRequired: 'License required for most destinations',
  },
  // Orbital Habitats
  {
    slug: 'ear-9a515-orbital-modules',
    regime: 'EAR' as ExportRegime,
    classification: '9A515.a.3',
    name: 'Pressurized Modules for Space',
    description: 'Pressurized modules, habitation modules, and airlocks for space stations.',
    category: 'orbital_hab' as ClassificationCategory,
    controlReason: 'National Security (NS)',
    licenseRequired: 'License required; case-by-case review',
  },
  // Rovers
  {
    slug: 'ear-9a515-planetary-rovers',
    regime: 'EAR' as ExportRegime,
    classification: '9A515.x',
    name: 'Planetary Surface Exploration Systems',
    description: 'Rovers and surface mobility systems for planetary exploration.',
    category: 'rover' as ClassificationCategory,
    controlReason: 'Regional Stability (RS)',
    licenseRequired: 'License required; dual-use considerations',
  },
];

// Seed data for Proposed Regulations
const PROPOSED_REGULATIONS_SEED = [
  {
    slug: 'bis-2024-ear-space-items',
    title: 'Revisions to Export Controls on Commercial Space Items',
    summary: 'Proposed amendments to the EAR to update controls on commercial space items and clarify jurisdiction between EAR and ITAR.',
    agency: 'BIS',
    docketNumber: 'BIS-2024-0001',
    type: 'proposed_rule' as RegulationType,
    category: 'export_control' as RegulationCategory,
    impactAreas: JSON.stringify(['satellite', 'spacecraft', 'software', 'technology']),
    impactSeverity: 'high',
    publishedDate: new Date('2024-06-15'),
    commentDeadline: new Date('2024-09-15'),
    status: 'comment_period' as RegulationStatus,
    sourceUrl: 'https://www.federalregister.gov/documents/2024/example',
    commentUrl: 'https://www.regulations.gov/docket/BIS-2024-0001',
    keyChanges: JSON.stringify([
      'Clarification of 9x515 classifications',
      'New license exceptions for allied countries',
      'Updated deemed export provisions'
    ]),
    industryImpact: 'Significant impact on commercial satellite manufacturers and space technology exporters.',
  },
  {
    slug: 'faa-2024-commercial-launch',
    title: 'Streamlined Launch and Reentry Licensing Requirements',
    summary: 'FAA proposes updates to commercial launch licensing to reduce regulatory burden while maintaining safety.',
    agency: 'FAA',
    docketNumber: 'FAA-2024-0123',
    type: 'proposed_rule' as RegulationType,
    category: 'licensing' as RegulationCategory,
    impactAreas: JSON.stringify(['launch_vehicle', 'spacecraft']),
    impactSeverity: 'medium',
    publishedDate: new Date('2024-08-01'),
    commentDeadline: new Date('2024-11-01'),
    status: 'open' as RegulationStatus,
    sourceUrl: 'https://www.federalregister.gov/documents/2024/faa-example',
    commentUrl: 'https://www.regulations.gov/docket/FAA-2024-0123',
    keyChanges: JSON.stringify([
      'Simplified license application process',
      'New safety approval framework',
      'Expedited review for reusable vehicles'
    ]),
    industryImpact: 'Expected to reduce time-to-license by 30% for commercial operators.',
  },
  {
    slug: 'ddtc-2024-itar-modernization',
    title: 'ITAR Amendments for Emerging Space Technologies',
    summary: 'DDTC seeks comments on updating USML categories to address emerging space technologies including on-orbit servicing.',
    agency: 'DDTC',
    docketNumber: 'DDTC-2024-0045',
    type: 'notice' as RegulationType,
    category: 'export_control' as RegulationCategory,
    impactAreas: JSON.stringify(['spacecraft', 'component', 'technology', 'software']),
    impactSeverity: 'high',
    publishedDate: new Date('2024-07-20'),
    commentDeadline: new Date('2024-10-20'),
    status: 'open' as RegulationStatus,
    sourceUrl: 'https://www.federalregister.gov/documents/2024/ddtc-example',
    commentUrl: 'https://www.regulations.gov/docket/DDTC-2024-0045',
    keyChanges: JSON.stringify([
      'New category for on-orbit servicing equipment',
      'Updated controls on space situational awareness',
      'Clarification of defense article definitions'
    ]),
    industryImpact: 'Critical for companies developing on-orbit servicing, debris removal, and space logistics.',
  },
  {
    slug: 'fcc-2024-satellite-spectrum',
    title: 'Spectrum Allocation for Next-Generation Satellite Communications',
    summary: 'FCC proposes new spectrum allocation rules for LEO satellite constellations and direct-to-device services.',
    agency: 'FCC',
    type: 'proposed_rule' as RegulationType,
    category: 'spectrum' as RegulationCategory,
    impactAreas: JSON.stringify(['satellite']),
    impactSeverity: 'medium',
    publishedDate: new Date('2024-09-01'),
    commentDeadline: new Date('2024-12-01'),
    status: 'open' as RegulationStatus,
    sourceUrl: 'https://www.fcc.gov/document/example',
    keyChanges: JSON.stringify([
      'New Ka-band allocations',
      'Interference mitigation requirements',
      'Direct-to-device authorization framework'
    ]),
    industryImpact: 'Enables expansion of LEO broadband and IoT satellite services.',
  },
];

// Seed data for Legal Sources
const LEGAL_SOURCES_SEED = [
  {
    name: 'Hogan Lovells Space & Satellite',
    slug: 'hogan-lovells-space',
    type: 'law_firm',
    organization: 'Hogan Lovells',
    specialty: 'space_law',
    url: 'https://www.hoganlovells.com/en/industry/aerospace-defense-and-government-services',
  },
  {
    name: 'Milbank Space Industry Group',
    slug: 'milbank-space',
    type: 'law_firm',
    organization: 'Milbank LLP',
    specialty: 'space_law',
    url: 'https://www.milbank.com/en/practices/industries/space.html',
  },
  {
    name: 'Wilson Sonsini Space Tech',
    slug: 'wilson-sonsini-space',
    type: 'law_firm',
    organization: 'Wilson Sonsini Goodrich & Rosati',
    specialty: 'regulatory',
    url: 'https://www.wsgr.com/en/services/industries/space-technology.html',
  },
  {
    name: 'Akin Gump Export Controls',
    slug: 'akin-gump-export',
    type: 'law_firm',
    organization: 'Akin Gump Strauss Hauer & Feld',
    specialty: 'export_control',
    url: 'https://www.akingump.com/en/experience/industries/aerospace-and-defense.html',
  },
  {
    name: 'BIS Export Control Updates',
    slug: 'bis-updates',
    type: 'government',
    organization: 'Bureau of Industry and Security',
    specialty: 'export_control',
    url: 'https://www.bis.doc.gov/index.php/regulations/export-administration-regulations-ear',
  },
  {
    name: 'DDTC ITAR Updates',
    slug: 'ddtc-updates',
    type: 'government',
    organization: 'Directorate of Defense Trade Controls',
    specialty: 'export_control',
    url: 'https://www.pmddtc.state.gov/ddtc_public',
  },
  {
    name: 'Satellite Industry Association',
    slug: 'sia-updates',
    type: 'industry_association',
    organization: 'Satellite Industry Association',
    specialty: 'general',
    url: 'https://sia.org/news-resources/',
  },
  {
    name: 'Commercial Spaceflight Federation',
    slug: 'csf-updates',
    type: 'industry_association',
    organization: 'Commercial Spaceflight Federation',
    specialty: 'regulatory',
    url: 'https://www.commercialspaceflight.org/resources/',
  },
  {
    name: 'Space Policy Online',
    slug: 'space-policy-online',
    type: 'think_tank',
    specialty: 'space_law',
    url: 'https://spacepolicyonline.com/',
  },
];

// Initialize compliance data
export async function initializeComplianceData(): Promise<{ classifications: number; regulations: number; sources: number }> {
  let classificationsCount = 0;
  let regulationsCount = 0;
  let sourcesCount = 0;

  // Initialize export classifications
  for (const classificationSeed of EXPORT_CLASSIFICATIONS_SEED) {
    try {
      // Convert arrays to JSON strings for Prisma
      const classification = {
        ...classificationSeed,
        exceptions: classificationSeed.exceptions ? JSON.stringify(classificationSeed.exceptions) : null,
      };
      await prisma.exportClassification.upsert({
        where: { slug: classification.slug },
        update: classification,
        create: classification,
      });
      classificationsCount++;
    } catch (error) {
      console.error(`Failed to save classification ${classificationSeed.slug}:`, error);
    }
  }

  // Initialize proposed regulations
  for (const regulation of PROPOSED_REGULATIONS_SEED) {
    try {
      await prisma.proposedRegulation.upsert({
        where: { slug: regulation.slug },
        update: regulation,
        create: regulation,
      });
      regulationsCount++;
    } catch (error) {
      console.error(`Failed to save regulation ${regulation.slug}:`, error);
    }
  }

  // Initialize legal sources
  for (const source of LEGAL_SOURCES_SEED) {
    try {
      await prisma.legalSource.upsert({
        where: { slug: source.slug },
        update: source,
        create: source,
      });
      sourcesCount++;
    } catch (error) {
      console.error(`Failed to save legal source ${source.slug}:`, error);
    }
  }

  return { classifications: classificationsCount, regulations: regulationsCount, sources: sourcesCount };
}

// Get export classifications
export async function getExportClassifications(options?: {
  regime?: ExportRegime;
  category?: ClassificationCategory;
  search?: string;
}): Promise<any[]> {
  const where: any = {};

  if (options?.regime) {
    where.regime = options.regime;
  }
  if (options?.category) {
    where.category = options.category;
  }
  if (options?.search) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      { description: { contains: options.search, mode: 'insensitive' } },
      { classification: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  return prisma.exportClassification.findMany({
    where,
    orderBy: [{ regime: 'asc' }, { classification: 'asc' }],
  });
}

// Get proposed regulations
export async function getProposedRegulations(options?: {
  agency?: string;
  category?: RegulationCategory;
  status?: RegulationStatus;
  limit?: number;
}): Promise<any[]> {
  const where: any = {};

  if (options?.agency) {
    where.agency = options.agency;
  }
  if (options?.category) {
    where.category = options.category;
  }
  if (options?.status) {
    where.status = options.status;
  }

  return prisma.proposedRegulation.findMany({
    where,
    orderBy: { publishedDate: 'desc' },
    take: options?.limit || 50,
  });
}

// Get legal sources
export async function getLegalSources(options?: {
  type?: string;
  isActive?: boolean;
}): Promise<any[]> {
  const where: any = {};

  if (options?.type) {
    where.type = options.type;
  }
  if (options?.isActive !== undefined) {
    where.isActive = options.isActive;
  }

  return prisma.legalSource.findMany({
    where,
    orderBy: { name: 'asc' },
  });
}

// Get legal updates
export async function getLegalUpdates(options?: {
  sourceId?: string;
  topics?: string[];
  limit?: number;
  offset?: number;
}): Promise<{ updates: any[]; total: number }> {
  const where: any = {};

  if (options?.sourceId) {
    where.sourceId = options.sourceId;
  }

  const [updates, total] = await Promise.all([
    prisma.legalUpdate.findMany({
      where,
      include: { source: true },
      orderBy: { publishedAt: 'desc' },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    }),
    prisma.legalUpdate.count({ where }),
  ]);

  return { updates, total };
}

// Get compliance stats
export async function getComplianceStats() {
  const [classifications, regulations, sources, updates] = await Promise.all([
    prisma.exportClassification.count(),
    prisma.proposedRegulation.count(),
    prisma.legalSource.count(),
    prisma.legalUpdate.count(),
  ]);

  const openRegulations = await prisma.proposedRegulation.count({
    where: { status: { in: ['open', 'comment_period'] } },
  });

  const regimeBreakdown = await prisma.exportClassification.groupBy({
    by: ['regime'],
    _count: { regime: true },
  });

  return {
    classifications,
    regulations,
    openRegulations,
    sources,
    updates,
    regimeBreakdown: Object.fromEntries(
      regimeBreakdown.map((r) => [r.regime, r._count.regime])
    ),
  };
}
