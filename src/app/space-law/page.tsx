'use client';

import { useState, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import InlineDisclaimer from '@/components/InlineDisclaimer';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import ExportButton from '@/components/ui/ExportButton';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';

// ############################################################################
// TYPES
// ############################################################################

type TabId = 'un-treaties' | 'international' | 'national' | 'emerging';

type EntryType = 'treaty' | 'agreement' | 'national_law' | 'guideline';
type EntryStatus = 'in_force' | 'pending' | 'adopted' | 'proposed' | 'not_widely_ratified';

interface SpaceLawEntry {
  id: string;
  name: string;
  fullName: string;
  year: number;
  type: EntryType;
  status: EntryStatus;
  parties: number | null;
  keyProvisions: string[];
  significance: string;
  description: string;
  category: TabId;
  governingBody?: string;
  region?: string;
}

// ############################################################################
// STATUS & TYPE CONFIGS
// ############################################################################

const STATUS_CONFIG: Record<EntryStatus, { label: string; bg: string; text: string; border: string }> = {
  in_force: { label: 'In Force', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  pending: { label: 'Pending', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  adopted: { label: 'Adopted', bg: 'bg-white/10', text: 'text-slate-300', border: 'border-white/10' },
  proposed: { label: 'Proposed', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  not_widely_ratified: { label: 'Not Widely Ratified', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
};

const TYPE_CONFIG: Record<EntryType, { label: string; bg: string; text: string; icon: string }> = {
  treaty: { label: 'Treaty', bg: 'bg-purple-500/20', text: 'text-purple-400', icon: '\uD83D\uDCDC' },
  agreement: { label: 'Agreement', bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '\uD83E\uDD1D' },
  national_law: { label: 'National Law', bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: '\uD83C\uDFDB\uFE0F' },
  guideline: { label: 'Guideline', bg: 'bg-amber-500/20', text: 'text-amber-400', icon: '\uD83D\uDCD0' },
};

// ############################################################################
// DATA - 24 entries across 4 categories
// ############################################################################

const SPACE_LAW_ENTRIES: SpaceLawEntry[] = [
  // ======== UN TREATIES ========
  {
    id: 'ost-1967',
    name: 'Outer Space Treaty',
    fullName: 'Treaty on Principles Governing the Activities of States in the Exploration and Use of Outer Space, including the Moon and Other Celestial Bodies',
    year: 1967,
    type: 'treaty',
    status: 'in_force',
    parties: 114,
    keyProvisions: [
      'Space exploration shall be carried out for the benefit of all countries',
      'Outer space is not subject to national appropriation',
      'States shall not place nuclear weapons in space',
      'States bear international responsibility for national space activities',
      'Astronauts are envoys of mankind',
      'States shall avoid harmful contamination of space and celestial bodies',
    ],
    significance: 'The foundational treaty of international space law. Establishes the principle that outer space is the province of all humankind and sets the legal framework for all subsequent space treaties. Often referred to as the "Magna Carta of Space."',
    description: 'Opened for signature in 1967 and entered into force the same year, the Outer Space Treaty provides the basic framework for international space law. It bars states from placing weapons of mass destruction in orbit, establishes freedom of exploration, and prohibits sovereignty claims over celestial bodies.',
    category: 'un-treaties',
    governingBody: 'United Nations',
  },
  {
    id: 'rescue-1968',
    name: 'Rescue Agreement',
    fullName: 'Agreement on the Rescue of Astronauts, the Return of Astronauts and the Return of Objects Launched into Outer Space',
    year: 1968,
    type: 'treaty',
    status: 'in_force',
    parties: 98,
    keyProvisions: [
      'States shall immediately notify the launching authority of astronauts in distress',
      'States shall take all possible steps to rescue and assist astronauts',
      'Astronauts shall be safely and promptly returned to the launching state',
      'States shall notify the launching authority of space objects found on their territory',
      'Launching authority shall bear costs of recovery and return',
    ],
    significance: 'Elaborates on the rescue provisions of the Outer Space Treaty, creating a binding obligation for states to assist astronauts in distress regardless of nationality. Critical for establishing humanitarian norms in spaceflight.',
    description: 'The Rescue Agreement expands upon Articles V and VIII of the Outer Space Treaty. It requires contracting parties to take all possible steps to rescue astronauts in distress and return them to the launching state, and to return space objects found beyond the territory of the launching state.',
    category: 'un-treaties',
    governingBody: 'United Nations',
  },
  {
    id: 'liability-1972',
    name: 'Liability Convention',
    fullName: 'Convention on International Liability for Damage Caused by Space Objects',
    year: 1972,
    type: 'treaty',
    status: 'in_force',
    parties: 98,
    keyProvisions: [
      'Launching state is absolutely liable for damage on Earth surface or to aircraft',
      'Fault-based liability for damage in outer space',
      'Claims may be presented through diplomatic channels',
      'Claims Commission established if diplomatic settlement fails',
      'Joint launches create joint and several liability',
    ],
    significance: 'Establishes the legal mechanism for liability claims related to space activities. Only invoked once in a formal claim (Cosmos 954 incident, 1978, where Canada claimed against USSR for nuclear-powered satellite debris falling on Canadian territory).',
    description: 'Elaborates on Article VII of the Outer Space Treaty, establishing a dual liability regime: absolute liability for damage on Earth and fault-based liability for damage in space. Canada successfully used this convention to claim $6 million from the USSR after Cosmos 954 scattered radioactive debris across Canadian territory in 1978.',
    category: 'un-treaties',
    governingBody: 'United Nations',
  },
  {
    id: 'registration-1976',
    name: 'Registration Convention',
    fullName: 'Convention on Registration of Objects Launched into Outer Space',
    year: 1976,
    type: 'treaty',
    status: 'in_force',
    parties: 72,
    keyProvisions: [
      'Launching states must maintain a national registry of space objects',
      'States shall provide orbital parameters to the UN Secretary-General',
      'UN shall maintain a central register of space objects',
      'Registration includes designator, date/territory of launch, and orbital parameters',
      'Assists in identification of space objects causing damage',
    ],
    significance: 'Creates a transparent system for tracking all objects launched into space. The UN Register is maintained by UNOOSA and is essential for space situational awareness, liability attribution, and debris tracking.',
    description: 'Expands on Article VIII of the Outer Space Treaty by requiring states to register space objects with both a national registry and the UN central register. This registration is critical for determining jurisdiction, liability, and ownership of objects in space.',
    category: 'un-treaties',
    governingBody: 'United Nations',
  },
  {
    id: 'moon-1979',
    name: 'Moon Agreement',
    fullName: 'Agreement Governing the Activities of States on the Moon and Other Celestial Bodies',
    year: 1979,
    type: 'treaty',
    status: 'not_widely_ratified',
    parties: 18,
    keyProvisions: [
      'The Moon and its natural resources are the common heritage of mankind',
      'Moon shall be used exclusively for peaceful purposes',
      'An international regime shall govern exploitation of lunar resources',
      'Exploration shall not disrupt the existing balance of the lunar environment',
      'States shall inform the UN of lunar activities and discoveries',
      'Freedom of scientific investigation on the Moon',
    ],
    significance: 'Controversial for its "common heritage of mankind" provision regarding lunar resources. Not ratified by any major spacefaring nation (US, Russia, China, ESA members), making it largely symbolic. Its failure to gain broad acceptance influenced the Artemis Accords approach.',
    description: 'The Moon Agreement attempted to create a comprehensive legal framework for activities on the Moon and other celestial bodies. Its "common heritage" principle, which implied resource extraction would require an international governing regime, was rejected by space-faring nations who viewed it as an impediment to commercial development.',
    category: 'un-treaties',
    governingBody: 'United Nations',
  },

  // ======== INTERNATIONAL AGREEMENTS ========
  {
    id: 'itu-radio-regulations',
    name: 'ITU Radio Regulations',
    fullName: 'ITU Radio Regulations - International Spectrum and Orbital Slot Allocation Framework',
    year: 1906,
    type: 'agreement',
    status: 'in_force',
    parties: 193,
    keyProvisions: [
      'Allocation of radio-frequency spectrum to space and terrestrial services',
      'Coordination procedures for satellite network frequency assignments',
      'Orbital slot allocation for geostationary satellites',
      'Technical standards for avoiding harmful interference',
      'Advance publication and coordination requirements for space stations',
      'Updated every 3-4 years at World Radiocommunication Conferences (WRC)',
    ],
    significance: 'The fundamental international framework for managing the radio-frequency spectrum and satellite orbital positions. Essential for preventing interference between the thousands of satellites and ground stations operating worldwide.',
    description: 'The ITU Radio Regulations are continuously updated international treaty-level regulations governing the global use of radio-frequency spectrum and satellite orbits. Originally established in 1906 and regularly revised at World Radiocommunication Conferences, they are binding on all 193 ITU member states.',
    category: 'international',
    governingBody: 'International Telecommunication Union (ITU)',
  },
  {
    id: 'mtcr',
    name: 'MTCR',
    fullName: 'Missile Technology Control Regime',
    year: 1987,
    type: 'agreement',
    status: 'in_force',
    parties: 35,
    keyProvisions: [
      'Controls transfers of missiles and unmanned aerial vehicles capable of delivering WMDs',
      'Category I: complete rocket systems with 300km+ range and 500kg+ payload are a strong presumption of denial',
      'Category II: other missile-related components assessed case-by-case',
      'Voluntary, non-binding political commitment (not a treaty)',
      'Technology Annex lists controlled items updated regularly',
      'Information sharing among partners on transfer requests',
    ],
    significance: 'Significantly impacts the space launch industry by controlling the export of rocket technology. Has been both praised for preventing proliferation and criticized for impeding legitimate space cooperation with developing nations.',
    description: 'The MTCR is an informal partnership among 35 countries to limit the proliferation of missiles and missile technology capable of carrying weapons of mass destruction. While voluntary, its guidelines strongly influence national export control laws affecting space launch vehicles.',
    category: 'international',
    governingBody: 'MTCR Partners (no formal secretariat)',
  },
  {
    id: 'wassenaar',
    name: 'Wassenaar Arrangement',
    fullName: 'The Wassenaar Arrangement on Export Controls for Conventional Arms and Dual-Use Goods and Technologies',
    year: 1996,
    type: 'agreement',
    status: 'in_force',
    parties: 42,
    keyProvisions: [
      'Controls export of dual-use goods and technologies applicable to both civilian and military uses',
      'Maintains a list of controlled items including satellite components and space sensors',
      'Participating states implement controls through national legislation',
      'Information sharing on transfers of controlled items',
      'Best practices for controlling intangible transfers of technology',
      'Regular list reviews to address emerging technologies',
    ],
    significance: 'Directly affects the commercial space industry by controlling exports of satellite components, space-grade electronics, propulsion systems, and earth observation technology. Companies must navigate these controls when engaging in international space commerce.',
    description: 'Established in 1996 to succeed COCOM, the Wassenaar Arrangement promotes transparency and responsibility in transfers of conventional arms and dual-use goods and technologies. Its control lists include numerous items relevant to space activities, from radiation-hardened electronics to advanced composite materials.',
    category: 'international',
    governingBody: 'Wassenaar Arrangement Secretariat (Vienna)',
  },
  {
    id: 'artemis-accords-2020',
    name: 'Artemis Accords',
    fullName: 'Principles for Cooperation in the Civil Exploration and Use of the Moon, Mars, Comets, and Asteroids for Peaceful Purposes',
    year: 2020,
    type: 'agreement',
    status: 'in_force',
    parties: 43,
    keyProvisions: [
      'Reaffirms the Outer Space Treaty as the foundation for space governance',
      'Commits signatories to transparency in space activities',
      'Interoperability standards for critical space systems',
      'Emergency assistance obligations among signatories',
      'Registration of space objects with UNOOSA',
      'Release of scientific data in a timely manner',
      'Preservation of outer space heritage sites (e.g., Apollo landing sites)',
      'Space resource extraction is permitted and not inherently contrary to the Outer Space Treaty',
      'Notification of safety zones around operations',
      'Commitment to mitigate orbital debris',
    ],
    significance: 'The most significant multilateral space governance initiative of the 21st century. Led by NASA, the Accords create a practical framework for lunar and deep-space exploration that sidesteps the Moon Agreement. Growing signatory list demonstrates broadening international consensus on space resource utilization norms.',
    description: 'Initiated by NASA and the US State Department, the Artemis Accords establish a political framework for civil space exploration based on the Outer Space Treaty. As of 2024, 43 nations have signed. The Accords are notable for their pragmatic approach to space resources, heritage preservation, and safety zones without requiring a new binding treaty.',
    category: 'international',
    governingBody: 'NASA / US State Department',
  },
  {
    id: 'esa-cooperation',
    name: 'ESA Convention',
    fullName: 'Convention for the Establishment of a European Space Agency',
    year: 1975,
    type: 'agreement',
    status: 'in_force',
    parties: 22,
    keyProvisions: [
      'Establishes ESA as an intergovernmental organization for space research and technology',
      'Mandatory and optional program structure for member contributions',
      'Industrial return policy (Juste Retour) ensuring fair distribution of contracts',
      'Coordination with EU space programs',
      'Technology transfer and intellectual property provisions',
    ],
    significance: 'The legal foundation for European space cooperation. ESA Convention enables pooled investment in space infrastructure that no single European nation could afford alone, from Ariane launchers to Earth observation satellites.',
    description: 'The ESA Convention established the European Space Agency in 1975 by merging the former ESRO and ELDO. It creates the governance structure for European space activities, with 22 member states contributing to both mandatory core programs and optional programs they select based on national priorities.',
    category: 'international',
    governingBody: 'European Space Agency (ESA)',
  },
  {
    id: 'iss-iga',
    name: 'ISS Intergovernmental Agreement',
    fullName: 'Intergovernmental Agreement on Space Station Cooperation',
    year: 1998,
    type: 'agreement',
    status: 'in_force',
    parties: 15,
    keyProvisions: [
      'Legal framework for the International Space Station partnership',
      'Establishes jurisdiction and control based on module ownership',
      'Cross-waiver of liability among partners',
      'Intellectual property rights for inventions made in space',
      'Criminal jurisdiction follows nationality of the accused',
      'Crew Code of Conduct provisions',
    ],
    significance: 'The most complex international cooperation agreement in space history. The ISS IGA pioneered legal concepts for multi-national space habitats, including the innovative cross-waiver of liability and nationality-based criminal jurisdiction in orbit, providing a template for future space station agreements.',
    description: 'Signed in 1998 among the US, Russia, Japan, Canada, and ESA member states, the ISS IGA provides the legal and governance framework for building and operating the International Space Station. It addresses jurisdiction, intellectual property, criminal law, and liability through a unique cross-waiver mechanism.',
    category: 'international',
    governingBody: 'ISS Partner States',
  },

  // ======== NATIONAL LAWS ========
  {
    id: 'us-cslca-2015',
    name: 'US Commercial Space Launch Competitiveness Act',
    fullName: 'US Commercial Space Launch Competitiveness Act (H.R. 2262)',
    year: 2015,
    type: 'national_law',
    status: 'in_force',
    parties: null,
    keyProvisions: [
      'US citizens may engage in commercial recovery of space resources',
      'Property rights granted for resources obtained from asteroids and other celestial bodies',
      'Does not assert sovereignty over any celestial body',
      'Extended ISS operations authorization through 2024',
      'Streamlined FAA commercial launch licensing',
      'Learning period for commercial spaceflight regulation extended',
    ],
    significance: 'First national law to explicitly grant property rights over extracted space resources. Sparked an international debate about the interpretation of the Outer Space Treaty and influenced Luxembourg and other nations to adopt similar legislation.',
    description: 'Signed into law by President Obama in November 2015, Title IV (the SPACE Act) grants US citizens the right to own, transport, use, and sell resources obtained from asteroids and other celestial bodies. While asserting this does not constitute sovereignty, it was a landmark in space resource policy.',
    category: 'national',
    region: 'United States',
  },
  {
    id: 'lux-space-resources-2017',
    name: 'Luxembourg Space Resources Act',
    fullName: 'Loi du 20 juillet 2017 sur l\'exploration et l\'utilisation des ressources de l\'espace',
    year: 2017,
    type: 'national_law',
    status: 'in_force',
    parties: null,
    keyProvisions: [
      'Companies authorized by Luxembourg may own space resources they extract',
      'Applies to any company incorporated under Luxembourg law (not just nationals)',
      'Requires government authorization for space mining missions',
      'Ministry of Economy supervises space resource activities',
      'Government may invest in qualifying companies',
    ],
    significance: 'First European nation and second country worldwide to establish a legal framework for space resource utilization. Luxembourg positioned itself as a hub for space mining companies by offering a more accessible regime than the US version.',
    description: 'Luxembourg became the first European country to adopt a legal framework recognizing the right to own resources extracted from space. Unlike the US law which restricts rights to US citizens, the Luxembourg law extends to any company with a registered office in Luxembourg, attracting international space mining ventures.',
    category: 'national',
    region: 'Luxembourg',
  },
  {
    id: 'uae-space-2019',
    name: 'UAE National Space Policy',
    fullName: 'Federal Law No. 12 of 2019 on the Regulation of the Space Sector',
    year: 2019,
    type: 'national_law',
    status: 'in_force',
    parties: null,
    keyProvisions: [
      'Comprehensive regulatory framework for all space activities from UAE territory',
      'Licensing requirements for launch, satellite operation, and return activities',
      'Space resource utilization provisions',
      'Mandatory registration with the UAE Space Agency',
      'Third-party liability insurance requirements',
      'Environmental protection obligations for space operations',
    ],
    significance: 'One of the most modern and comprehensive national space laws. Reflects UAE ambitions to become a major spacefaring nation and provides a regulatory framework designed to attract private space companies to the region.',
    description: 'The UAE Space Sector Regulation Law provides comprehensive governance of space activities conducted by or within the UAE. It covers licensing, registration, liability, safety, and environmental protection, establishing the UAE Space Agency as the primary regulatory body.',
    category: 'national',
    region: 'United Arab Emirates',
  },
  {
    id: 'uk-space-industry-2018',
    name: 'UK Space Industry Act',
    fullName: 'Space Industry Act 2018 (c. 5)',
    year: 2018,
    type: 'national_law',
    status: 'in_force',
    parties: null,
    keyProvisions: [
      'Licensing framework for UK-based launches and spaceports',
      'Enables sub-orbital spaceflight from UK territory',
      'Range control services regulation',
      'Liabilities, insurance, and indemnities for operators',
      'Environmental assessment requirements for spaceport sites',
      'Secretary of State oversight and enforcement powers',
    ],
    significance: 'Enables the UK to host commercial spaceflight operations domestically. Led to the development of several UK spaceport proposals (e.g., SaxaVord, Cornwall) and established the regulatory foundation for a British launch capability.',
    description: 'The Space Industry Act 2018 provides the legal basis for commercial spaceflight from UK soil, replacing reliance on the 1986 Outer Space Act for launch activities. It established a modern licensing regime administered by the Civil Aviation Authority, enabling vertical and horizontal launch from UK spaceports.',
    category: 'national',
    region: 'United Kingdom',
  },
  {
    id: 'japan-space-activities-2016',
    name: 'Japan Space Activities Act',
    fullName: 'Act on Launching of Spacecraft, etc. and Control of Spacecraft (Act No. 76 of 2016)',
    year: 2016,
    type: 'national_law',
    status: 'in_force',
    parties: null,
    keyProvisions: [
      'Licensing system for launch and satellite operations',
      'Government indemnification above operator insurance threshold',
      'Safety review requirements for launch vehicles',
      'Third-party liability regime with compulsory insurance',
      'Registration and tracking of Japanese space objects',
      'Encourages private sector participation in space activities',
    ],
    significance: 'Japan\'s first comprehensive domestic space law. Enabled the growth of Japanese commercial space companies by providing regulatory certainty and a government backstop for catastrophic liability, similar to the US approach.',
    description: 'Enacted in 2016 and effective from 2018, the Japan Space Activities Act provides a legal framework for private space activities launched from or controlled in Japan. It features a tiered liability system with mandatory insurance and a government indemnification layer.',
    category: 'national',
    region: 'Japan',
  },
  {
    id: 'aus-space-2018',
    name: 'Australia Space Activities Amendment Act',
    fullName: 'Space (Launches and Returns) Amendment Act 2018',
    year: 2018,
    type: 'national_law',
    status: 'in_force',
    parties: null,
    keyProvisions: [
      'Modernized launch permit and authorization system',
      'Rules of return for high-power rockets',
      'Insurance and liability framework for commercial launches',
      'Established Australian Space Agency oversight role',
      'Streamlined approval for launch facilities',
    ],
    significance: 'Modernized Australia\'s space regulatory framework to attract commercial launch providers. Australia\'s geographic advantages (equatorial proximity, ocean-facing launch azimuths) make it an attractive launch location.',
    description: 'The 2018 amendment to Australia\'s Space Activities Act streamlined regulatory processes to encourage commercial space activity. Combined with the establishment of the Australian Space Agency in the same year, it positioned Australia as an emerging launch services destination.',
    category: 'national',
    region: 'Australia',
  },
  {
    id: 'india-space-policy-2023',
    name: 'India National Space Policy',
    fullName: 'Indian National Space Transportation Policy 2023',
    year: 2023,
    type: 'national_law',
    status: 'in_force',
    parties: null,
    keyProvisions: [
      'IN-SPACe authorized to regulate private space activities',
      'NSIL to commercialize ISRO technologies and transfer to industry',
      'Private sector allowed to build and operate launch vehicles',
      'Framework for FDI in Indian space companies',
      'ISRO to focus on R&D while private sector handles commercial operations',
      'Streamlined authorization process for satellite operations',
    ],
    significance: 'Marks a major shift in India\'s space policy, opening the sector to private companies after decades of government monopoly through ISRO. Catalyzed the growth of Indian space startups including Skyroot and Agnikul.',
    description: 'India\'s 2023 National Space Policy formally opens the Indian space sector to private enterprise. IN-SPACe (Indian National Space Promotion and Authorization Center) serves as the single-window authorization body, while NSIL facilitates technology transfer from ISRO to industry.',
    category: 'national',
    region: 'India',
  },

  // ======== EMERGING FRAMEWORKS ========
  {
    id: 'copuos-lts-2019',
    name: 'COPUOS Long-term Sustainability Guidelines',
    fullName: 'Guidelines for the Long-term Sustainability of Outer Space Activities',
    year: 2019,
    type: 'guideline',
    status: 'adopted',
    parties: null,
    keyProvisions: [
      '21 guidelines across four thematic areas',
      'Sustainable use of the space environment',
      'Safety of space operations including collision avoidance',
      'International cooperation, capacity-building, and awareness',
      'Scientific and technical research and development',
      'Regulatory frameworks and guidance for actors in the space arena',
      'Sharing of space debris monitoring information',
    ],
    significance: 'The most comprehensive multilateral set of space sustainability norms adopted to date. While non-binding, they represent international consensus among COPUOS member states and are increasingly referenced by national regulators.',
    description: 'Adopted by the UN COPUOS in 2019 after over a decade of negotiation, these 21 guidelines address sustainable space operations, debris mitigation, space weather preparedness, and regulatory best practices. A Working Group on the LTS Guidelines 2.0 is developing additional measures.',
    category: 'emerging',
    governingBody: 'UN COPUOS',
  },
  {
    id: 'fcc-5year-deorbit-2022',
    name: 'FCC 5-Year Deorbit Rule',
    fullName: 'FCC Order on Mitigation of Orbital Debris in the New Space Age (FCC 22-74)',
    year: 2022,
    type: 'guideline',
    status: 'in_force',
    parties: null,
    keyProvisions: [
      'Satellites in LEO must deorbit within 5 years of mission completion (reduced from 25-year guideline)',
      'Applies to all FCC-licensed or US-market-access satellites',
      'Operators must disclose deorbit plans in license applications',
      'Applies to satellites authorized or modified after the adoption date',
      'Transition period for compliance',
    ],
    significance: 'The most aggressive binding orbital debris mitigation rule adopted by any national regulator. Significantly tightens the previous 25-year deorbit guideline and sets a precedent that other national regulators are expected to follow.',
    description: 'In September 2022, the FCC adopted a rule requiring LEO satellites under its jurisdiction to deorbit within 5 years of mission completion, cutting the previous 25-year guideline by 80%. This rule applies to all new FCC-licensed satellites and is the first binding national regulation to significantly shorten post-mission disposal timelines.',
    category: 'emerging',
    governingBody: 'US Federal Communications Commission (FCC)',
  },
  {
    id: 'esa-zero-debris',
    name: 'ESA Zero Debris Charter',
    fullName: 'ESA Zero Debris Approach and Charter',
    year: 2023,
    type: 'guideline',
    status: 'adopted',
    parties: null,
    keyProvisions: [
      'Goal of zero debris generation by 2030 for ESA missions',
      'All ESA missions to implement debris mitigation from design phase',
      'Active debris removal research and missions (e.g., ClearSpace-1)',
      'Improved tracking and cataloging of debris',
      'Design-for-demise requirements for reentry',
      'Industry partnerships for debris reduction technologies',
    ],
    significance: 'Sets the most ambitious institutional debris reduction target of any space agency. Signals a shift from debris mitigation to debris prevention and establishes benchmarks that commercial operators working with ESA must meet.',
    description: 'ESA\'s Zero Debris Charter commits the agency and its partners to generating zero debris by 2030. This includes design-for-demise principles, active debris removal missions, and stringent post-mission disposal requirements that go beyond international guidelines.',
    category: 'emerging',
    governingBody: 'European Space Agency (ESA)',
  },
  {
    id: 'iadc-guidelines',
    name: 'IADC Space Debris Mitigation Guidelines',
    fullName: 'IADC Space Debris Mitigation Guidelines (Rev. 3)',
    year: 2002,
    type: 'guideline',
    status: 'adopted',
    parties: null,
    keyProvisions: [
      'Limit debris released during normal operations',
      'Minimize potential for on-orbit breakups',
      'Post-mission disposal (originally 25-year guideline)',
      'Prevention of on-orbit collisions',
      'Design and operation practices to minimize debris',
      'Shielding to protect operational spacecraft from small debris',
    ],
    significance: 'The technical foundation for all subsequent national and international debris mitigation guidelines. IADC guidelines are incorporated by reference into COPUOS guidelines, ITU recommendations, and numerous national regulations.',
    description: 'The Inter-Agency Space Debris Coordination Committee (IADC) published its first debris mitigation guidelines in 2002, updated in 2007 and 2020. Representing 13 space agencies including NASA, ESA, JAXA, and CNSA, these guidelines form the technical consensus on debris prevention best practices.',
    category: 'emerging',
    governingBody: 'Inter-Agency Space Debris Coordination Committee (IADC)',
  },
  {
    id: 'un-norms-tcbms',
    name: 'UN Norms of Responsible Behavior',
    fullName: 'UN Resolution on Reducing Space Threats through Norms, Rules and Principles of Responsible Behaviours',
    year: 2021,
    type: 'guideline',
    status: 'pending',
    parties: null,
    keyProvisions: [
      'Open-ended working group to develop norms for responsible space behavior',
      'Addresses threats from destructive ASAT testing',
      'Norms for proximity operations and rendezvous',
      'Transparency and confidence-building measures',
      'Prevention of arms race in outer space (PAROS)',
      'Information sharing on space activities and policies',
    ],
    significance: 'Represents a behavioral-norms approach to space security, contrasting with the traditional treaty-based approach. Gained significant momentum after destructive ASAT tests by Russia (2021) and the subsequent US-led moratorium on such testing.',
    description: 'The UN General Assembly established an Open-Ended Working Group in 2021 to develop norms, rules, and principles of responsible behavior in outer space. This initiative takes a pragmatic approach, focusing on behaviors rather than weapons definitions, in response to growing concerns about space security threats.',
    category: 'emerging',
    governingBody: 'United Nations General Assembly',
  },
  {
    id: 'stm-best-practices',
    name: 'Space Traffic Management Standards',
    fullName: 'Emerging Space Traffic Management (STM) Best Practices and Standards',
    year: 2024,
    type: 'guideline',
    status: 'proposed',
    parties: null,
    keyProvisions: [
      'Standardized conjunction assessment and collision avoidance protocols',
      'Common data formats for sharing tracking information',
      'Right-of-way rules for orbital maneuvers',
      'Minimum tracking and identification requirements for all space objects',
      'International coordination framework for space traffic',
      'Integration of commercial SSA data with government catalogs',
    ],
    significance: 'Addresses the most critical gap in space governance as satellite constellations grow rapidly. Without effective STM, the risk of Kessler Syndrome (cascading collisions) increases. Multiple initiatives are competing to establish standards.',
    description: 'Space Traffic Management encompasses emerging standards from multiple bodies (COPUOS, ISO, national agencies) to manage the rapidly growing number of objects in orbit. With mega-constellations deploying thousands of satellites, effective STM is urgently needed to prevent collisions and maintain access to orbit.',
    category: 'emerging',
    governingBody: 'Multiple (COPUOS, ISO, National Agencies)',
  },
];

// ############################################################################
// COMPONENTS
// ############################################################################

function StatCard({ value, label, color = 'text-white' }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="card-elevated p-5 text-center">
      <div className={`text-3xl font-bold font-display tracking-tight ${color}`}>{value}</div>
      <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">{label}</div>
    </div>
  );
}

function EntryCard({ entry }: { entry: SpaceLawEntry }) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = STATUS_CONFIG[entry.status];
  const typeStyle = TYPE_CONFIG[entry.type];

  return (
    <div className="card p-5 hover:border-white/15/50 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xl">{typeStyle.icon}</span>
          <span className={`text-xs font-bold px-2 py-1 rounded ${typeStyle.bg} ${typeStyle.text}`}>
            {typeStyle.label}
          </span>
          <span className={`text-xs px-2 py-1 rounded border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
            {statusStyle.label}
          </span>
        </div>
        <span className="text-xs text-slate-400 font-mono shrink-0">{entry.year}</span>
      </div>

      {/* Title */}
      <h4 className="font-semibold text-white text-base mb-1">{entry.name}</h4>
      <p className="text-xs text-slate-400 mb-3 line-clamp-2">{entry.fullName}</p>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-3">
        {entry.parties !== null && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-white font-medium">{entry.parties}</span> parties/signatories
          </span>
        )}
        {entry.governingBody && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {entry.governingBody}
          </span>
        )}
        {entry.region && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {entry.region}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-slate-400 text-sm mb-3 leading-relaxed line-clamp-3">{entry.description}</p>

      {/* Significance */}
      <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
        <h5 className="text-xs font-semibold text-slate-300 mb-1">Significance</h5>
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{entry.significance}</p>
      </div>

      {/* Expand button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-slate-200 hover:text-white transition-colors"
      >
        {expanded ? 'Hide Key Provisions \u25B2' : 'View Key Provisions \u25BC'}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <h5 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Key Provisions</h5>
          <ul className="space-y-1.5">
            {entry.keyProvisions.map((provision, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                <svg className="w-3 h-3 text-slate-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {provision}
              </li>
            ))}
          </ul>

          {/* Full significance when expanded */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <h5 className="text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">Full Significance</h5>
            <p className="text-xs text-slate-400 leading-relaxed">{entry.significance}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TabContent({ entries, tabId }: { entries: SpaceLawEntry[]; tabId: TabId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'year-desc' | 'year-asc' | 'name' | 'parties'>('year-desc');

  const uniqueTypes = useMemo(() => Array.from(new Set(entries.map((e) => e.type))), [entries]);
  const uniqueStatuses = useMemo(() => Array.from(new Set(entries.map((e) => e.status))), [entries]);

  const filtered = useMemo(() => {
    let result = entries.filter((entry) => {
      if (typeFilter && entry.type !== typeFilter) return false;
      if (statusFilter && entry.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          entry.name.toLowerCase().includes(q) ||
          entry.fullName.toLowerCase().includes(q) ||
          entry.description.toLowerCase().includes(q) ||
          entry.significance.toLowerCase().includes(q) ||
          entry.keyProvisions.some((p) => p.toLowerCase().includes(q)) ||
          (entry.governingBody && entry.governingBody.toLowerCase().includes(q)) ||
          (entry.region && entry.region.toLowerCase().includes(q))
        );
      }
      return true;
    });

    switch (sortBy) {
      case 'year-asc':
        result = [...result].sort((a, b) => a.year - b.year);
        break;
      case 'year-desc':
        result = [...result].sort((a, b) => b.year - a.year);
        break;
      case 'name':
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'parties':
        result = [...result].sort((a, b) => (b.parties || 0) - (a.parties || 0));
        break;
    }

    return result;
  }, [entries, searchQuery, typeFilter, statusFilter, sortBy]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setTypeFilter('');
    setStatusFilter('');
    setSortBy('year-desc');
  }, []);

  const exportData = useMemo(() => filtered.map((e) => ({
    name: e.name,
    fullName: e.fullName,
    year: e.year,
    type: TYPE_CONFIG[e.type].label,
    status: STATUS_CONFIG[e.status].label,
    parties: e.parties || 'N/A',
    governingBody: e.governingBody || '',
    region: e.region || '',
    significance: e.significance,
    keyProvisions: e.keyProvisions.join('; '),
  })), [filtered]);

  return (
    <div>
      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search treaties, provisions, countries..."
            aria-label={`Search ${tabId} entries`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
          />
          {uniqueTypes.length > 1 && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
            >
              <option value="">All Types</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
              ))}
            </select>
          )}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
          >
            <option value="">All Statuses</option>
            {uniqueStatuses.map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
          >
            <option value="year-desc">Newest First</option>
            <option value="year-asc">Oldest First</option>
            <option value="name">Name (A-Z)</option>
            <option value="parties">Most Parties</option>
          </select>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400">{filtered.length} entries</span>
            <ExportButton
              data={exportData}
              filename={`space-law-${tabId}`}
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'year', label: 'Year' },
                { key: 'type', label: 'Type' },
                { key: 'status', label: 'Status' },
                { key: 'parties', label: 'Parties' },
                { key: 'significance', label: 'Significance' },
                { key: 'keyProvisions', label: 'Key Provisions' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {filtered.length > 0 ? (
        <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((entry) => (
            <StaggerItem key={entry.id}>
              <EntryCard entry={entry} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      ) : (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">{'\uD83D\uDD0D'}</div>
          <h3 className="text-xl font-semibold text-white mb-2">No entries match your search</h3>
          <p className="text-slate-400 text-sm mb-4">Try adjusting your filters or search terms</p>
          <button
            onClick={handleClearFilters}
            className="text-slate-200 hover:text-white text-sm transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}

// ############################################################################
// TAB DESCRIPTIONS
// ############################################################################

const TAB_DESCRIPTIONS: Record<TabId, { title: string; description: string; icon: string }> = {
  'un-treaties': {
    title: 'UN Core Space Treaties',
    description: 'The five foundational United Nations treaties that establish the legal framework for all space activities. Negotiated through COPUOS and deposited with the UN Secretary-General.',
    icon: '\uD83C\uDF0D',
  },
  international: {
    title: 'International Agreements',
    description: 'Multilateral agreements and arrangements governing spectrum allocation, export controls, cooperative space programs, and shared governance of space activities.',
    icon: '\uD83E\uDD1D',
  },
  national: {
    title: 'National Space Laws',
    description: 'Domestic legislation enacted by spacefaring nations to regulate commercial space activities, space resource rights, launch licensing, and satellite operations within their jurisdictions.',
    icon: '\uD83C\uDFDB\uFE0F',
  },
  emerging: {
    title: 'Emerging Frameworks',
    description: 'Non-binding guidelines, best practices, and proposed standards addressing contemporary space challenges including orbital debris, space traffic management, and responsible behavior norms.',
    icon: '\uD83D\uDE80',
  },
};

// ############################################################################
// MAIN CONTENT COMPONENT (inside Suspense)
// ############################################################################

function SpaceLawContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialTab = (searchParams.get('tab') || 'un-treaties') as TabId;
  const validTabs: TabId[] = ['un-treaties', 'international', 'national', 'emerging'];
  const [activeTab, setActiveTab] = useState<TabId>(validTabs.includes(initialTab) ? initialTab : 'un-treaties');

  // Sync tab to URL
  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      const params = new URLSearchParams();
      if (tab !== 'un-treaties') params.set('tab', tab);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );

  useSwipeTabs(
    validTabs,
    activeTab,
    (tab) => handleTabChange(tab as TabId)
  );

  // Entries for current tab
  const tabEntries = useMemo(
    () => SPACE_LAW_ENTRIES.filter((e) => e.category === activeTab),
    [activeTab]
  );

  // Global stats
  const stats = useMemo(() => {
    const total = SPACE_LAW_ENTRIES.length;
    const inForce = SPACE_LAW_ENTRIES.filter((e) => e.status === 'in_force').length;
    const totalParties = SPACE_LAW_ENTRIES.reduce((sum, e) => sum + (e.parties || 0), 0);
    const oldestYear = Math.min(...SPACE_LAW_ENTRIES.map((e) => e.year));
    const newestYear = Math.max(...SPACE_LAW_ENTRIES.map((e) => e.year));
    const countries = new Set(SPACE_LAW_ENTRIES.filter((e) => e.region).map((e) => e.region));
    return { total, inForce, totalParties, oldestYear, newestYear, countriesCount: countries.size };
  }, []);

  const tabs: { id: TabId; label: string; count: number; icon: string }[] = [
    { id: 'un-treaties', label: 'UN Treaties', count: SPACE_LAW_ENTRIES.filter((e) => e.category === 'un-treaties').length, icon: '\uD83C\uDF0D' },
    { id: 'international', label: 'International', count: SPACE_LAW_ENTRIES.filter((e) => e.category === 'international').length, icon: '\uD83E\uDD1D' },
    { id: 'national', label: 'National Laws', count: SPACE_LAW_ENTRIES.filter((e) => e.category === 'national').length, icon: '\uD83C\uDFDB\uFE0F' },
    { id: 'emerging', label: 'Emerging', count: SPACE_LAW_ENTRIES.filter((e) => e.category === 'emerging').length, icon: '\uD83D\uDE80' },
  ];

  const tabDesc = TAB_DESCRIPTIONS[activeTab];

  return (
    <div>
      {/* Global Stats */}
      <ScrollReveal>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard value={stats.total} label="Total Entries" color="text-white" />
          <StatCard value={stats.inForce} label="In Force" color="text-green-400" />
          <StatCard value={stats.totalParties} label="Total Parties" color="text-slate-300" />
          <StatCard value={stats.countriesCount} label="National Laws" color="text-emerald-400" />
          <StatCard value={stats.oldestYear} label="Oldest" color="text-amber-400" />
          <StatCard value={stats.newestYear} label="Most Recent" color="text-purple-400" />
        </div>
      </ScrollReveal>

      <InlineDisclaimer />

      {/* Timeline Overview */}
      <ScrollReveal delay={0.1}>
        <div className="card p-5 mb-8 border border-white/15/20 bg-white/5">
          <h3 className="text-white font-semibold mb-3">Evolution of Space Law</h3>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-700" />
            <div className="space-y-4 pl-10">
              {[
                { year: '1967', event: 'Outer Space Treaty signed - foundation of space law', color: 'bg-purple-400' },
                { year: '1968-76', event: 'Rescue, Liability, and Registration treaties complete the UN framework', color: 'bg-blue-400' },
                { year: '1979', event: 'Moon Agreement adopted but fails to gain major power support', color: 'bg-orange-400' },
                { year: '1987-96', event: 'MTCR and Wassenaar establish export control regimes', color: 'bg-white' },
                { year: '2002-19', event: 'Debris mitigation guidelines and sustainability norms emerge', color: 'bg-green-400' },
                { year: '2015-23', event: 'National space resource laws enacted by US, Luxembourg, UAE, and others', color: 'bg-emerald-400' },
                { year: '2020+', event: 'Artemis Accords and new frameworks for the commercial space era', color: 'bg-amber-400' },
              ].map((item, i) => (
                <div key={i} className="relative flex items-start gap-3">
                  <div className={`absolute -left-10 top-1 w-3 h-3 rounded-full ${item.color} ring-2 ring-slate-900`} />
                  <div>
                    <span className="text-xs font-bold text-slate-300 font-mono">{item.year}</span>
                    <p className="text-sm text-slate-400">{item.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Tab Navigation */}
      <div className="relative">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 sm:px-5 py-3 min-h-[44px] rounded-lg font-semibold text-sm transition-all whitespace-nowrap touch-target ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 border border-slate-600/50'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-slate-900'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none md:hidden" />
      </div>

      {/* Tab Description Banner */}
      <ScrollReveal>
        <div className="card p-5 mb-6 border border-white/10 bg-white/5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{tabDesc.icon}</span>
            <h3 className="text-white font-semibold">{tabDesc.title}</h3>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">{tabDesc.description}</p>
        </div>
      </ScrollReveal>

      {/* Tab Content */}
      <TabContent entries={tabEntries} tabId={activeTab} />
    </div>
  );
}

// ############################################################################
// PAGE COMPONENT
// ############################################################################

export default function SpaceLawPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Space Law & Treaties Database"
          subtitle="Comprehensive database of international treaties, agreements, national legislation, and emerging frameworks governing outer space activities"
          icon={'\u2696\uFE0F'}
          accentColor="purple"
        >
          <Link href="/" className="btn-secondary text-sm py-2 px-4">
            &larr; Back to Dashboard
          </Link>
        </AnimatedPageHeader>

        <Suspense
          fallback={
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          }
        >
          <SpaceLawContent />
        </Suspense>

        <RelatedModules modules={PAGE_RELATIONS['space-law']} />
      </div>
    </div>
  );
}
