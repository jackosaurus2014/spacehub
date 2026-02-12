import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 3600; // ISR: revalidate every hour

export const metadata: Metadata = {
  title: 'ITAR Compliance Guide for Space Companies | SpaceNexus Guide',
  description:
    'Complete ITAR compliance guide for space companies. Understand USML categories, TAAs, licensing, penalties, and best practices for export control.',
  keywords: [
    'ITAR compliance',
    'ITAR space companies',
    'ITAR export control',
    'USML Category XV',
    'space export control',
    'ITAR licensing',
    'technical assistance agreement',
    'DDTC registration',
    'ITAR penalties',
    'space regulatory compliance',
  ],
  openGraph: {
    title: 'ITAR Compliance Guide for Space Companies',
    description:
      'Complete ITAR compliance guide for space companies. USML categories, licensing, penalties, and best practices for export control.',
    type: 'article',
    publishedTime: '2026-02-08T00:00:00Z',
    authors: ['SpaceNexus'],
  },
  alternates: {
    canonical: 'https://spacenexus.com/guide/itar-compliance-guide',
  },
};

/* ------------------------------------------------------------------ */
/*  Table of Contents data                                            */
/* ------------------------------------------------------------------ */
const TOC = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'what-is-itar', label: 'What Is ITAR?' },
  { id: 'usml-categories', label: 'USML Categories for Space' },
  { id: 'who-must-comply', label: 'Who Must Comply' },
  { id: 'registration', label: 'DDTC Registration' },
  { id: 'licensing', label: 'Licensing & Agreements' },
  { id: 'technical-data', label: 'Technical Data Controls' },
  { id: 'ear-vs-itar', label: 'EAR vs. ITAR' },
  { id: 'penalties', label: 'Penalties & Enforcement' },
  { id: 'compliance-program', label: 'Building a Compliance Program' },
  { id: 'recent-developments', label: 'Recent Developments' },
  { id: 'spacenexus', label: 'Track Compliance on SpaceNexus' },
];

/* ------------------------------------------------------------------ */
/*  FAQ data                                                          */
/* ------------------------------------------------------------------ */
const FAQ_ITEMS = [
  {
    q: 'What does ITAR stand for?',
    a: 'ITAR stands for International Traffic in Arms Regulations. It is a set of U.S. government regulations that control the export and import of defense-related articles and services on the United States Munitions List (USML). ITAR is administered by the Directorate of Defense Trade Controls (DDTC) within the U.S. Department of State.',
  },
  {
    q: 'Do all space companies need to comply with ITAR?',
    a: 'Any U.S. company (or foreign entity subject to U.S. jurisdiction) that manufactures, exports, or brokers defense articles or defense services listed on the USML must register with the DDTC and comply with ITAR. This includes most satellite manufacturers, launch vehicle companies, and many component suppliers. However, some commercial satellites and components were moved from the USML to the Commerce Control List (CCL) under EAR jurisdiction through export control reform, reducing the ITAR burden for certain commercial space activities.',
  },
  {
    q: 'What are the penalties for ITAR violations?',
    a: 'ITAR violations can result in criminal penalties of up to $1 million per violation and up to 20 years imprisonment, or civil penalties of up to $1,213,116 per violation (adjusted annually for inflation). Companies may also be debarred from future export activities. Notable settlements include Boeing ($75 million in 2006) and Lockheed Martin/L3 Technologies (tens of millions in various settlements). Even inadvertent violations can result in significant penalties.',
  },
  {
    q: 'What is the difference between ITAR and EAR?',
    a: 'ITAR (International Traffic in Arms Regulations) controls defense articles and services on the USML, administered by the State Department DDTC. EAR (Export Administration Regulations) controls dual-use commercial items on the Commerce Control List (CCL), administered by the Commerce Department Bureau of Industry and Security (BIS). Some commercial satellites and components fall under EAR rather than ITAR following export control reform. The distinction matters significantly for compliance requirements and licensing procedures.',
  },
];

/* ------------------------------------------------------------------ */
/*  Structured data (JSON-LD)                                         */
/* ------------------------------------------------------------------ */
function buildStructuredData() {
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'ITAR Compliance Guide for Space Companies',
    description:
      'Complete guide to ITAR compliance for space companies, covering USML categories, DDTC registration, licensing, technical data controls, and penalties.',
    author: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.com' },
    publisher: {
      '@type': 'Organization',
      name: 'SpaceNexus',
      logo: { '@type': 'ImageObject', url: 'https://spacenexus.com/logo.png' },
    },
    datePublished: '2026-02-08T00:00:00Z',
    dateModified: '2026-02-08T00:00:00Z',
    mainEntityOfPage: 'https://spacenexus.com/guide/itar-compliance-guide',
    image: 'https://spacenexus.com/og-image.png',
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return { article, faqSchema };
}

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */
export default function ItarComplianceGuidePage() {
  const { article, faqSchema } = buildStructuredData();

  return (
    <>
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="min-h-screen">
        {/* ── Hero ── */}
        <header className="relative overflow-hidden py-20 md:py-28">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-nebula-600/30 via-space-900/80 to-transparent pointer-events-none"
          />
          <div className="relative container mx-auto px-4 text-center max-w-4xl">
            <div className="flex items-center justify-center gap-2 text-star-300 text-sm mb-4">
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <span className="text-star-300/50">/</span>
              <Link href="/guide/space-industry" className="hover:text-white transition-colors">
                Guide
              </Link>
              <span className="text-star-300/50">/</span>
              <span className="text-white">ITAR Compliance</span>
            </div>
            <h1 className="text-display-lg md:text-display-xl font-display font-bold text-white mb-6 leading-tight">
              ITAR Compliance Guide for Space Companies
            </h1>
            <p className="text-xl md:text-2xl text-star-200 leading-relaxed max-w-3xl mx-auto">
              Export Controls, Licensing &amp; Best Practices for the Space Industry
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-star-300">
              <time dateTime="2026-02-08">Last updated: February 2026</time>
              <span className="hidden sm:inline text-star-300/40">|</span>
              <span>20 min read</span>
              <span className="hidden sm:inline text-star-300/40">|</span>
              <span>By SpaceNexus Research</span>
            </div>
            <div className="w-24 h-[3px] bg-gradient-to-r from-nebula-500 to-plasma-400 rounded-full mx-auto mt-8" />

            {/* Disclaimer */}
            <div className="mt-8 card p-4 text-left text-sm text-star-300 max-w-2xl mx-auto border-l-4 border-l-yellow-500/50">
              <strong className="text-yellow-400/80">Disclaimer:</strong> This guide is for
              informational purposes only and does not constitute legal advice. Export control
              regulations are complex and change frequently. Always consult qualified legal counsel
              for specific compliance questions.
            </div>
          </div>
        </header>

        {/* ── Main content area ── */}
        <div className="container mx-auto px-4 pb-20">
          <div className="flex flex-col lg:flex-row gap-10 max-w-7xl mx-auto">
            {/* ── Table of Contents (sidebar) ── */}
            <aside className="lg:w-64 shrink-0">
              <nav
                aria-label="Table of Contents"
                className="lg:sticky lg:top-24 card p-5"
              >
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                  Contents
                </h2>
                <ol className="space-y-2 text-sm">
                  {TOC.map((item, i) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="flex items-start gap-2 text-star-300 hover:text-cyan-400 transition-colors"
                      >
                        <span className="text-cyan-500/60 font-mono text-xs mt-0.5">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            {/* ── Article content ── */}
            <article className="min-w-0 flex-1 max-w-3xl">
              {/* ──────────────────────────────────── */}
              {/* 1. Introduction                     */}
              {/* ──────────────────────────────────── */}
              <section id="introduction" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Introduction
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The International Traffic in Arms Regulations (ITAR) represent one of the most
                    significant regulatory challenges facing space companies, particularly those
                    engaged in international business or employing non-U.S. persons. ITAR controls
                    the export of defense articles, defense services, and related technical data
                    listed on the United States Munitions List (USML), which includes a wide range
                    of spacecraft, launch vehicles, and related technologies.
                  </p>
                  <p>
                    For space companies, ITAR compliance is not optional. Violations carry severe
                    penalties -- including criminal fines of up to $1 million per violation,
                    imprisonment of up to 20 years, and debarment from future export activities.
                    Even inadvertent violations, such as sharing controlled technical data with a
                    foreign national at a conference or via an unsecured email, can trigger
                    enforcement actions.
                  </p>
                  <p>
                    This guide provides a comprehensive overview of the ITAR framework as it applies
                    to space companies: what is controlled, who must comply, how the licensing
                    process works, the distinction between ITAR and EAR (Export Administration
                    Regulations), common compliance pitfalls, and best practices for building a
                    robust internal compliance program. It is designed for compliance officers,
                    engineering managers, business development professionals, and executives at
                    space companies who need to understand the regulatory landscape.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 2. What Is ITAR?                     */}
              {/* ──────────────────────────────────── */}
              <section id="what-is-itar" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  What Is ITAR?
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The International Traffic in Arms Regulations (ITAR), codified at 22 CFR Parts
                    120-130, implement the Arms Export Control Act (AECA) of 1976. ITAR is
                    administered by the <strong className="text-white">Directorate of Defense Trade
                    Controls (DDTC)</strong> within the U.S. Department of State&apos;s Bureau of
                    Political-Military Affairs.
                  </p>
                  <p>
                    ITAR controls three categories of items and activities:
                  </p>

                  <div className="card p-6 my-8">
                    <div className="space-y-4 text-sm">
                      <div className="border-b border-cyan-400/10 pb-3">
                        <span className="text-cyan-400 font-semibold">Defense Articles</span>
                        <p className="text-star-300 mt-1">
                          Physical items listed on the USML, including spacecraft, launch vehicles,
                          satellites, and associated components, parts, and accessories.
                        </p>
                      </div>
                      <div className="border-b border-cyan-400/10 pb-3">
                        <span className="text-cyan-400 font-semibold">Defense Services</span>
                        <p className="text-star-300 mt-1">
                          The furnishing of assistance (including training) to foreign persons in the
                          design, development, engineering, manufacture, production, assembly, testing,
                          repair, maintenance, modification, or operation of defense articles.
                        </p>
                      </div>
                      <div>
                        <span className="text-cyan-400 font-semibold">Technical Data</span>
                        <p className="text-star-300 mt-1">
                          Information required for the design, development, production, manufacture,
                          assembly, operation, repair, testing, or modification of defense articles.
                          This includes blueprints, drawings, photographs, plans, instructions, and
                          documentation -- whether in physical or digital form.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p>
                    A critical concept in ITAR is the <strong className="text-white">&quot;deemed
                    export&quot;</strong> rule. Disclosing ITAR-controlled technical data to a foreign
                    national -- even if both parties are physically within the United States -- is
                    considered an &quot;export&quot; to that person&apos;s home country. This has
                    profound implications for hiring, conference participation, facility access, and
                    IT security at space companies. A foreign national engineer working at a U.S.
                    space company cannot access ITAR-controlled data without proper authorization,
                    regardless of their employment status, security clearance level, or physical
                    location.
                  </p>
                  <p>
                    The USML is organized into 21 categories. Space-related items appear primarily
                    in categories IV (Launch Vehicles, Guided Missiles, Ballistic Missiles, Rockets,
                    Torpedoes, Bombs, and Mines), XI (Military Electronics), and XV (Spacecraft and
                    Related Articles).
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 3. USML Categories for Space         */}
              {/* ──────────────────────────────────── */}
              <section id="usml-categories" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  USML Categories Relevant to Space
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <h3 className="text-xl font-semibold text-white mt-4 mb-3">
                    Category IV: Launch Vehicles &amp; Missiles
                  </h3>
                  <p>
                    Category IV covers launch vehicles, space launch vehicles (SLVs), and their
                    major components, including rocket engines, guidance systems, and re-entry
                    vehicles. Due to the inherent dual-use nature of launch vehicle technology (the
                    same technology that puts satellites in orbit can deliver warheads), this
                    category has historically been one of the most strictly controlled. Virtually
                    all launch vehicle technology remains on the USML.
                  </p>
                  <p>
                    Key controlled items include complete launch vehicles and SLVs, liquid and solid
                    rocket engines with certain performance thresholds, guidance and navigation
                    systems, thrust vector control systems, staging mechanisms, and associated
                    software and technical data.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Category XV: Spacecraft &amp; Related Articles
                  </h3>
                  <p>
                    Category XV was created as part of the 2014 export control reform process to
                    provide a more nuanced treatment of spacecraft. It distinguishes between items
                    that remain on the USML (due to military or intelligence applications) and those
                    that have been moved to the Commerce Control List (CCL) under EAR jurisdiction.
                  </p>
                  <p>
                    Items that remain on the USML under Category XV include:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Spacecraft specifically designed or modified for military or intelligence purposes</li>
                    <li>Remote sensing spacecraft with certain resolution or capability thresholds</li>
                    <li>Spacecraft with certain radiation-hardened components</li>
                    <li>Space-qualified components specifically designed for defense or intelligence spacecraft</li>
                    <li>Ground control systems specifically designed for USML spacecraft</li>
                  </ul>
                  <p className="mt-4">
                    Items moved to the CCL include many commercial communication satellites,
                    commercial remote sensing satellites (below certain resolution thresholds),
                    and commercial spacecraft components. This was a significant reform that
                    reduced the ITAR burden on much of the commercial satellite industry, though
                    companies must still carefully determine the jurisdiction and classification
                    of their specific items.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Category XI: Military Electronics
                  </h3>
                  <p>
                    Category XI controls certain electronic equipment and components with military
                    applications, including some space-qualified electronics, radiation-hardened
                    components, and certain types of sensors. Space companies should review this
                    category carefully, particularly those developing payloads, sensors, or
                    electronic subsystems.
                  </p>

                  <p className="mt-4">
                    <Link href="/compliance" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Track USML and regulatory changes on SpaceNexus Compliance Hub
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 4. Who Must Comply                   */}
              {/* ──────────────────────────────────── */}
              <section id="who-must-comply" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Who Must Comply with ITAR
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    ITAR compliance requirements extend broadly across the space industry supply
                    chain. The following types of entities are typically subject to ITAR:
                  </p>

                  <div className="card p-6 my-8 border-l-4 border-l-cyan-400">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                      Entities Subject to ITAR
                    </h3>
                    <div className="space-y-3 text-sm text-star-200">
                      <div className="border-b border-cyan-400/10 pb-2">
                        <strong className="text-white">Launch vehicle manufacturers</strong> -- Virtually all launch vehicle
                        technology remains USML-controlled.
                      </div>
                      <div className="border-b border-cyan-400/10 pb-2">
                        <strong className="text-white">Satellite manufacturers</strong> -- Military/intelligence spacecraft
                        on USML; commercial satellites may be CCL (EAR) or USML depending on capabilities.
                      </div>
                      <div className="border-b border-cyan-400/10 pb-2">
                        <strong className="text-white">Component suppliers</strong> -- Companies manufacturing space-qualified
                        components including propulsion, guidance, radiation-hardened electronics.
                      </div>
                      <div className="border-b border-cyan-400/10 pb-2">
                        <strong className="text-white">Ground systems providers</strong> -- Providers of ground control
                        systems for USML-listed spacecraft.
                      </div>
                      <div className="border-b border-cyan-400/10 pb-2">
                        <strong className="text-white">Engineering service providers</strong> -- Companies providing design,
                        testing, or integration services for USML articles.
                      </div>
                      <div>
                        <strong className="text-white">Research institutions</strong> -- Universities and research labs working on
                        USML-related technologies (note: the fundamental research exclusion may apply).
                      </div>
                    </div>
                  </div>

                  <p>
                    Importantly, ITAR obligations apply regardless of company size. A two-person
                    startup designing a novel propulsion system is subject to the same regulatory
                    framework as Lockheed Martin. Many space startups discover ITAR compliance
                    requirements for the first time when they attempt to hire foreign national
                    employees, attend international conferences, or engage with non-U.S. customers
                    or partners.
                  </p>
                  <p>
                    The <strong className="text-white">fundamental research exclusion</strong> (22
                    CFR 120.34) provides important relief for universities and research institutions.
                    Information arising from fundamental research -- defined as basic and applied
                    research in science and engineering where the resulting information is ordinarily
                    published and shared broadly within the research community -- is not subject to
                    ITAR controls. However, this exclusion has important limitations: it does not
                    apply if the research is subject to access or dissemination restrictions, or if
                    it is conducted under a contract or grant that restricts publication.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 5. DDTC Registration                 */}
              {/* ──────────────────────────────────── */}
              <section id="registration" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  DDTC Registration
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    Any U.S. person who engages in the business of manufacturing or exporting
                    defense articles, or furnishing defense services, must register with the DDTC
                    (22 CFR 122.1). Registration is a prerequisite for applying for export licenses
                    and is required even if a company does not intend to export -- the act of
                    manufacturing defense articles triggers the registration requirement.
                  </p>
                  <p>
                    The registration process involves submitting Form DS-2032 (Statement of
                    Registration) along with supporting documentation and a registration fee. As
                    of 2026, the annual registration fee is tiered based on the nature and volume
                    of activities, starting at $2,250 per year. Registration must be renewed
                    annually.
                  </p>
                  <p>
                    Registration does not, by itself, authorize any exports. It simply establishes
                    the registrant&apos;s relationship with the DDTC and enables the company to
                    submit license applications and agreement requests. Failure to register when
                    required is itself a violation of ITAR.
                  </p>
                  <p>
                    The registration process is now managed through the DDTC&apos;s DECCS (Defense
                    Export Control and Compliance System), an online portal that also handles license
                    applications, agreement submissions, and compliance reporting.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 6. Licensing & Agreements            */}
              {/* ──────────────────────────────────── */}
              <section id="licensing" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Licensing &amp; Agreements
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    ITAR provides several authorization mechanisms for the export of defense
                    articles, services, and technical data:
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Direct Commercial Sales (DCS) Licenses
                  </h3>
                  <p>
                    A DCS license authorizes the export of specific defense articles to a specific
                    end user for a defined purpose. License applications are submitted through
                    DECCS and are reviewed by the DDTC, typically with input from the Department of
                    Defense and other agencies. Processing times vary but typically range from 30 to
                    90 days for routine cases, though complex applications can take significantly
                    longer.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Technical Assistance Agreements (TAAs)
                  </h3>
                  <p>
                    A TAA authorizes the provision of defense services or the disclosure of technical
                    data to foreign persons. TAAs are commonly required for international
                    collaborations, joint ventures, and customer support activities. For example, a
                    U.S. satellite manufacturer providing technical support to a foreign satellite
                    operator would typically need a TAA. TAAs specify the scope of authorized
                    activities, the foreign parties involved, and any limitations or conditions.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Manufacturing License Agreements (MLAs)
                  </h3>
                  <p>
                    An MLA authorizes the manufacture of defense articles abroad. This is relevant
                    for space companies that establish international manufacturing facilities or
                    license their technology to foreign companies for production.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Exemptions
                  </h3>
                  <p>
                    ITAR provides certain exemptions from licensing requirements for specific
                    situations. Notable exemptions include those for transfers to U.S. government
                    end users (22 CFR 126.4), certain NATO and major non-NATO ally transfers, and
                    the Canadian exemption (22 CFR 126.5) which provides limited exemptions for
                    exports to Canada. However, exemptions have specific conditions and limitations,
                    and their improper use can result in violations. Companies should carefully
                    review exemption applicability with legal counsel before relying on them.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 7. Technical Data Controls           */}
              {/* ──────────────────────────────────── */}
              <section id="technical-data" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Technical Data Controls
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    Technical data controls are often the most challenging aspect of ITAR compliance
                    for space companies. ITAR-controlled technical data includes any information
                    required for the design, development, production, manufacture, assembly,
                    operation, repair, testing, maintenance, or modification of defense articles.
                    This encompasses engineering drawings, specifications, test reports, operational
                    manuals, process documentation, and software source code.
                  </p>

                  <div className="card p-6 my-8 border-l-4 border-l-yellow-500/50">
                    <h3 className="text-sm font-semibold text-yellow-400/80 uppercase tracking-wider mb-3">
                      Common Technical Data Compliance Pitfalls
                    </h3>
                    <ul className="space-y-2 text-sm text-star-200">
                      <li className="flex gap-2">
                        <span className="text-yellow-400/80 shrink-0">&bull;</span>
                        <span>Sharing technical presentations at international conferences without authorization</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-yellow-400/80 shrink-0">&bull;</span>
                        <span>Allowing foreign national employees to access controlled data without proper licenses</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-yellow-400/80 shrink-0">&bull;</span>
                        <span>Storing controlled data on unsecured cloud servers accessible from foreign locations</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-yellow-400/80 shrink-0">&bull;</span>
                        <span>Sending controlled documents via unencrypted email to foreign recipients</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-yellow-400/80 shrink-0">&bull;</span>
                        <span>Posting controlled technical information on public websites or forums</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-yellow-400/80 shrink-0">&bull;</span>
                        <span>Failing to control laptop contents when traveling internationally</span>
                      </li>
                    </ul>
                  </div>

                  <p>
                    The digital age has made technical data controls particularly complex. Cloud
                    computing, remote work, and global collaboration tools create numerous
                    opportunities for inadvertent exports. Companies must ensure that IT systems
                    are configured to prevent unauthorized access to controlled data, that cloud
                    storage complies with ITAR requirements (including restrictions on data
                    location and access controls), and that employees understand their obligations
                    regarding controlled information.
                  </p>
                  <p>
                    ITAR does provide certain exclusions from the definition of &quot;technical
                    data&quot; (22 CFR 120.34), including information in the public domain (such as
                    published papers and publicly available patent applications), general scientific,
                    mathematical, or engineering principles taught in schools and universities, and
                    basic marketing information on function or purpose.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 8. EAR vs. ITAR                      */}
              {/* ──────────────────────────────────── */}
              <section id="ear-vs-itar" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  EAR vs. ITAR: Understanding the Distinction
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    One of the most significant developments in space export control over the past
                    decade has been the migration of certain commercial space items from the USML
                    (ITAR jurisdiction) to the Commerce Control List (CCL, under EAR jurisdiction).
                    This was part of the broader Export Control Reform (ECR) initiative that began
                    in 2009.
                  </p>

                  <div className="card p-6 my-8 overflow-x-auto">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                      ITAR vs. EAR Comparison
                    </h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-cyan-400/20 text-left">
                          <th className="py-2 pr-4 text-star-300 font-medium">Aspect</th>
                          <th className="py-2 pr-4 text-star-300 font-medium">ITAR</th>
                          <th className="py-2 text-star-300 font-medium">EAR</th>
                        </tr>
                      </thead>
                      <tbody className="text-star-200">
                        <tr className="border-b border-cyan-400/10">
                          <td className="py-2 pr-4 text-white font-medium">Agency</td>
                          <td className="py-2 pr-4">State Department (DDTC)</td>
                          <td className="py-2">Commerce Department (BIS)</td>
                        </tr>
                        <tr className="border-b border-cyan-400/10">
                          <td className="py-2 pr-4 text-white font-medium">Control List</td>
                          <td className="py-2 pr-4">USML (21 categories)</td>
                          <td className="py-2">CCL (10 categories, ECCNs)</td>
                        </tr>
                        <tr className="border-b border-cyan-400/10">
                          <td className="py-2 pr-4 text-white font-medium">Scope</td>
                          <td className="py-2 pr-4">Defense articles &amp; services</td>
                          <td className="py-2">Dual-use &amp; commercial items</td>
                        </tr>
                        <tr className="border-b border-cyan-400/10">
                          <td className="py-2 pr-4 text-white font-medium">License Exceptions</td>
                          <td className="py-2 pr-4">Limited exemptions</td>
                          <td className="py-2">More license exceptions available</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 text-white font-medium">Penalties</td>
                          <td className="py-2 pr-4">Up to $1M criminal / $1.2M civil per violation</td>
                          <td className="py-2">Up to $1M criminal / $364K civil per violation</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p>
                    The first step in any export control analysis is <strong className="text-white">
                    commodity jurisdiction determination</strong> -- determining whether an item is
                    controlled under ITAR (USML) or EAR (CCL). Companies can submit a formal
                    Commodity Jurisdiction (CJ) request to the DDTC (27 CFR 120.4) if the
                    classification is unclear. In practice, many space companies maintain internal
                    classification processes, often with the support of specialized export control
                    counsel.
                  </p>
                  <p>
                    The migration of commercial satellites and components to EAR has been broadly
                    positive for the commercial space industry, as EAR generally provides more
                    flexible licensing mechanisms, more available license exceptions, and somewhat
                    lower penalties. However, items on the CCL are still export-controlled and
                    require careful compliance attention.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 9. Penalties & Enforcement           */}
              {/* ──────────────────────────────────── */}
              <section id="penalties" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Penalties &amp; Enforcement
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <div className="card p-6 my-8 border-l-4 border-l-rocket-500">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                      <div>
                        <div className="text-3xl font-display font-bold text-rocket-400">$1M</div>
                        <div className="text-star-300 text-sm mt-1">Max Criminal Fine per Violation</div>
                      </div>
                      <div>
                        <div className="text-3xl font-display font-bold text-rocket-400">20 yrs</div>
                        <div className="text-star-300 text-sm mt-1">Max Criminal Imprisonment</div>
                      </div>
                      <div>
                        <div className="text-3xl font-display font-bold text-rocket-400">$1.2M</div>
                        <div className="text-star-300 text-sm mt-1">Max Civil Penalty per Violation</div>
                      </div>
                    </div>
                  </div>

                  <p>
                    ITAR enforcement is taken seriously by the U.S. government. Criminal
                    prosecutions are handled by the Department of Justice, while civil enforcement
                    actions are brought by the DDTC. Notable enforcement actions in the space
                    industry include:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>
                      <strong className="text-white">Boeing (2006):</strong> $75 million settlement for
                      47 charges related to unauthorized exports of commercial satellite and launch
                      vehicle data to China, Russia, and other countries.
                    </li>
                    <li>
                      <strong className="text-white">Hughes Electronics / Boeing Satellite (2003):</strong>{' '}
                      $32 million settlement related to unauthorized technical assistance to China
                      during Long March launch failure investigations.
                    </li>
                    <li>
                      <strong className="text-white">L3 Technologies (2016):</strong> $13 million consent
                      agreement for unauthorized exports of controlled night vision and thermal imaging
                      technology.
                    </li>
                    <li>
                      <strong className="text-white">Honeywell (2022):</strong> $13 million penalty for
                      unauthorized exports of engineering drawings related to defense articles,
                      including aerospace components.
                    </li>
                  </ul>
                  <p>
                    In addition to financial penalties, violators may face debarment -- the loss of
                    the ability to participate in U.S. defense trade. For a space company dependent
                    on government contracts or international sales, debarment can be an existential
                    threat.
                  </p>
                  <p>
                    The DDTC encourages voluntary self-disclosure of violations. Companies that
                    discover and promptly report violations, implement corrective actions, and
                    cooperate with the government typically receive more favorable treatment than
                    those where violations are discovered through investigation.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 10. Building a Compliance Program    */}
              {/* ──────────────────────────────────── */}
              <section id="compliance-program" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Building an ITAR Compliance Program
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    An effective ITAR compliance program should include the following elements:
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    1. Senior Management Commitment
                  </h3>
                  <p>
                    Compliance must be supported from the top. The CEO and board should understand
                    ITAR obligations, allocate adequate resources, and establish a culture where
                    compliance is prioritized alongside business objectives. A designated Empowered
                    Official (EO) -- a U.S. person with authority to sign export license applications
                    and verify compliance -- must be appointed.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    2. Written Policies and Procedures
                  </h3>
                  <p>
                    Document all compliance policies, including procedures for commodity
                    classification, license application, record keeping, technology control plans,
                    visitor screening, employee screening, and voluntary self-disclosure. These
                    documents should be reviewed and updated annually.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    3. Training
                  </h3>
                  <p>
                    All employees who may encounter controlled articles, data, or services should
                    receive initial and periodic ITAR training. Training should cover the basics of
                    export controls, company-specific policies, how to identify potentially
                    controlled items, and how to escalate compliance questions. Engineering,
                    business development, HR, IT, and operations staff all need appropriate training.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    4. Technology Control Plan (TCP)
                  </h3>
                  <p>
                    A TCP defines how controlled technical data is identified, marked, stored,
                    transmitted, and accessed within the organization. It should address physical
                    security (locked areas, visitor controls), IT security (access controls,
                    encryption, cloud storage policies), and personnel controls (screening,
                    need-to-know restrictions). The TCP is particularly important for companies
                    employing foreign nationals.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    5. Screening and Due Diligence
                  </h3>
                  <p>
                    Screen all parties involved in transactions against the Consolidated Screening
                    List maintained by the U.S. government, which includes denied parties,
                    sanctioned entities, and other restricted persons. Screen employees, customers,
                    suppliers, partners, and conference attendees as appropriate.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    6. Record Keeping
                  </h3>
                  <p>
                    ITAR requires retention of all records relating to defense trade activities for
                    a minimum of five years. This includes license applications, agreements,
                    shipping records, classification determinations, and training records. Good
                    record keeping is essential for demonstrating compliance and supporting any
                    future audits or investigations.
                  </p>

                  <p className="mt-4">
                    <Link href="/compliance" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Manage regulatory compliance on SpaceNexus
                    </Link>
                    {' '}&middot;{' '}
                    <Link href="/business-opportunities" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Track government contracts and procurement
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 11. Recent Developments              */}
              {/* ──────────────────────────────────── */}
              <section id="recent-developments" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Recent Developments &amp; Trends
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The export control landscape for space companies continues to evolve in response
                    to industry changes and geopolitical dynamics. Several developments are worth
                    tracking:
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Commercial Space Decontrol Efforts
                  </h3>
                  <p>
                    Industry groups including the Satellite Industry Association (SIA) and the
                    Aerospace Industries Association (AIA) continue to advocate for further
                    migration of commercial space items from the USML to the CCL. The argument is
                    that overly broad ITAR controls on commercially available technology harm U.S.
                    competitiveness without meaningfully improving national security. Progress has
                    been incremental, with periodic adjustments to USML categories and CCL
                    classifications.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Emerging Technology Controls
                  </h3>
                  <p>
                    Conversely, new controls are being developed for emerging technologies with
                    national security implications, including certain AI/ML applications, advanced
                    semiconductor manufacturing technology, and quantum computing and sensing.
                    Space companies developing or integrating these technologies should monitor
                    regulatory developments closely.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Allied Country Collaboration
                  </h3>
                  <p>
                    The U.S. government has been working to streamline export processes with close
                    allies, particularly the Five Eyes nations (UK, Canada, Australia, New Zealand)
                    and other NATO partners. The AUKUS agreement between Australia, the UK, and the
                    U.S. includes provisions for enhanced defense trade cooperation, which may
                    benefit space companies engaged in collaborative programs with these nations.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Cloud Computing and Data Localization
                  </h3>
                  <p>
                    The DDTC has issued guidance clarifying that ITAR-controlled technical data may
                    be stored on certified cloud platforms that meet specific security requirements,
                    provided access is appropriately controlled. AWS GovCloud, Microsoft Azure
                    Government, and other FedRAMP-authorized environments can be used for
                    ITAR-controlled data. However, the specific requirements and configurations
                    needed are complex and should be reviewed with counsel.
                  </p>

                  <p className="mt-4">
                    <Link href="/space-defense" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Monitor defense and security space developments on SpaceNexus
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 12. SpaceNexus CTA                   */}
              {/* ──────────────────────────────────── */}
              <section id="spacenexus" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Track Compliance on SpaceNexus
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    SpaceNexus provides regulatory and compliance tracking tools designed for space
                    industry professionals. Our{' '}
                    <Link href="/compliance" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Regulatory &amp; Compliance Hub
                    </Link>{' '}
                    tracks space law developments, regulatory filings, and licensing updates across
                    major jurisdictions, helping you stay informed about the evolving compliance
                    landscape.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  {[
                    { name: 'Regulatory & Compliance', href: '/compliance', desc: 'Space law, licensing, and regulatory tracking' },
                    { name: 'Spectrum Management', href: '/spectrum', desc: 'Frequency coordination and ITU filings' },
                    { name: 'Business Opportunities', href: '/business-opportunities', desc: 'Government contracts and procurement' },
                    { name: 'Space Defense', href: '/space-defense', desc: 'Defense and national security space tracking' },
                  ].map((mod) => (
                    <Link
                      key={mod.href}
                      href={mod.href}
                      className="card-interactive p-4 block"
                    >
                      <div className="font-semibold text-white text-sm">{mod.name}</div>
                      <div className="text-star-300 text-xs mt-1">{mod.desc}</div>
                    </Link>
                  ))}
                </div>

                <div className="mt-8 text-center">
                  <Link href="/register" className="btn-primary">
                    Get Started Free
                  </Link>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* FAQ                                  */}
              {/* ──────────────────────────────────── */}
              <section className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-3">
                  {FAQ_ITEMS.map((item, i) => (
                    <details key={i} className="card group">
                      <summary className="cursor-pointer p-5 flex items-center justify-between text-white font-medium select-none list-none [&::-webkit-details-marker]:hidden">
                        <span>{item.q}</span>
                        <span
                          aria-hidden="true"
                          className="ml-4 shrink-0 text-cyan-400 transition-transform group-open:rotate-45 text-xl leading-none"
                        >
                          +
                        </span>
                      </summary>
                      <div className="px-5 pb-5 text-star-200 leading-relaxed">
                        {item.a}
                      </div>
                    </details>
                  ))}
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* Newsletter CTA                       */}
              {/* ──────────────────────────────────── */}
              <section className="card p-8 md:p-12 text-center glow-border">
                <h2 className="text-display-sm font-display font-bold text-white mb-4">
                  Stay Compliant in the Space Industry
                </h2>
                <p className="text-star-200 text-lg mb-8 max-w-2xl mx-auto">
                  Track regulatory changes, export control updates, and compliance developments
                  that affect your space business. SpaceNexus keeps you informed.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/register" className="btn-primary">
                    Create Free Account
                  </Link>
                  <Link href="/compliance" className="btn-secondary">
                    Explore Compliance Hub
                  </Link>
                </div>
              </section>
            </article>
          </div>
        </div>
      </div>
    </>
  );
}
