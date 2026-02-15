import type { Metadata } from 'next';
import Link from 'next/link';
import FAQSchema from '@/components/seo/FAQSchema';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Space Regulatory Compliance Guide: ITAR, FCC, FAA & More | SpaceNexus',
  description:
    'Navigate the complex regulatory landscape for space companies. Covers ITAR export controls, FCC satellite licensing, FAA launch licensing, spectrum management, ITU coordination, Artemis Accords, and CMMC cybersecurity requirements.',
  keywords: [
    'space regulatory compliance',
    'ITAR export controls space',
    'FCC satellite licensing',
    'FAA launch license',
    'space spectrum management',
    'Artemis Accords',
    'CMMC space industry',
    'space law regulations',
  ],
  openGraph: {
    title: 'Space Regulatory Compliance Guide: ITAR, FCC, FAA & More',
    description:
      'Complete guide to regulatory compliance for space companies, covering ITAR, FCC, FAA, ITU, and international frameworks.',
    type: 'article',
    publishedTime: '2026-02-14T00:00:00Z',
    authors: ['SpaceNexus'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/guide/space-regulatory-compliance',
  },
};

const TOC = [
  { id: 'why-compliance', label: 'Why Compliance Matters' },
  { id: 'regulatory-agencies', label: 'Key Regulatory Agencies' },
  { id: 'itar-export', label: 'ITAR & Export Controls' },
  { id: 'fcc-licensing', label: 'FCC Satellite Licensing' },
  { id: 'faa-licensing', label: 'FAA Launch & Reentry Licensing' },
  { id: 'spectrum-management', label: 'Spectrum Management & ITU' },
  { id: 'international-frameworks', label: 'International Frameworks' },
  { id: 'cmmc-cybersecurity', label: 'CMMC & Cybersecurity' },
  { id: 'spacenexus-compliance', label: 'SpaceNexus Compliance Tools' },
  { id: 'faq', label: 'FAQ' },
];

const REGULATORY_AGENCIES = [
  {
    agency: 'FAA / AST',
    fullName: 'Federal Aviation Administration / Office of Commercial Space Transportation',
    jurisdiction: 'Commercial launch & reentry',
    keyRegulations: '14 CFR Part 400-499; Launch/reentry licenses',
    website: 'faa.gov/space',
  },
  {
    agency: 'FCC',
    fullName: 'Federal Communications Commission',
    jurisdiction: 'Satellite communications & spectrum',
    keyRegulations: '47 CFR Parts 25, 97; Satellite earth station licenses',
    website: 'fcc.gov',
  },
  {
    agency: 'NOAA / CRSRA',
    fullName: 'National Oceanic & Atmospheric Administration',
    jurisdiction: 'Remote sensing licenses',
    keyRegulations: '15 CFR Part 960; Commercial remote sensing',
    website: 'nesdis.noaa.gov',
  },
  {
    agency: 'State Dept / DDTC',
    fullName: 'Directorate of Defense Trade Controls',
    jurisdiction: 'ITAR / defense articles export',
    keyRegulations: 'ITAR (22 CFR 120-130); USML Category XV',
    website: 'pmddtc.state.gov',
  },
  {
    agency: 'Commerce / BIS',
    fullName: 'Bureau of Industry & Security',
    jurisdiction: 'EAR / dual-use export controls',
    keyRegulations: 'EAR (15 CFR 730-774); CCL Category 9',
    website: 'bis.gov',
  },
  {
    agency: 'ITU',
    fullName: 'International Telecommunication Union',
    jurisdiction: 'Global spectrum & orbit coordination',
    keyRegulations: 'Radio Regulations; Coordination procedures',
    website: 'itu.int',
  },
];

const FAQ_ITEMS = [
  {
    question: 'What is ITAR and does it apply to my space company?',
    answer:
      'ITAR (International Traffic in Arms Regulations) controls the export and temporary import of defense articles and services listed on the US Munitions List (USML). Category XV covers spacecraft and related articles. If your company manufactures, exports, or brokers spacecraft, launch vehicles, or certain satellite components, you must register with the DDTC and comply with ITAR. Even sharing technical data with non-US persons can constitute an export. Violations carry criminal penalties up to $1 million and 20 years imprisonment per violation.',
  },
  {
    question: 'How long does it take to get an FAA launch license?',
    answer:
      'The FAA targets 180 days for a launch or reentry license determination, though the process often takes 12-18 months for new vehicle types. The timeline depends on the complexity of the vehicle, the launch site, and the completeness of the application. Streamlined processes exist for previously licensed vehicles and established launch sites. The FAA modernized its launch licensing rules in 2021 (14 CFR Part 450) to create a more performance-based framework.',
  },
  {
    question: 'Do I need an FCC license for a satellite?',
    answer:
      'Yes, any satellite communicating with the US or operated by a US entity requires FCC authorization. This applies to both the space station (satellite) and the earth stations (ground terminals). The FCC reviews orbital debris mitigation plans, spectrum coordination, and interference potential. Non-geostationary satellite operators must also demonstrate compatibility with existing geostationary systems. Processing times range from 6-24 months depending on complexity.',
  },
  {
    question: 'What is the difference between ITAR and EAR?',
    answer:
      'ITAR (administered by the State Department) covers defense articles on the US Munitions List, while EAR (administered by the Commerce Department) covers dual-use items on the Commerce Control List. A 2014 export control reform moved many spacecraft components from ITAR to EAR, making them easier to export. However, certain items — including launch vehicles, missile technology, and military satellites — remain on the USML under ITAR. The distinction matters because EAR permits more license exceptions and has different country restrictions.',
  },
  {
    question: 'How does SpaceNexus help with regulatory compliance?',
    answer:
      'SpaceNexus provides a compliance tracking dashboard that monitors regulatory requirements across FAA, FCC, NOAA, ITAR, and international frameworks. Features include license expiration tracking, regulatory filing deadlines, spectrum coordination status, treaty obligation monitoring, and automated alerts for regulatory changes that affect your operations. The platform also provides templates and guides for common filings.',
  },
];

export default function SpaceRegulatoryCompliancePage() {
  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        {/* Breadcrumbs */}
        <nav className="pt-6 mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-slate-400">
            <li><Link href="/" className="hover:text-nebula-400 transition-colors">Home</Link></li>
            <li>/</li>
            <li><Link href="/guide/space-industry" className="hover:text-nebula-400 transition-colors">Guides</Link></li>
            <li>/</li>
            <li className="text-nebula-400">Space Regulatory Compliance</li>
          </ol>
        </nav>

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Space Regulatory Compliance Guide: ITAR, FCC, FAA &amp; More
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              Navigating the regulatory landscape is one of the most complex challenges for space companies.
              This guide covers every major regulatory framework — from export controls and launch licensing
              to spectrum coordination and international treaties — so you can operate with confidence.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>Last updated: February 2026</span>
              <span>|</span>
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <span>22 min read</span>
            </div>
          </header>

          {/* Table of Contents */}
          <nav className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 mb-10">
            <h2 className="text-lg font-bold text-white mb-3">Table of Contents</h2>
            <ol className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {TOC.map((item, i) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="text-nebula-400 hover:underline text-sm transition-colors"
                  >
                    {i + 1}. {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Content */}
          <article className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-8 space-y-10">
            {/* Why Compliance Matters */}
            <section id="why-compliance">
              <h2 className="text-2xl font-bold text-white mb-4">Why Regulatory Compliance Matters in Space</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Space is one of the most heavily regulated industries in the world. Unlike terrestrial
                businesses that deal with a single regulatory framework, space companies must simultaneously
                comply with export control laws, communications regulations, launch safety requirements,
                environmental reviews, remote sensing restrictions, and international treaty obligations.
                Failure to comply can result in criminal penalties, loss of operating licenses, and
                irreparable damage to a company&apos;s reputation and business relationships.
              </p>
              <p className="text-slate-300 leading-relaxed mb-4">
                The regulatory burden is not merely a cost of doing business — it fundamentally shapes
                corporate strategy. ITAR restrictions determine which international partnerships and customers
                are feasible. FCC licensing timelines dictate satellite development schedules. FAA launch
                licensing requirements influence launch site selection and vehicle design. Companies that
                master the regulatory landscape gain a significant competitive advantage, while those that
                underestimate it face delays, fines, and lost market opportunities.
              </p>
              <p className="text-slate-300 leading-relaxed">
                The regulatory environment is also evolving rapidly. The FAA modernized its launch licensing
                rules in 2021. The FCC updated its orbital debris mitigation requirements in 2022. The
                Commerce Department is building new space traffic management capabilities. And international
                frameworks like the Artemis Accords are establishing norms for lunar and deep-space activities.
                Staying current with these changes is essential for any space company.
              </p>
            </section>

            {/* Regulatory Agencies */}
            <section id="regulatory-agencies">
              <h2 className="text-2xl font-bold text-white mb-4">Key Regulatory Agencies</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Space companies in the United States must navigate multiple federal agencies, each with
                distinct jurisdiction over different aspects of space activities. Here is a comprehensive
                overview of the primary regulatory bodies:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="py-3 pr-4 text-left text-white font-semibold">Agency</th>
                      <th className="py-3 pr-4 text-left text-white font-semibold">Jurisdiction</th>
                      <th className="py-3 pr-4 text-left text-white font-semibold">Key Regulations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {REGULATORY_AGENCIES.map((reg) => (
                      <tr key={reg.agency} className="bg-slate-800/60 border-b border-slate-700/50">
                        <td className="py-3 pr-4">
                          <div className="text-white font-medium">{reg.agency}</div>
                          <div className="text-slate-400 text-xs mt-1">{reg.fullName}</div>
                        </td>
                        <td className="py-3 pr-4 text-slate-300">{reg.jurisdiction}</td>
                        <td className="py-3 pr-4 text-slate-300">{reg.keyRegulations}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-slate-300 leading-relaxed mt-4">
                In addition to these federal agencies, space companies may need to comply with state-level
                regulations (particularly for spaceport operations), environmental laws (NEPA, Endangered
                Species Act), and industry-specific standards (NASA-STD-8719.14 for orbital debris, CCSDS
                for data standards).
              </p>
            </section>

            {/* ITAR & Export Controls */}
            <section id="itar-export">
              <h2 className="text-2xl font-bold text-white mb-4">ITAR and Export Controls Explained</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                The International Traffic in Arms Regulations (ITAR) is the most impactful regulatory
                framework for many space companies. Administered by the State Department&apos;s Directorate
                of Defense Trade Controls (DDTC), ITAR controls the export and temporary import of defense
                articles and services listed on the United States Munitions List (USML).
              </p>

              <h3 className="text-xl font-bold text-white mb-3 mt-6">What Falls Under ITAR?</h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                USML Category XV covers &quot;Spacecraft and Related Articles.&quot; This includes launch vehicles,
                spacecraft buses, certain satellite subsystems, ground control systems designed for defense
                purposes, and associated technical data. The key determination is whether an item provides
                a &quot;significant military or intelligence advantage.&quot; Items that are purely commercial and do
                not provide such advantage may fall under the Export Administration Regulations (EAR) instead.
              </p>
              <p className="text-slate-300 leading-relaxed mb-4">
                The 2014 export control reform transferred many spacecraft components from the USML to the
                Commerce Control List (CCL), making them subject to EAR rather than ITAR. This was a significant
                liberalization that enabled US satellite manufacturers to compete more effectively in the global
                market. However, launch vehicles, certain propulsion systems, and military satellites remain
                firmly on the USML.
              </p>

              <h3 className="text-xl font-bold text-white mb-3 mt-6">ITAR Compliance Requirements</h3>
              <ul className="text-slate-300 space-y-2 mb-4">
                <li className="flex items-start gap-3">
                  <span className="text-nebula-400 mt-1 flex-shrink-0">&#9656;</span>
                  <span><strong className="text-white">Registration</strong> &mdash; Any company manufacturing, exporting, or brokering defense articles must register with DDTC (annual fee: $2,250 minimum).</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-nebula-400 mt-1 flex-shrink-0">&#9656;</span>
                  <span><strong className="text-white">Licensing</strong> &mdash; Export licenses are required for permanent and temporary exports of defense articles and technical data to non-US persons.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-nebula-400 mt-1 flex-shrink-0">&#9656;</span>
                  <span><strong className="text-white">Technology Control Plans</strong> &mdash; Facilities handling ITAR data must implement physical and cybersecurity controls to prevent unauthorized access.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-nebula-400 mt-1 flex-shrink-0">&#9656;</span>
                  <span><strong className="text-white">Deemed Exports</strong> &mdash; Sharing ITAR technical data with a non-US person within the United States is considered an export and requires a license.</span>
                </li>
              </ul>

              <h3 className="text-xl font-bold text-white mb-3 mt-6">Penalties for ITAR Violations</h3>
              <p className="text-slate-300 leading-relaxed">
                ITAR violations carry severe penalties. Criminal violations can result in fines up to $1 million
                and imprisonment up to 20 years per violation. Civil penalties can reach $500,000 per violation.
                In recent years, several aerospace companies have paid multi-million-dollar settlements for ITAR
                violations, including inadvertent disclosures of technical data. Beyond fines, violations can
                result in debarment from government contracts, which can be an existential threat for defense-
                focused space companies.
              </p>
              <p className="text-slate-300 text-sm mt-4">
                <Link href="/guide/itar-compliance-guide" className="text-nebula-400 hover:underline">
                  Read our detailed ITAR compliance guide &rarr;
                </Link>
              </p>
            </section>

            {/* FCC Satellite Licensing */}
            <section id="fcc-licensing">
              <h2 className="text-2xl font-bold text-white mb-4">FCC Satellite Licensing Process</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                The Federal Communications Commission regulates all satellite communications involving
                the United States. Any satellite operated by a US entity, communicating with US ground
                stations, or serving US customers requires FCC authorization.
              </p>
              <p className="text-slate-300 leading-relaxed mb-4">
                The FCC licensing process involves several key steps. First, operators must file an
                application that includes detailed technical parameters: orbital location (for GEO) or
                constellation design (for NGSO), frequency bands, transmit power, antenna characteristics,
                and interference analysis. The FCC conducts a public notice and comment period during which
                existing operators and other stakeholders can raise concerns about interference or debris risk.
              </p>
              <p className="text-slate-300 leading-relaxed mb-4">
                In 2022, the FCC adopted updated orbital debris mitigation rules requiring satellite operators
                to deorbit LEO satellites within 5 years of mission completion (down from the previous 25-year
                guideline). Operators must submit a detailed debris mitigation plan, including casualty risk
                assessment for atmospheric reentry, collision avoidance capabilities, and passivation procedures.
              </p>
              <p className="text-slate-300 leading-relaxed mb-4">
                For non-geostationary (NGSO) constellations, the FCC has introduced milestone requirements to
                prevent spectrum warehousing. Operators must deploy a percentage of their constellation within
                specified timeframes or risk losing their authorization. This has created urgency for companies
                like Amazon (Project Kuiper) to begin deployment.
              </p>
              <p className="text-slate-300 leading-relaxed">
                The FCC also regulates earth stations (ground terminals). The rise of consumer-grade terminals
                for services like Starlink has created new regulatory considerations around electromagnetic
                interference, especially in shared frequency bands. The Earth Stations in Motion (ESIM) rules
                govern terminals on aircraft, ships, and vehicles.
              </p>
            </section>

            {/* FAA Launch Licensing */}
            <section id="faa-licensing">
              <h2 className="text-2xl font-bold text-white mb-4">FAA Launch and Reentry Licensing</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                The FAA&apos;s Office of Commercial Space Transportation (AST) is responsible for licensing
                commercial launch and reentry operations in the United States. The regulatory framework
                was modernized in 2021 with the adoption of 14 CFR Part 450, replacing the previous
                vehicle-specific rules (Parts 415, 417, 431, 435) with a unified, performance-based framework.
              </p>
              <p className="text-slate-300 leading-relaxed mb-4">
                The new Part 450 rules allow operators greater flexibility in how they demonstrate safety,
                as long as they meet quantitative risk thresholds. The primary safety metric is Expected
                Casualty (Ec), which must not exceed 1 x 10<sup>-4</sup> per mission for the collective risk
                to all members of the public. Operators must conduct detailed flight safety analyses including
                debris fragmentation modeling, blast overpressure calculations, and toxic dispersion analysis.
              </p>
              <p className="text-slate-300 leading-relaxed mb-4">
                A launch license application typically includes vehicle description and performance data,
                mission profile details, flight safety analysis, ground safety plan, environmental review
                (NEPA), and financial responsibility (insurance) documentation. The FAA requires third-party
                liability insurance with coverage typically ranging from $100 million to $500 million depending
                on the mission profile and launch site.
              </p>
              <p className="text-slate-300 leading-relaxed">
                The FAA also licenses launch sites (spaceports). As of 2026, there are 14 FAA-licensed launch
                sites in the United States, including commercial spaceports in Virginia (MARS), Texas (Boca
                Chica), and Alaska (Pacific Spaceport Complex). Each spaceport must obtain a site operator
                license demonstrating safety for the public and compliance with environmental requirements.
              </p>
            </section>

            {/* Spectrum Management */}
            <section id="spectrum-management">
              <h2 className="text-2xl font-bold text-white mb-4">Spectrum Management and ITU Coordination</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Radio spectrum is a finite resource essential to satellite operations. The International
                Telecommunication Union (ITU), a UN specialized agency, coordinates global spectrum allocation
                and satellite orbital assignments to prevent harmful interference between systems.
              </p>
              <p className="text-slate-300 leading-relaxed mb-4">
                The ITU process for obtaining spectrum rights is lengthy and complex. For geostationary
                satellites, an operator must file through their national administration (the FCC for US
                entities) to the ITU&apos;s Radiocommunication Bureau. The filing goes through coordination
                procedures where the operator must negotiate with other administrations whose systems might
                experience interference. The entire process from initial filing to bringing a satellite into
                use can take 7-9 years.
              </p>
              <p className="text-slate-300 leading-relaxed mb-4">
                For non-geostationary constellations, the ITU has established specific regulatory frameworks
                including milestone-based deployment requirements. The 2019 World Radiocommunication Conference
                (WRC-19) introduced rules requiring NGSO operators to deploy portions of their constellation
                within specified timeframes to retain their frequency rights.
              </p>
              <p className="text-slate-300 leading-relaxed">
                Key spectrum bands for satellite services include Ku-band (12-18 GHz) for direct-to-home
                broadcasting and broadband, Ka-band (26.5-40 GHz) for high-throughput satellites, V-band
                (40-75 GHz) for next-generation systems, and L/S-band for mobile satellite services and
                direct-to-device. The growing demand for spectrum, particularly from mega-constellations,
                is creating significant coordination challenges and regulatory innovation.
              </p>
              <p className="text-slate-300 text-sm mt-4">
                <Link href="/spectrum" className="text-nebula-400 hover:underline">
                  Track spectrum allocations and auction results on SpaceNexus &rarr;
                </Link>
              </p>
            </section>

            {/* International Frameworks */}
            <section id="international-frameworks">
              <h2 className="text-2xl font-bold text-white mb-4">International Frameworks</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Space activities are governed by a series of international treaties and agreements that
                establish the legal framework for activities in outer space. Understanding these frameworks
                is critical for companies with international operations or customers.
              </p>

              <h3 className="text-xl font-bold text-white mb-3 mt-6">The Outer Space Treaty (1967)</h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                The foundational treaty of space law, ratified by 114 countries. Key principles include:
                space is free for exploration and use by all states, no national sovereignty claims in space,
                states bear international responsibility for their national space activities (including
                commercial operators), and the duty to avoid harmful contamination of space and celestial
                bodies. This treaty is why governments must authorize and supervise private space activities.
              </p>

              <h3 className="text-xl font-bold text-white mb-3 mt-6">The Artemis Accords (2020)</h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                A set of bilateral agreements establishing norms for civil exploration of the Moon, Mars,
                and beyond. As of 2026, over 40 nations have signed. Key provisions include commitments
                to transparency, interoperability, emergency assistance, registration of space objects,
                release of scientific data, preservation of heritage sites, and prevention of harmful
                interference. The Accords are particularly relevant for companies involved in lunar
                exploration and cislunar activities.
              </p>

              <h3 className="text-xl font-bold text-white mb-3 mt-6">UN COPUOS Guidelines</h3>
              <p className="text-slate-300 leading-relaxed">
                The United Nations Committee on the Peaceful Uses of Outer Space (COPUOS) develops
                non-binding guidelines for the long-term sustainability of space activities. These include
                21 guidelines covering space debris mitigation, space weather information sharing, registry
                practices, and regulatory frameworks. While not legally binding, these guidelines influence
                national regulations and industry best practices worldwide.
              </p>
              <p className="text-slate-300 text-sm mt-4">
                <Link href="/compliance" className="text-nebula-400 hover:underline">
                  Track treaty obligations and regulatory changes on SpaceNexus &rarr;
                </Link>
              </p>
            </section>

            {/* CMMC & Cybersecurity */}
            <section id="cmmc-cybersecurity">
              <h2 className="text-2xl font-bold text-white mb-4">CMMC and Cybersecurity Requirements for Defense Space</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                The Cybersecurity Maturity Model Certification (CMMC) is transforming cybersecurity
                requirements for the defense industrial base, including space companies. CMMC 2.0,
                which began rolling into contracts in 2025, requires third-party assessment of cybersecurity
                practices for companies handling Controlled Unclassified Information (CUI).
              </p>
              <p className="text-slate-300 leading-relaxed mb-4">
                CMMC 2.0 has three levels. Level 1 (Foundational) requires 17 practices for companies
                handling Federal Contract Information (FCI) and allows self-assessment. Level 2 (Advanced)
                requires 110 practices aligned with NIST SP 800-171 for companies handling CUI and requires
                third-party assessment for prioritized acquisitions. Level 3 (Expert) adds 24 additional
                practices from NIST SP 800-172 for the most sensitive programs and requires government
                assessment.
              </p>
              <p className="text-slate-300 leading-relaxed mb-4">
                For space companies, CMMC compliance is particularly challenging due to the distributed
                nature of satellite operations. Ground station networks, mission operations centers, telemetry
                data flows, and supply chain data sharing all create potential attack surfaces that must be
                secured. The Space Force has issued specific cybersecurity guidance for space systems that
                supplements CMMC requirements.
              </p>
              <p className="text-slate-300 leading-relaxed">
                Companies seeking defense space contracts should begin CMMC preparation well in advance.
                Achieving Level 2 certification typically requires 12-18 months of preparation, including
                gap assessment, system security plan development, policy creation, and implementation of
                technical controls. Several Certified Third-Party Assessment Organizations (C3PAOs) specialize
                in aerospace and defense clients.
              </p>
            </section>

            {/* SpaceNexus Compliance Tools */}
            <section id="spacenexus-compliance">
              <h2 className="text-2xl font-bold text-white mb-4">How SpaceNexus Helps with Compliance Tracking</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                SpaceNexus provides a comprehensive compliance management platform designed specifically for
                the space industry. Here is how our tools simplify regulatory compliance:
              </p>
              <ol className="text-slate-300 space-y-2 mb-6">
                <li className="flex items-start gap-3">
                  <span className="bg-nebula-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">1</span>
                  <span><strong className="text-white">Regulatory Dashboard</strong> &mdash; Track all your licenses, filings, and compliance obligations across FAA, FCC, NOAA, and DDTC in one place via our <Link href="/compliance" className="text-nebula-400 hover:underline">Compliance Hub</Link>.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-nebula-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">2</span>
                  <span><strong className="text-white">Spectrum Coordination</strong> &mdash; Monitor spectrum assignments, ITU filings, and interference environments via our <Link href="/spectrum" className="text-nebula-400 hover:underline">Spectrum Management tool</Link>.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-nebula-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">3</span>
                  <span><strong className="text-white">Orbital Slot Tracking</strong> &mdash; Track orbital position assignments and coordination status via our <Link href="/orbital-slots" className="text-nebula-400 hover:underline">Orbital Slots tracker</Link>.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-nebula-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">4</span>
                  <span><strong className="text-white">Treaty Monitor</strong> &mdash; Stay informed about international treaty developments, Artemis Accords updates, and UN COPUOS proceedings.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-nebula-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">5</span>
                  <span><strong className="text-white">Regulatory Alerts</strong> &mdash; Receive automated notifications when regulations change, deadlines approach, or new rulemakings affect your operations.</span>
                </li>
              </ol>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/compliance" className="btn-primary text-sm py-2 px-4">
                  Compliance Hub
                </Link>
                <Link href="/spectrum" className="btn-secondary text-sm py-2 px-4">
                  Spectrum Management
                </Link>
                <Link href="/register" className="btn-secondary text-sm py-2 px-4">
                  Sign Up Free
                </Link>
              </div>
            </section>

            {/* FAQ */}
            <section id="faq">
              <h2 className="text-2xl font-bold text-white mb-4">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {FAQ_ITEMS.map((faq) => (
                  <div key={faq.question} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                    <h3 className="font-semibold text-white text-sm mb-2">{faq.question}</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Related Content */}
            <section className="pt-6 border-t border-slate-700/50">
              <h3 className="text-lg font-bold text-white mb-4">Related Guides</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Link href="/guide/itar-compliance-guide" className="text-nebula-400 hover:underline text-sm transition-colors">
                  Detailed ITAR Compliance Guide &rarr;
                </Link>
                <Link href="/guide/space-business-opportunities" className="text-nebula-400 hover:underline text-sm transition-colors">
                  Space Business Opportunities &rarr;
                </Link>
                <Link href="/guide/space-industry" className="text-nebula-400 hover:underline text-sm transition-colors">
                  Complete Guide to the Space Industry &rarr;
                </Link>
                <Link href="/guide/space-launch-schedule-2026" className="text-nebula-400 hover:underline text-sm transition-colors">
                  2026 Space Launch Schedule &rarr;
                </Link>
              </div>
            </section>
          </article>

          {/* FAQ Schema */}
          <FAQSchema items={FAQ_ITEMS} />

          {/* Article Schema */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: 'Space Regulatory Compliance Guide: ITAR, FCC, FAA & More',
                description: 'Navigate the complex regulatory landscape for space companies. Covers ITAR, FCC, FAA, ITU, and international frameworks.',
                author: { '@type': 'Organization', name: 'SpaceNexus' },
                publisher: { '@type': 'Organization', name: 'SpaceNexus', logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' } },
                datePublished: '2026-02-14T00:00:00Z',
                dateModified: new Date().toISOString(),
                mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://spacenexus.us/guide/space-regulatory-compliance' },
              }),
            }}
          />
        </div>
      </div>
    </div>
  );
}
