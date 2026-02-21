import { NextResponse } from 'next/server';
import { initializeComplianceData } from '@/lib/compliance-data';
import { initializeRegulatoryHubData } from '@/lib/regulatory-hub-data';
import { bulkUpsertContent } from '@/lib/dynamic-content';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Seed data: UN Space Treaties
// ---------------------------------------------------------------------------

const TREATIES_SEED = [
  {
    contentKey: 'compliance:treaty:outer-space-treaty',
    section: 'treaties',
    data: {
      id: 'outer-space-treaty',
      name: 'Treaty on Principles Governing the Activities of States in the Exploration and Use of Outer Space, including the Moon and Other Celestial Bodies',
      shortName: 'Outer Space Treaty',
      year: 1967,
      adoptedDate: '1967-01-27',
      effectiveDate: '1967-10-10',
      ratifications: 114,
      signatures: 23,
      depositary: 'United Nations',
      status: 'In force',
      keyPrinciples: [
        'Exploration and use of outer space for the benefit of all countries',
        'Outer space is not subject to national appropriation',
        'States shall not place weapons of mass destruction in space',
        'The Moon and celestial bodies used exclusively for peaceful purposes',
        'Astronauts as envoys of mankind',
        'States responsible for national space activities',
        'States liable for damage caused by space objects',
        'Avoidance of harmful contamination of space and celestial bodies',
      ],
      significance: 'The foundational treaty of international space law. Establishes the basic framework for the governance of outer space activities.',
      sourceUrl: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html',
    },
  },
  {
    contentKey: 'compliance:treaty:rescue-agreement',
    section: 'treaties',
    data: {
      id: 'rescue-agreement',
      name: 'Agreement on the Rescue of Astronauts, the Return of Astronauts and the Return of Objects Launched into Outer Space',
      shortName: 'Rescue Agreement',
      year: 1968,
      adoptedDate: '1968-04-22',
      effectiveDate: '1968-12-03',
      ratifications: 99,
      signatures: 23,
      depositary: 'United Nations',
      status: 'In force',
      keyPrinciples: [
        'States shall notify launching authority and UN of astronauts in distress',
        'States shall take all possible steps to rescue and assist astronauts',
        'Astronauts shall be safely and promptly returned to launching state',
        'States shall recover and return space objects to launching state',
        'Launching state shall bear costs of recovery upon request',
      ],
      significance: 'Elaborates on rescue obligations from Articles V and VIII of the Outer Space Treaty. The first international agreement focused specifically on the safety and return of space personnel.',
      sourceUrl: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introrescueagreement.html',
    },
  },
  {
    contentKey: 'compliance:treaty:liability-convention',
    section: 'treaties',
    data: {
      id: 'liability-convention',
      name: 'Convention on International Liability for Damage Caused by Space Objects',
      shortName: 'Liability Convention',
      year: 1972,
      adoptedDate: '1972-03-29',
      effectiveDate: '1972-09-01',
      ratifications: 98,
      signatures: 19,
      depositary: 'United Nations',
      status: 'In force',
      keyPrinciples: [
        'Absolute liability for damage on Earth surface or to aircraft in flight',
        'Fault-based liability for damage in outer space',
        'Joint and several liability for joint launches',
        'Claims through diplomatic channels or Claims Commission',
        'Compensation determined by international law and equity',
        'One-year statute of limitations from date of damage',
      ],
      significance: 'Only invoked once formally (Cosmos 954, Canada v. USSR, 1978). Establishes the liability framework critical for the commercial space insurance industry.',
      sourceUrl: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html',
    },
  },
  {
    contentKey: 'compliance:treaty:registration-convention',
    section: 'treaties',
    data: {
      id: 'registration-convention',
      name: 'Convention on Registration of Objects Launched into Outer Space',
      shortName: 'Registration Convention',
      year: 1975,
      adoptedDate: '1975-01-14',
      effectiveDate: '1976-09-15',
      ratifications: 72,
      signatures: 4,
      depositary: 'United Nations',
      status: 'In force',
      keyPrinciples: [
        'Launching state shall maintain a national registry of space objects',
        'Information registered with the UN Secretary-General',
        'Required data: designating state, markings, date/territory of launch, basic orbital parameters, general function',
        'State of registry retains jurisdiction and control',
        'Open access to UN registry information',
      ],
      significance: 'Provides the legal basis for tracking jurisdiction of space objects. Critical for space traffic management, spectrum coordination, and liability determination.',
      sourceUrl: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introregistration-convention.html',
    },
  },
  {
    contentKey: 'compliance:treaty:moon-agreement',
    section: 'treaties',
    data: {
      id: 'moon-agreement',
      name: 'Agreement Governing the Activities of States on the Moon and Other Celestial Bodies',
      shortName: 'Moon Agreement',
      year: 1979,
      adoptedDate: '1979-12-18',
      effectiveDate: '1984-07-11',
      ratifications: 18,
      signatures: 4,
      depositary: 'United Nations',
      status: 'In force (limited participation)',
      keyPrinciples: [
        'Moon and natural resources are the "common heritage of mankind"',
        'International regime to govern exploitation of natural resources',
        'Peaceful purposes only; no military bases or weapons testing',
        'Freedom of scientific investigation',
        'Inform UN of activities and results',
        'Environmental protection of celestial bodies',
      ],
      significance: 'Controversial treaty with limited adoption. No major space-faring nation (US, Russia, China, India) has ratified it. The "common heritage" principle is seen as conflicting with commercial resource extraction goals. The Artemis Accords provide an alternative framework.',
      sourceUrl: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/intromoon-agreement.html',
    },
  },
  {
    contentKey: 'compliance:treaty:itu-constitution',
    section: 'treaties',
    data: {
      id: 'itu-constitution',
      name: 'Constitution and Convention of the International Telecommunication Union',
      shortName: 'ITU Constitution',
      year: 1992,
      adoptedDate: '1992-12-22',
      effectiveDate: '1994-07-01',
      ratifications: 193,
      signatures: 0,
      depositary: 'ITU',
      status: 'In force',
      keyPrinciples: [
        'Rational use of the radio-frequency spectrum and satellite orbital positions',
        'Equal right to use frequencies and orbital positions',
        'International coordination of satellite networks',
        'Harmful interference avoidance obligations',
        'Radio Regulations as binding international treaty',
      ],
      significance: 'The foundational instrument for international spectrum management. The Radio Regulations annexed to the ITU Constitution are a binding treaty governing all satellite spectrum allocations and orbital slot assignments.',
      sourceUrl: 'https://www.itu.int/en/council/Pages/constitution.aspx',
    },
  },
];

// ---------------------------------------------------------------------------
// Seed data: National Space Laws
// ---------------------------------------------------------------------------

const NATIONAL_LAWS_SEED = [
  {
    contentKey: 'compliance:national-law:us-cslca',
    section: 'national-laws',
    data: {
      id: 'us-cslca',
      country: 'United States',
      name: 'Commercial Space Launch Competitiveness Act',
      shortName: 'CSLCA / Title 51',
      year: 2015,
      originalYear: 1984,
      description: 'Comprehensive US commercial space law. Title IV (Space Resource Exploration and Utilization Act) grants US citizens rights to possess, own, transport, use, and sell asteroid and space resources.',
      keyProvisions: [
        'Extension of third-party launch indemnification',
        'Streamlining of experimental permits',
        'Space resource rights for US citizens (Title IV)',
        'Extension of ISS operations authorization',
        'Commercial crew provisions',
      ],
      status: 'Active',
      amendedDates: ['2004', '2010', '2015'],
      enforcementBody: 'FAA Office of Commercial Space Transportation',
      sourceUrl: 'https://www.congress.gov/bill/114th-congress/house-bill/2262',
    },
  },
  {
    contentKey: 'compliance:national-law:us-space-council',
    section: 'national-laws',
    data: {
      id: 'us-space-council',
      country: 'United States',
      name: 'National Space Council (Executive Order)',
      shortName: 'National Space Council',
      year: 2017,
      description: 'Revival of the National Space Council as a coordinating body for national space policy. Chaired by the Vice President, coordinating across civilian, military, and commercial space activities.',
      keyProvisions: [
        'Interagency coordination of space policy',
        'Advise the President on space-related matters',
        'Review and develop national space policy',
        'Engage with commercial space industry',
        'Seven Space Policy Directives issued (SPD-1 through SPD-7)',
      ],
      status: 'Active',
      enforcementBody: 'Executive Office of the President',
      sourceUrl: 'https://www.whitehouse.gov/ostp/nstc/',
    },
  },
  {
    contentKey: 'compliance:national-law:uk-space-industry-act',
    section: 'national-laws',
    data: {
      id: 'uk-space-industry-act',
      country: 'United Kingdom',
      name: 'Space Industry Act 2018',
      shortName: 'Space Industry Act',
      year: 2018,
      description: 'UK framework for commercial spaceflight from British territory. Enables launch and satellite operations from UK spaceports, including suborbital flights.',
      keyProvisions: [
        'Licensing for launches, orbital operations, and spaceports',
        'CAA as primary regulator for spaceflight',
        'Range safety and environmental protection requirements',
        'Third-party liability and insurance mandates',
        'Spaceport licensing framework',
        'Provisions for vertical and horizontal launch',
      ],
      status: 'Active',
      enforcementBody: 'Civil Aviation Authority (CAA)',
      sourceUrl: 'https://www.legislation.gov.uk/ukpga/2018/5',
    },
  },
  {
    contentKey: 'compliance:national-law:luxembourg-space-resources',
    section: 'national-laws',
    data: {
      id: 'luxembourg-space-resources',
      country: 'Luxembourg',
      name: 'Law on the Exploration and Use of Space Resources',
      shortName: 'Space Resources Act',
      year: 2017,
      description: 'First European national law to establish a legal framework for space resource utilization. Companies authorized under Luxembourg law may appropriate space resources.',
      keyProvisions: [
        'Authorization framework for space resource missions',
        'Companies can own extracted space resources',
        'Written authorization from relevant minister required',
        'Luxembourg registration or establishment required',
        'Government supervision of authorized missions',
      ],
      status: 'Active',
      enforcementBody: 'Ministry of the Economy',
      sourceUrl: 'https://space-agency.public.lu/en/agency/legal-framework.html',
    },
  },
  {
    contentKey: 'compliance:national-law:uae-space-law',
    section: 'national-laws',
    data: {
      id: 'uae-space-law',
      country: 'United Arab Emirates',
      name: 'Federal Law No. 12 of 2019 on the Regulation of the Space Sector',
      shortName: 'UAE Space Sector Law',
      year: 2019,
      description: 'Comprehensive UAE space legislation covering permits, registration, liability, and the establishment of the UAE Space Agency as regulatory authority.',
      keyProvisions: [
        'Permitting for space activities conducted from UAE territory',
        'Space object registration requirements',
        'Insurance and liability provisions',
        'Space debris mitigation obligations',
        'Intellectual property protections for space innovations',
        'Environmental protection requirements',
      ],
      status: 'Active',
      enforcementBody: 'UAE Space Agency',
      sourceUrl: 'https://space.gov.ae/',
    },
  },
  {
    contentKey: 'compliance:national-law:japan-space-activities-act',
    section: 'national-laws',
    data: {
      id: 'japan-space-activities-act',
      country: 'Japan',
      name: 'Act on Launching of Spacecraft, etc. and Control of Spacecraft',
      shortName: 'Space Activities Act',
      year: 2016,
      description: 'Japan\'s first comprehensive space law. Establishes licensing for launch activities and satellite operations, replacing ad-hoc regulatory approaches.',
      keyProvisions: [
        'Launch licensing through Cabinet Office',
        'Satellite management licensing',
        'Third-party liability with government indemnification',
        'Mandatory insurance requirements',
        'Safety standards for launch operations',
        'Integration with JAXA cooperation framework',
      ],
      status: 'Active',
      enforcementBody: 'Cabinet Office / MEXT',
      sourceUrl: 'https://www8.cao.go.jp/space/english/',
    },
  },
  {
    contentKey: 'compliance:national-law:france-space-operations-act',
    section: 'national-laws',
    data: {
      id: 'france-space-operations-act',
      country: 'France',
      name: 'Loi relative aux operations spatiales (Space Operations Act)',
      shortName: 'Space Operations Act',
      year: 2008,
      description: 'French space law requiring authorization for space operations by French entities or from French territory. Includes strict debris mitigation requirements with 25-year deorbit rule.',
      keyProvisions: [
        'Authorization required for launch and orbital operations',
        'Strict debris mitigation requirements (25-year passivation/deorbit)',
        'Government guarantee for third-party damage',
        'Mandatory end-of-life planning',
        'CNES as technical authority',
        'Applies to French entities operating anywhere',
      ],
      status: 'Active',
      enforcementBody: 'CNES (technical) / Ministry of Higher Education and Research',
      sourceUrl: 'https://www.legifrance.gouv.fr/',
    },
  },
  {
    contentKey: 'compliance:national-law:india-space-policy',
    section: 'national-laws',
    data: {
      id: 'india-space-policy',
      country: 'India',
      name: 'Indian Space Policy 2023',
      shortName: 'Indian Space Policy',
      year: 2023,
      description: 'Comprehensive national space policy establishing IN-SPACe as the single-window authorization body for private sector space activities in India.',
      keyProvisions: [
        'IN-SPACe as single-window authorization agency',
        'NSIL as commercial arm for ISRO technology transfer',
        'Private sector participation in all space activities',
        'FDI in space sector opened up',
        'Geospatial data liberalization',
        'Framework for satellite communication and remote sensing',
      ],
      status: 'Active',
      enforcementBody: 'IN-SPACe (Indian National Space Promotion and Authorization Centre)',
      sourceUrl: 'https://www.isro.gov.in/IndianSpacePolicy2023.html',
    },
  },
  {
    contentKey: 'compliance:national-law:australia-space-activities-act',
    section: 'national-laws',
    data: {
      id: 'australia-space-activities-act',
      country: 'Australia',
      name: 'Space (Launches and Returns) Act 2018',
      shortName: 'Space Activities Act (amended)',
      year: 2018,
      originalYear: 1998,
      description: 'Modernized Australian space legislation enabling commercial launches from Australian territory. Originally enacted 1998, significantly amended 2018 to support commercial space growth.',
      keyProvisions: [
        'Launch permits and return authorizations',
        'Facility licenses for launch sites',
        'Mandatory insurance and financial responsibility',
        'Environmental and heritage protection',
        'Integration with Australian Space Agency oversight',
        'Streamlined rules for suborbital and small launch vehicles',
      ],
      status: 'Active',
      enforcementBody: 'Australian Space Agency',
      sourceUrl: 'https://www.legislation.gov.au/Details/C2018A00155',
    },
  },
  {
    contentKey: 'compliance:national-law:nz-outer-space-act',
    section: 'national-laws',
    data: {
      id: 'nz-outer-space-act',
      country: 'New Zealand',
      name: 'Outer Space and High-altitude Activities Act 2017',
      shortName: 'Outer Space Act',
      year: 2017,
      description: 'New Zealand space legislation enabling commercial launches (particularly Rocket Lab\'s Electron from Mahia Peninsula). Includes environmental and treaty obligation provisions.',
      keyProvisions: [
        'License required for space launches and high-altitude activities',
        'Payload permits for all objects launched',
        'Minister may decline based on national interests or international obligations',
        'Environmental impact assessment requirements',
        'Third-party liability coverage mandates',
        'Compliance with international obligations including OST and Liability Convention',
      ],
      status: 'Active',
      enforcementBody: 'Ministry of Business, Innovation and Employment',
      sourceUrl: 'https://www.legislation.govt.nz/act/public/2017/0029/latest/DLM6966310.html',
    },
  },
  {
    contentKey: 'compliance:national-law:germany-satdsig',
    section: 'national-laws',
    data: {
      id: 'germany-satdsig',
      country: 'Germany',
      name: 'Satellitendatensicherheitsgesetz (Satellite Data Security Act)',
      shortName: 'SatDSiG',
      year: 2007,
      description: 'German law regulating the distribution of high-resolution satellite remote sensing data. Unique among national space laws for specifically addressing data security.',
      keyProvisions: [
        'Licensing for high-resolution earth observation satellite operators',
        'Sensitivity assessment for data requests',
        'Government review of data distribution',
        'Security measures for data handling',
        'Applies to German operators and from German territory',
      ],
      status: 'Active',
      enforcementBody: 'German Federal Office for Economic Affairs and Export Control (BAFA)',
      sourceUrl: 'https://www.gesetze-im-internet.de/satdsig/',
    },
  },
  {
    contentKey: 'compliance:national-law:south-korea-sdpa',
    section: 'national-laws',
    data: {
      id: 'south-korea-sdpa',
      country: 'South Korea',
      name: 'Space Development Promotion Act',
      shortName: 'SDPA',
      year: 2005,
      description: 'South Korean framework for space development and commercial space activities. Supports KARI and private sector growth under the Korean Aerospace Research Institute framework.',
      keyProvisions: [
        'Space development master plan every 5 years',
        'Registration of space objects',
        'Liability framework for space damage',
        'Space activity permits',
        'Support for private space industry',
        'International cooperation framework',
      ],
      status: 'Active',
      enforcementBody: 'Ministry of Science and ICT / KARI',
      sourceUrl: 'https://www.law.go.kr/',
    },
  },
  {
    contentKey: 'compliance:national-law:canada-remote-sensing',
    section: 'national-laws',
    data: {
      id: 'canada-remote-sensing',
      country: 'Canada',
      name: 'Remote Sensing Space Systems Act',
      shortName: 'RSSSA',
      year: 2005,
      description: 'Canadian legislation regulating commercial remote sensing satellite operations, including licensing and data distribution controls.',
      keyProvisions: [
        'License required for remote sensing satellite operations',
        'Data access controls and government priority access',
        'Security review of data distribution',
        'Annual reporting requirements',
        'Disposal planning requirements',
      ],
      status: 'Active',
      enforcementBody: 'Natural Resources Canada / Canadian Space Agency',
      sourceUrl: 'https://laws-lois.justice.gc.ca/eng/acts/r-5.4/',
    },
  },
  {
    contentKey: 'compliance:national-law:norway-space-act',
    section: 'national-laws',
    data: {
      id: 'norway-space-act',
      country: 'Norway',
      name: 'Act on Launching Objects from Norwegian Territory into Outer Space',
      shortName: 'Norwegian Space Act',
      year: 1969,
      description: 'One of the earliest national space laws. Requires consent from the King (government) for launching objects into outer space from Norwegian territory, including Svalbard.',
      keyProvisions: [
        'Government consent required for all space launches',
        'Covers launches from Norwegian territory including Svalbard',
        'Applies to Norwegian entities',
        'Integration with Andoya Space operations',
      ],
      status: 'Active',
      enforcementBody: 'Ministry of Trade, Industry and Fisheries',
      sourceUrl: 'https://lovdata.no/',
    },
  },
];

// ---------------------------------------------------------------------------
// Seed data: Artemis Accords Signatories
// ---------------------------------------------------------------------------

const ARTEMIS_SIGNATORIES_SEED = [
  { country: 'United States', signDate: '2020-10-13', region: 'North America' },
  { country: 'Australia', signDate: '2020-10-13', region: 'Oceania' },
  { country: 'Canada', signDate: '2020-10-13', region: 'North America' },
  { country: 'Japan', signDate: '2020-10-13', region: 'Asia' },
  { country: 'Luxembourg', signDate: '2020-10-13', region: 'Europe' },
  { country: 'Italy', signDate: '2020-10-13', region: 'Europe' },
  { country: 'United Kingdom', signDate: '2020-10-13', region: 'Europe' },
  { country: 'United Arab Emirates', signDate: '2020-10-13', region: 'Middle East' },
  { country: 'Ukraine', signDate: '2020-11-12', region: 'Europe' },
  { country: 'South Korea', signDate: '2021-05-24', region: 'Asia' },
  { country: 'New Zealand', signDate: '2021-05-31', region: 'Oceania' },
  { country: 'Brazil', signDate: '2021-06-15', region: 'South America' },
  { country: 'Poland', signDate: '2021-10-25', region: 'Europe' },
  { country: 'Mexico', signDate: '2021-12-09', region: 'North America' },
  { country: 'Israel', signDate: '2022-01-26', region: 'Middle East' },
  { country: 'Romania', signDate: '2022-03-01', region: 'Europe' },
  { country: 'Bahrain', signDate: '2022-03-04', region: 'Middle East' },
  { country: 'Singapore', signDate: '2022-03-28', region: 'Asia' },
  { country: 'Colombia', signDate: '2022-05-10', region: 'South America' },
  { country: 'France', signDate: '2022-06-07', region: 'Europe' },
  { country: 'Saudi Arabia', signDate: '2022-07-14', region: 'Middle East' },
  { country: 'Rwanda', signDate: '2022-09-20', region: 'Africa' },
  { country: 'Czech Republic', signDate: '2022-11-02', region: 'Europe' },
  { country: 'Ecuador', signDate: '2023-01-10', region: 'South America' },
  { country: 'India', signDate: '2023-06-21', region: 'Asia' },
  { country: 'Argentina', signDate: '2023-07-27', region: 'South America' },
  { country: 'Nigeria', signDate: '2023-12-01', region: 'Africa' },
  { country: 'Spain', signDate: '2023-12-20', region: 'Europe' },
  { country: 'Iceland', signDate: '2024-03-15', region: 'Europe' },
  { country: 'Belgium', signDate: '2024-03-15', region: 'Europe' },
  { country: 'Germany', signDate: '2024-03-15', region: 'Europe' },
  { country: 'Netherlands', signDate: '2024-03-15', region: 'Europe' },
  { country: 'Bulgaria', signDate: '2024-03-15', region: 'Europe' },
  { country: 'Switzerland', signDate: '2024-04-15', region: 'Europe' },
  { country: 'Sweden', signDate: '2024-04-15', region: 'Europe' },
  { country: 'Greece', signDate: '2024-05-01', region: 'Europe' },
  { country: 'Peru', signDate: '2024-05-08', region: 'South America' },
  { country: 'Angola', signDate: '2024-06-04', region: 'Africa' },
  { country: 'Austria', signDate: '2024-06-20', region: 'Europe' },
  { country: 'Denmark', signDate: '2024-06-20', region: 'Europe' },
  { country: 'Slovenia', signDate: '2024-07-10', region: 'Europe' },
  { country: 'Lithuania', signDate: '2024-08-14', region: 'Europe' },
  { country: 'Uruguay', signDate: '2024-10-03', region: 'South America' },
].map((s, idx) => ({
  contentKey: `compliance:artemis-signatory:${s.country.toLowerCase().replace(/\s+/g, '-')}`,
  section: 'artemis-signatories',
  data: {
    id: `artemis-${s.country.toLowerCase().replace(/\s+/g, '-')}`,
    country: s.country,
    signDate: s.signDate,
    region: s.region,
    order: idx + 1,
    implementationStatus: new Date(s.signDate) < new Date('2023-01-01') ? 'Active participant' : 'Recently signed',
  },
}));

// ---------------------------------------------------------------------------
// Seed data: Artemis Accords Principles
// ---------------------------------------------------------------------------

const ARTEMIS_PRINCIPLES_SEED = [
  {
    id: 'peaceful-purposes',
    title: 'Peaceful Purposes',
    description: 'All activities conducted under the Artemis Accords must be for peaceful purposes in accordance with the Outer Space Treaty.',
    article: 'Section 1',
  },
  {
    id: 'transparency',
    title: 'Transparency',
    description: 'Signatories commit to transparent space operations, including sharing scientific data, policies, and plans.',
    article: 'Section 2',
  },
  {
    id: 'interoperability',
    title: 'Interoperability',
    description: 'Support interoperability of space systems to enhance safety and sustainability, including use of open standards.',
    article: 'Section 3',
  },
  {
    id: 'emergency-assistance',
    title: 'Emergency Assistance',
    description: 'Commitment to render assistance to astronauts in distress consistent with the Rescue Agreement.',
    article: 'Section 4',
  },
  {
    id: 'registration',
    title: 'Registration of Space Objects',
    description: 'All space objects should be registered consistent with the Registration Convention to support space safety.',
    article: 'Section 5',
  },
  {
    id: 'scientific-data',
    title: 'Release of Scientific Data',
    description: 'Commit to public release of scientific data from civil space exploration to benefit humanity.',
    article: 'Section 6',
  },
  {
    id: 'heritage-preservation',
    title: 'Protecting Heritage',
    description: 'Preserve outer space heritage, including historically significant human and robotic landing sites, artifacts, and evidence of activity.',
    article: 'Section 7',
  },
  {
    id: 'space-resources',
    title: 'Space Resources',
    description: 'Extraction and utilization of space resources should be conducted in compliance with the Outer Space Treaty and does not constitute national appropriation.',
    article: 'Section 10',
  },
  {
    id: 'deconfliction',
    title: 'Deconfliction of Activities',
    description: 'Provide notification of operations that could cause interference, and establish safety zones to prevent harmful interference.',
    article: 'Section 11',
  },
].map((p) => ({
  contentKey: `compliance:artemis-principle:${p.id}`,
  section: 'artemis-principles',
  data: p,
}));

// ---------------------------------------------------------------------------
// Seed data: Regulatory Bodies
// ---------------------------------------------------------------------------

const REGULATORY_BODIES_SEED = [
  {
    id: 'unoosa',
    name: 'United Nations Office for Outer Space Affairs',
    shortName: 'UNOOSA',
    type: 'international',
    jurisdiction: 'Global',
    mandate: 'Promotes international cooperation in the peaceful use and exploration of space. Serves as secretariat for COPUOS.',
    website: 'https://www.unoosa.org',
    keyFunctions: ['COPUOS secretariat', 'Space law advisory', 'UN Space Registry', 'Capacity building', 'Space for sustainable development'],
  },
  {
    id: 'copuos',
    name: 'Committee on the Peaceful Uses of Outer Space',
    shortName: 'COPUOS',
    type: 'international',
    jurisdiction: 'Global',
    mandate: 'Principal UN body for reviewing international cooperation in space. Two subcommittees: Scientific & Technical, and Legal.',
    website: 'https://www.unoosa.org/oosa/en/ourwork/copuos/index.html',
    keyFunctions: ['Space law development', 'Space debris guidelines', 'Long-term sustainability guidelines', 'Space technology applications'],
  },
  {
    id: 'itu',
    name: 'International Telecommunication Union',
    shortName: 'ITU',
    type: 'international',
    jurisdiction: 'Global',
    mandate: 'UN specialized agency for information and communication technologies. Manages radio-frequency spectrum and satellite orbit assignments.',
    website: 'https://www.itu.int',
    keyFunctions: ['Radio Regulations', 'Spectrum allocation', 'Satellite orbit coordination', 'WRC conferences', 'Space Network List'],
  },
  {
    id: 'iadc',
    name: 'Inter-Agency Space Debris Coordination Committee',
    shortName: 'IADC',
    type: 'international',
    jurisdiction: 'Global',
    mandate: 'International governmental forum coordinating space debris research and mitigation. Members include major space agencies worldwide.',
    website: 'https://www.iadc-home.org',
    keyFunctions: ['Debris mitigation guidelines', 'Reentry risk assessment', 'Debris environment modeling', 'Best practices development'],
  },
  {
    id: 'faa-ast',
    name: 'FAA Office of Commercial Space Transportation',
    shortName: 'FAA/AST',
    type: 'national',
    jurisdiction: 'United States',
    mandate: 'Regulates US commercial space launch and reentry activities. Issues licenses for launch, reentry, and spaceport operations.',
    website: 'https://www.faa.gov/space',
    keyFunctions: ['Launch licensing', 'Reentry licensing', 'Spaceport licensing', 'Safety reviews', 'Financial responsibility oversight'],
  },
  {
    id: 'fcc-space',
    name: 'FCC Space Bureau (International Bureau)',
    shortName: 'FCC',
    type: 'national',
    jurisdiction: 'United States',
    mandate: 'Regulates satellite spectrum allocation, orbital debris mitigation, and earth station licensing for US-authorized systems.',
    website: 'https://www.fcc.gov/space',
    keyFunctions: ['Satellite licensing', 'Spectrum allocation', 'Orbital debris rules', 'NGSO processing', 'Earth station licensing'],
  },
  {
    id: 'noaa-crsra',
    name: 'NOAA Commercial Remote Sensing Regulatory Affairs',
    shortName: 'NOAA/CRSRA',
    type: 'national',
    jurisdiction: 'United States',
    mandate: 'Licenses private remote sensing space systems operating from or with data distribution to the US. Manages tier-based licensing framework.',
    website: 'https://www.nesdis.noaa.gov/CRSRA',
    keyFunctions: ['Remote sensing licensing', 'Tier classification', 'Data distribution controls', 'Annual compliance'],
  },
  {
    id: 'nasa-osma',
    name: 'NASA Office of Safety and Mission Assurance',
    shortName: 'NASA/OSMA',
    type: 'national',
    jurisdiction: 'United States',
    mandate: 'Sets safety and mission assurance standards for NASA missions and commercial crew/cargo partnerships. Oversees planetary protection.',
    website: 'https://sma.nasa.gov',
    keyFunctions: ['Mission safety standards', 'Commercial crew oversight', 'Planetary protection', 'Mishap investigation', 'Quality assurance'],
  },
  {
    id: 'esa',
    name: 'European Space Agency',
    shortName: 'ESA',
    type: 'international',
    jurisdiction: 'Europe (22 member states)',
    mandate: 'Intergovernmental organization coordinating European space programs. Develops launchers, satellites, and deep space missions.',
    website: 'https://www.esa.int',
    keyFunctions: ['Ariane/Vega launch programs', 'Earth observation', 'Space science', 'Human spaceflight', 'Space safety'],
  },
  {
    id: 'eumetsat',
    name: 'European Organisation for the Exploitation of Meteorological Satellites',
    shortName: 'EUMETSAT',
    type: 'international',
    jurisdiction: 'Europe (30 member states)',
    mandate: 'Operates meteorological satellite systems for weather monitoring, climate tracking, and environmental observation across Europe.',
    website: 'https://www.eumetsat.int',
    keyFunctions: ['Meteosat operations', 'Sentinel-3 marine monitoring', 'Climate data services', 'Metop polar orbiting satellites'],
  },
  {
    id: 'cnes',
    name: 'Centre National d\'Etudes Spatiales',
    shortName: 'CNES',
    type: 'national',
    jurisdiction: 'France',
    mandate: 'French space agency responsible for space policy, launch operations from Guiana Space Centre, and technical authority for French Space Operations Act.',
    website: 'https://cnes.fr',
    keyFunctions: ['Ariane launch operations', 'Space debris monitoring', 'Space Operations Act technical authority', 'Earth observation'],
  },
  {
    id: 'dlr',
    name: 'Deutsches Zentrum fur Luft- und Raumfahrt',
    shortName: 'DLR',
    type: 'national',
    jurisdiction: 'Germany',
    mandate: 'German Aerospace Center. Research organization and space agency responsible for Germany\'s space program and contributions to ESA.',
    website: 'https://www.dlr.de',
    keyFunctions: ['Space research', 'German space program management', 'Satellite operations', 'Space situational awareness'],
  },
  {
    id: 'jaxa',
    name: 'Japan Aerospace Exploration Agency',
    shortName: 'JAXA',
    type: 'national',
    jurisdiction: 'Japan',
    mandate: 'Japan\'s unified space and aeronautical agency. Manages launches from Tanegashima and Uchinoura, operates ISS Kibo module.',
    website: 'https://global.jaxa.jp',
    keyFunctions: ['H3 launch vehicle', 'ISS Kibo operations', 'Lunar/Mars exploration', 'Earth observation', 'Space debris monitoring'],
  },
  {
    id: 'isro',
    name: 'Indian Space Research Organisation',
    shortName: 'ISRO',
    type: 'national',
    jurisdiction: 'India',
    mandate: 'India\'s primary space agency. Develops launchers, satellites, and deep space missions. Supports IN-SPACe commercial authorization.',
    website: 'https://www.isro.gov.in',
    keyFunctions: ['PSLV/GSLV launches', 'Chandrayaan lunar missions', 'Gaganyaan crew program', 'NAVIC navigation', 'Remote sensing'],
  },
  {
    id: 'ussf',
    name: 'United States Space Force',
    shortName: 'USSF',
    type: 'national',
    jurisdiction: 'United States',
    mandate: 'Organizes, trains, and equips space forces. Operates the Space Surveillance Network, GPS, and space domain awareness missions. National security space launch procurement.',
    website: 'https://www.spaceforce.mil',
    keyFunctions: ['Space domain awareness', 'GPS operations', 'Missile warning', 'National Security Space Launch', 'Space superiority'],
  },
  {
    id: 'osc',
    name: 'Office of Space Commerce',
    shortName: 'OSC',
    type: 'national',
    jurisdiction: 'United States',
    mandate: 'Under NOAA, the principal unit for space commerce policy. Developing the Traffic Coordination System for Space (TraCSS) for civil SSA.',
    website: 'https://space.commerce.gov',
    keyFunctions: ['TraCSS development', 'Space commerce policy', 'Civil SSA services', 'Commercial space advocacy'],
  },
];

// ---------------------------------------------------------------------------
// Seed data: Legal Proceedings / Enforcement Actions
// ---------------------------------------------------------------------------

const LEGAL_PROCEEDINGS_SEED = [
  {
    contentKey: 'compliance:legal-proceeding:cosmos-954',
    section: 'legal-proceedings',
    data: {
      id: 'cosmos-954',
      caseName: 'Cosmos 954 Incident (Canada v. USSR)',
      year: 1978,
      jurisdiction: 'International claim under Liability Convention',
      summary: 'Soviet nuclear-powered satellite Cosmos 954 reentered over northern Canada, scattering radioactive debris across 124,000 km2. Canada invoked the Liability Convention and claimed CAD $6 million in cleanup costs.',
      outcome: 'Settled for CAD $3 million in 1981. Only formal invocation of the Liability Convention to date.',
      significance: 'Established precedent for nuclear safety in space, cleanup cost recovery, and practical application of the Liability Convention.',
      sourceUrl: 'https://www.unoosa.org/',
    },
  },
  {
    contentKey: 'compliance:legal-proceeding:swarm-fcc',
    section: 'legal-proceedings',
    data: {
      id: 'swarm-fcc',
      caseName: 'FCC v. Swarm Technologies',
      year: 2018,
      jurisdiction: 'FCC enforcement',
      summary: 'Swarm Technologies launched four SpaceBEE satellites without FCC authorization after their application was denied due to tracking concerns. FCC imposed first-ever fine for unauthorized satellite launch.',
      outcome: '$900,000 consent decree and compliance plan. Swarm later received proper authorization and was acquired by SpaceX.',
      significance: 'First FCC enforcement action for unauthorized satellite launch. Established that satellites require FCC authorization even when launched by third-party provider.',
      sourceUrl: 'https://www.fcc.gov/',
    },
  },
  {
    contentKey: 'compliance:legal-proceeding:dish-debris-fine',
    section: 'legal-proceedings',
    data: {
      id: 'dish-debris-fine',
      caseName: 'FCC v. DISH Network (EchoStar-7)',
      year: 2023,
      jurisdiction: 'FCC enforcement',
      summary: 'FCC fined DISH Network $150,000 for failing to properly deorbit the EchoStar-7 satellite to the required graveyard orbit. Satellite was left 122 km below the assigned disposal orbit.',
      outcome: '$150,000 fine and compliance plan. First FCC enforcement action specifically for orbital debris violation.',
      significance: 'Historic first fine for orbital debris non-compliance. Signals FCC willingness to enforce debris mitigation rules and the new 5-year deorbit mandate.',
      sourceUrl: 'https://www.fcc.gov/document/fcc-takes-first-ever-space-debris-enforcement-action',
    },
  },
  {
    contentKey: 'compliance:legal-proceeding:gao-hls',
    section: 'legal-proceedings',
    data: {
      id: 'gao-hls',
      caseName: 'Blue Origin v. NASA (HLS Bid Protest)',
      year: 2021,
      jurisdiction: 'GAO / COFC',
      summary: 'Blue Origin protested NASA\'s selection of SpaceX as sole Human Landing System (HLS) provider under the Artemis program. Blue Origin argued the evaluation was flawed and NASA should have selected two providers.',
      outcome: 'GAO denied Blue Origin\'s protest. Subsequent COFC lawsuit also dismissed. SpaceX HLS contract upheld.',
      significance: 'Major precedent for single-award space contracts. Validated NASA procurement flexibility and established that budget constraints justify sole-source selections.',
      sourceUrl: 'https://www.gao.gov/',
    },
  },
  {
    contentKey: 'compliance:legal-proceeding:ligado-spectrum',
    section: 'legal-proceedings',
    data: {
      id: 'ligado-spectrum',
      caseName: 'Ligado Networks L-Band Authorization',
      year: 2020,
      jurisdiction: 'FCC / Congressional oversight',
      summary: 'FCC approved Ligado Networks\' application to repurpose L-band spectrum for terrestrial 5G use, over objections from GPS community and DoD that it would cause harmful interference to GPS receivers.',
      outcome: 'FCC approved with conditions (reduced power levels). Ongoing dispute with DoD. Congressional hearings. GAO study ordered. No resolution as of 2025.',
      significance: 'Highlights tension between commercial spectrum reuse and critical national security/safety-of-life GPS operations. Precedent for adjacent-band interference disputes.',
      sourceUrl: 'https://www.fcc.gov/',
    },
  },
];

// ---------------------------------------------------------------------------
// Seed data: Bid Protests
// ---------------------------------------------------------------------------

const BID_PROTESTS_SEED = [
  {
    contentKey: 'compliance:bid-protest:nssl-phase3',
    section: 'bid-protests',
    data: {
      id: 'nssl-phase3',
      caseName: 'NSSL Phase 3 Lane 1 Protests',
      year: 2024,
      agency: 'US Space Force',
      program: 'National Security Space Launch Phase 3',
      protesters: ['Blue Origin', 'Northrop Grumman'],
      awardees: ['SpaceX', 'ULA'],
      status: 'Resolved',
      summary: 'Multiple protests of NSSL Phase 3 Lane 1 awards for national security launch services. Awards to SpaceX and ULA for high-priority missions.',
      significance: 'Shapes future of US national security launch competition and pricing.',
    },
  },
  {
    contentKey: 'compliance:bid-protest:ols-on-ramp',
    section: 'bid-protests',
    data: {
      id: 'ols-on-ramp',
      caseName: 'OSP-4 / OL-X On-Ramp Selection',
      year: 2023,
      agency: 'US Space Force',
      program: 'Orbital Services Program',
      protesters: [],
      awardees: ['Multiple small launch providers'],
      status: 'Completed',
      summary: 'Space Force on-ramp competition for small launch service providers. Multiple awards for responsive launch capabilities.',
      significance: 'Expands national security small launch provider base beyond SpaceX and ULA.',
    },
  },
];

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const startTime = Date.now();
  const results: Record<string, unknown> = {};

  try {
    // 1. Initialize Prisma-based compliance data (export classifications, regulations, legal sources)
    const complianceResult = await initializeComplianceData();
    results.complianceData = complianceResult;

    // 2. Initialize Prisma-based regulatory hub data (policies, licenses, cases, sources, ECCNs, USML)
    const regulatoryResult = await initializeRegulatoryHubData();
    results.regulatoryHubData = regulatoryResult;

    // 3. Seed DynamicContent: treaties
    const treatiesCount = await bulkUpsertContent(
      'compliance',
      TREATIES_SEED,
      { sourceType: 'seed', sourceUrl: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties.html' }
    );
    results.treaties = treatiesCount;

    // 4. Seed DynamicContent: national laws
    const nationalLawsCount = await bulkUpsertContent(
      'compliance',
      NATIONAL_LAWS_SEED,
      { sourceType: 'seed', sourceUrl: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/nationalspacelaw.html' }
    );
    results.nationalLaws = nationalLawsCount;

    // 5. Seed DynamicContent: Artemis Accords signatories
    const signatoriesCount = await bulkUpsertContent(
      'compliance',
      ARTEMIS_SIGNATORIES_SEED,
      { sourceType: 'seed', sourceUrl: 'https://www.nasa.gov/artemis-accords/' }
    );
    results.artemisSignatories = signatoriesCount;

    // 6. Seed DynamicContent: Artemis Accords principles
    const principlesCount = await bulkUpsertContent(
      'compliance',
      ARTEMIS_PRINCIPLES_SEED,
      { sourceType: 'seed', sourceUrl: 'https://www.nasa.gov/artemis-accords/' }
    );
    results.artemisPrinciples = principlesCount;

    // 7. Seed DynamicContent: regulatory bodies
    const regBodiesItems = REGULATORY_BODIES_SEED.map((body) => ({
      contentKey: `compliance:regulatory-body:${body.id}`,
      section: 'regulatory-bodies',
      data: body,
    }));
    const regBodiesCount = await bulkUpsertContent(
      'compliance',
      regBodiesItems,
      { sourceType: 'seed', sourceUrl: 'https://www.unoosa.org/' }
    );
    results.regulatoryBodies = regBodiesCount;

    // 8. Seed DynamicContent: legal proceedings
    const legalProceedingsCount = await bulkUpsertContent(
      'compliance',
      LEGAL_PROCEEDINGS_SEED,
      { sourceType: 'seed' }
    );
    results.legalProceedings = legalProceedingsCount;

    // 9. Seed DynamicContent: bid protests
    const bidProtestsCount = await bulkUpsertContent(
      'compliance',
      BID_PROTESTS_SEED,
      { sourceType: 'seed' }
    );
    results.bidProtests = bidProtestsCount;

    // 10. Fetch live data: ITU filings (seed + Federal Register proxy)
    try {
      const { fetchAndStoreITUFilings } = await import('@/lib/fetchers/itu-filings-fetcher');
      const ituResult = await fetchAndStoreITUFilings();
      results.ituFilings = ituResult;
    } catch (error) {
      results.ituFilings = { error: error instanceof Error ? error.message : String(error) };
    }

    // 11. Fetch live data: FCC filings
    try {
      const { fetchAndStoreFCCFilings } = await import('@/lib/fetchers/fcc-space-filings-fetcher');
      const fccCount = await fetchAndStoreFCCFilings();
      results.fccFilings = fccCount;
    } catch (error) {
      results.fccFilings = { error: error instanceof Error ? error.message : String(error) };
    }

    // 12. Fetch live data: FAA licenses
    try {
      const { fetchAndStoreFAALicenses } = await import('@/lib/fetchers/faa-license-fetcher');
      const faaCount = await fetchAndStoreFAALicenses();
      results.faaLicenses = faaCount;
    } catch (error) {
      results.faaLicenses = { error: error instanceof Error ? error.message : String(error) };
    }

    // 13. Fetch live data: SEC filings
    try {
      const { fetchAndStoreSECFilings } = await import('@/lib/fetchers/sec-edgar-fetcher');
      const secCount = await fetchAndStoreSECFilings();
      results.secFilings = secCount;
    } catch (error) {
      results.secFilings = { error: error instanceof Error ? error.message : String(error) };
    }

    // 14. Fetch live data: Federal Register entries
    try {
      const { fetchAndStoreFederalRegister } = await import('@/lib/fetchers/federal-register-fetcher');
      const fedRegResult = await fetchAndStoreFederalRegister();
      results.federalRegisterEntries = fedRegResult;
    } catch (error) {
      results.federalRegisterEntries = { error: error instanceof Error ? error.message : String(error) };
    }

    const duration = Date.now() - startTime;

    logger.info('Compliance init complete', { duration, results });

    return NextResponse.json({
      success: true,
      message: 'Compliance data initialized with all sections',
      duration: `${duration}ms`,
      results,
    });
  } catch (error) {
    logger.error('Failed to initialize compliance data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to initialize compliance data', results },
      { status: 500 }
    );
  }
}
