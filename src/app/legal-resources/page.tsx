'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import SocialShare from '@/components/ui/SocialShare';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import SubscribeCTA from '@/components/marketing/SubscribeCTA';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ResourceCategory =
  | 'Law Firms'
  | 'Regulations & Statutes'
  | 'Government Resources'
  | 'Industry Organizations'
  | 'Academic Resources'
  | 'International Treaties';

interface LegalResource {
  name: string;
  type: string;
  url: string;
  description: string;
  category: ResourceCategory;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const LEGAL_RESOURCES: LegalResource[] = [
  // ── Law Firms ──
  {
    name: 'Hogan Lovells',
    type: 'Global Law Firm',
    url: 'https://www.hoganlovells.com/en/industry/aerospace-defense-and-government-services',
    description: 'Leading global firm with a dedicated aerospace, defense, and government services practice. Advises on satellite licensing, spectrum, export controls, and government contracts.',
    category: 'Law Firms',
  },
  {
    name: 'DLA Piper',
    type: 'Global Law Firm',
    url: 'https://www.dlapiper.com/en-us/services/aerospace-and-defense',
    description: 'Global firm with aerospace and defense practice covering space transactions, regulatory compliance, ITAR/EAR, and international trade. Active in space venture capital transactions.',
    category: 'Law Firms',
  },
  {
    name: 'Milbank LLP',
    type: 'Global Law Firm',
    url: 'https://www.milbank.com/en/practices/industries/space-business.html',
    description: 'Pioneers in space finance and satellite industry transactions. Advised on many of the largest satellite financing deals, including Intelsat, SES, and Telesat.',
    category: 'Law Firms',
  },
  {
    name: 'Sheppard Mullin',
    type: 'National Law Firm',
    url: 'https://www.sheppardmullin.com/aerospace',
    description: 'Active in commercial space, with expertise in launch licensing, FCC satellite licensing, spectrum rights, and space startup formation. Strong presence in Los Angeles aerospace hub.',
    category: 'Law Firms',
  },
  {
    name: 'Akin Gump Strauss Hauer & Feld',
    type: 'Global Law Firm',
    url: 'https://www.akingump.com/en/industries/aerospace-defense-and-government-contracts',
    description: 'Strong aerospace, defense, and government contracts practice. Advises on space policy, lobbying, and regulatory advocacy. Active in space SPAC and M&A transactions.',
    category: 'Law Firms',
  },
  {
    name: 'Wilson Sonsini Goodrich & Rosati',
    type: 'Technology Law Firm',
    url: 'https://www.wsgr.com/',
    description: 'Leading technology firm that has expanded into space tech, representing numerous space startups in venture financing, IP, and regulatory matters.',
    category: 'Law Firms',
  },
  {
    name: 'Cooley LLP',
    type: 'Technology Law Firm',
    url: 'https://www.cooley.com/services/practice/space',
    description: 'Represents space startups and growth-stage companies in venture capital, M&A, and regulatory matters. Active in the NewSpace ecosystem.',
    category: 'Law Firms',
  },
  {
    name: 'Thompson Hine',
    type: 'National Law Firm',
    url: 'https://www.thompsonhine.com/capabilities/aerospace-and-defense',
    description: 'Aerospace and defense practice with experience in government contracts, ITAR compliance, and space-related procurement. Known for small business government contracting support.',
    category: 'Law Firms',
  },
  {
    name: 'Jenner & Block',
    type: 'National Law Firm',
    url: 'https://www.jenner.com/en/practices/government-contracts-and-false-claims-act',
    description: 'Government contracts and regulatory practice with space industry clients. Expertise in bid protests, compliance, and False Claims Act defense.',
    category: 'Law Firms',
  },

  // ── Regulations & Statutes ──
  {
    name: 'Commercial Space Launch Act (51 U.S.C. Ch. 509)',
    type: 'Federal Statute',
    url: 'https://uscode.house.gov/view.xhtml?path=/prelim@title51/subtitle5/chapter509&edition=prelim',
    description: 'The primary U.S. statute governing commercial space launch and reentry licensing. Establishes FAA authority over launch vehicles, launch sites, and reentry vehicles.',
    category: 'Regulations & Statutes',
  },
  {
    name: 'International Traffic in Arms Regulations (ITAR)',
    type: 'Federal Regulation (22 CFR 120-130)',
    url: 'https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M',
    description: 'State Department regulations controlling the export of defense articles and services, including many satellite and space vehicle components on the U.S. Munitions List (USML).',
    category: 'Regulations & Statutes',
  },
  {
    name: 'Export Administration Regulations (EAR)',
    type: 'Federal Regulation (15 CFR 730-774)',
    url: 'https://www.ecfr.gov/current/title-15/subtitle-B/chapter-VII/subchapter-C',
    description: 'Commerce Department regulations governing the export of commercial and dual-use items, including satellite components and space technologies on the Commerce Control List.',
    category: 'Regulations & Statutes',
  },
  {
    name: 'FCC Satellite Licensing Rules (47 CFR Part 25)',
    type: 'Federal Regulation',
    url: 'https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-25',
    description: 'FCC regulations governing satellite licensing, including orbital debris mitigation requirements, the 5-year deorbit rule, spectrum coordination, and market access for non-U.S. systems.',
    category: 'Regulations & Statutes',
  },
  {
    name: 'FAA Commercial Space Transportation Regulations (14 CFR Parts 401-460)',
    type: 'Federal Regulation',
    url: 'https://www.ecfr.gov/current/title-14/chapter-III',
    description: 'FAA regulations for launch and reentry licensing, launch site licensing, financial responsibility requirements, and safety approvals for commercial space transportation.',
    category: 'Regulations & Statutes',
  },
  {
    name: 'NOAA Commercial Remote Sensing Regulations (15 CFR Part 960)',
    type: 'Federal Regulation',
    url: 'https://www.ecfr.gov/current/title-15/subtitle-B/chapter-IX/subchapter-C/part-960',
    description: 'NOAA regulations governing the licensing of private remote sensing satellite systems. Updated in 2020 to streamline licensing and create a tiered regulatory framework.',
    category: 'Regulations & Statutes',
  },
  {
    name: 'U.S. Space Policy Directives (SPD 1-7)',
    type: 'Executive Policy',
    url: 'https://www.federalregister.gov/presidential-documents/space-policy-directives',
    description: 'Presidential directives establishing U.S. space policy, including SPD-2 (regulatory reform), SPD-3 (space traffic management), and SPD-5 (cybersecurity).',
    category: 'Regulations & Statutes',
  },
  {
    name: 'U.S. Commercial Space Launch Competitiveness Act (2015)',
    type: 'Federal Statute',
    url: 'https://www.congress.gov/bill/114th-congress/house-bill/2262',
    description: 'Landmark legislation that extended learning period liability protections, authorized commercial space resource utilization (asteroid mining), and extended ISS operations.',
    category: 'Regulations & Statutes',
  },

  // ── Government Resources ──
  {
    name: 'FAA Office of Commercial Space Transportation (AST)',
    type: 'Federal Agency',
    url: 'https://www.faa.gov/space',
    description: 'The primary U.S. regulator for commercial launch and reentry. Issues launch licenses, reentry licenses, and launch site operator licenses. Publishes annual Commercial Space Transportation forecasts.',
    category: 'Government Resources',
  },
  {
    name: 'FCC Space Bureau',
    type: 'Federal Agency',
    url: 'https://www.fcc.gov/space',
    description: 'Established in 2023, the FCC Space Bureau licenses satellite systems, manages spectrum allocation for space services, and enforces orbital debris mitigation rules including the 5-year deorbit requirement.',
    category: 'Government Resources',
  },
  {
    name: 'NOAA Commercial Remote Sensing Regulatory Affairs',
    type: 'Federal Agency',
    url: 'https://www.nesdis.noaa.gov/about/our-offices/office-of-commercial-remote-sensing-regulatory-affairs',
    description: 'Licenses private remote sensing satellite systems under the Land Remote Sensing Policy Act. Issues, modifies, and monitors compliance of commercial Earth observation licenses.',
    category: 'Government Resources',
  },
  {
    name: 'Office of Space Commerce',
    type: 'Federal Agency',
    url: 'https://www.space.commerce.gov/',
    description: 'Department of Commerce office responsible for fostering commercial space activities and developing the Traffic Coordination System for Space (TraCSS) for civil space situational awareness.',
    category: 'Government Resources',
  },
  {
    name: 'NASA Office of the General Counsel',
    type: 'Federal Agency',
    url: 'https://www.nasa.gov/office/ogc',
    description: 'Handles NASA legal matters including Space Act Agreements, intellectual property, procurement, environmental compliance, and international agreements for space cooperation.',
    category: 'Government Resources',
  },
  {
    name: 'Bureau of Industry and Security (BIS)',
    type: 'Federal Agency',
    url: 'https://www.bis.doc.gov/',
    description: 'Administers the Export Administration Regulations (EAR) governing export of dual-use space technologies. Issues export licenses and enforces compliance for commercial space items.',
    category: 'Government Resources',
  },
  {
    name: 'Directorate of Defense Trade Controls (DDTC)',
    type: 'Federal Agency',
    url: 'https://www.pmddtc.state.gov/',
    description: 'State Department office administering ITAR. Registers defense manufacturers/exporters, issues export licenses for USML items, and enforces compliance for space defense articles.',
    category: 'Government Resources',
  },
  {
    name: 'SAM.gov',
    type: 'Government Portal',
    url: 'https://sam.gov/',
    description: 'System for Award Management, the official U.S. government portal for entity registration and contract opportunity search. Required registration for all government contractors.',
    category: 'Government Resources',
  },

  // ── Industry Organizations ──
  {
    name: 'Satellite Industry Association (SIA)',
    type: 'Trade Association',
    url: 'https://sia.org/',
    description: 'The primary trade association for the satellite industry, representing satellite operators, manufacturers, launch providers, and ground equipment companies. Publishes the annual State of the Satellite Industry Report.',
    category: 'Industry Organizations',
  },
  {
    name: 'Space Foundation',
    type: 'Nonprofit Organization',
    url: 'https://www.spacefoundation.org/',
    description: 'Leading space advocacy organization. Hosts the annual Space Symposium in Colorado Springs, publishes The Space Report, and runs space education and workforce development programs.',
    category: 'Industry Organizations',
  },
  {
    name: 'SSPI (Society of Satellite Professionals International)',
    type: 'Professional Association',
    url: 'https://www.sspi.org/',
    description: 'Professional development organization for the satellite industry. Offers networking, mentoring, and educational programs. Hosts the Future Leaders and Hall of Fame programs.',
    category: 'Industry Organizations',
  },
  {
    name: 'Commercial Spaceflight Federation (CSF)',
    type: 'Trade Association',
    url: 'https://www.commercialspaceflight.org/',
    description: 'Industry association representing commercial spaceflight companies, including launch providers, space stations, and human spaceflight operators. Advocates for regulatory modernization.',
    category: 'Industry Organizations',
  },
  {
    name: 'Aerospace Industries Association (AIA)',
    type: 'Trade Association',
    url: 'https://www.aia-aerospace.org/',
    description: 'Trade association representing major aerospace and defense manufacturers and suppliers. Publishes industry data, advocates for policy, and hosts conferences.',
    category: 'Industry Organizations',
  },
  {
    name: 'International Institute of Space Law (IISL)',
    type: 'Professional Association',
    url: 'https://iislweb.space/',
    description: 'Premier international organization devoted to the development of space law. Holds annual colloquia, publishes proceedings, and advises COPUOS on legal matters.',
    category: 'Industry Organizations',
  },
  {
    name: 'Space Safety Coalition',
    type: 'Industry Coalition',
    url: 'https://spacesafety.org/',
    description: 'Coalition of satellite operators and industry organizations that developed best practices for space safety, including conjunction assessment, collision avoidance, and data sharing.',
    category: 'Industry Organizations',
  },

  // ── Academic Resources ──
  {
    name: 'University of Nebraska - Lincoln Space Law Program',
    type: 'LL.M. Program',
    url: 'https://law.unl.edu/space-cyber-and-telecommunications-law/',
    description: 'The leading U.S. academic program in space law, offering an LL.M. in Space, Cyber, and Telecommunications Law. Publishes the Journal of Space Law (now at Nebraska).',
    category: 'Academic Resources',
  },
  {
    name: 'McGill University - Institute of Air and Space Law',
    type: 'LL.M. Program',
    url: 'https://www.mcgill.ca/iasl/',
    description: 'One of the oldest and most prestigious air and space law programs globally. Offers LL.M. and DCL degrees, publishes the Annals of Air and Space Law.',
    category: 'Academic Resources',
  },
  {
    name: 'Leiden University - International Institute of Air and Space Law',
    type: 'LL.M. Program',
    url: 'https://www.universiteitleiden.nl/en/law/institute-of-public-law/institute-of-air-space-law',
    description: 'Leading European space law program. Offers advanced LL.M. in Air and Space Law. Strong connections to ESA and international space law organizations.',
    category: 'Academic Resources',
  },
  {
    name: 'University of Luxembourg - Space Law Program',
    type: 'LL.M. Program',
    url: 'https://www.uni.lu/',
    description: 'Emerging center for space law and space resources law, driven by Luxembourg\'s national space resource utilization law (2017). Hosts the Space Resources Governance conference.',
    category: 'Academic Resources',
  },
  {
    name: 'Journal of Space Law',
    type: 'Academic Journal',
    url: 'https://law.unl.edu/space-cyber-and-telecommunications-law/journal-space-law/',
    description: 'The leading English-language academic journal devoted to space law. Published since 1973, now hosted at the University of Nebraska College of Law.',
    category: 'Academic Resources',
  },
  {
    name: 'The Aerospace Corporation - Center for Space Policy and Strategy',
    type: 'Research Center',
    url: 'https://aerospace.org/policy',
    description: 'Publishes policy papers and analysis on space governance, debris mitigation, space traffic management, and regulatory reform. Widely cited by policymakers.',
    category: 'Academic Resources',
  },
  {
    name: 'Secure World Foundation',
    type: 'Research Organization',
    url: 'https://swfound.org/',
    description: 'Think tank focused on space sustainability and governance. Publishes research on space debris, space security, and space governance. Hosts the annual Summit for Space Sustainability.',
    category: 'Academic Resources',
  },
  {
    name: 'George Washington University - Space Policy Institute',
    type: 'Research Institute',
    url: 'https://spacepolicy.elliott.gwu.edu/',
    description: 'Leading U.S. policy research center focused on space policy, commercial space regulation, and space governance. Located in Washington, D.C. near key government agencies.',
    category: 'Academic Resources',
  },

  // ── International Treaties ──
  {
    name: 'Outer Space Treaty (1967)',
    type: 'International Treaty',
    url: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html',
    description: 'The foundation of international space law. Establishes principles of free exploration, non-appropriation of outer space, state responsibility, and peaceful use. Ratified by 114 states.',
    category: 'International Treaties',
  },
  {
    name: 'Rescue Agreement (1968)',
    type: 'International Treaty',
    url: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introrescueagreement.html',
    description: 'Agreement on the Rescue of Astronauts, the Return of Astronauts, and the Return of Objects Launched into Outer Space. Obligates states to rescue astronauts in distress and return space objects.',
    category: 'International Treaties',
  },
  {
    name: 'Liability Convention (1972)',
    type: 'International Treaty',
    url: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html',
    description: 'Convention on International Liability for Damage Caused by Space Objects. Establishes absolute liability for surface damage and fault-based liability for damage in orbit. Only invoked once (Cosmos 954).',
    category: 'International Treaties',
  },
  {
    name: 'Registration Convention (1976)',
    type: 'International Treaty',
    url: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introregistration-convention.html',
    description: 'Convention on Registration of Objects Launched into Outer Space. Requires launching states to register space objects with the UN and maintain national registries.',
    category: 'International Treaties',
  },
  {
    name: 'Moon Agreement (1979)',
    type: 'International Treaty',
    url: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/intromoon-agreement.html',
    description: 'Agreement Governing the Activities of States on the Moon and Other Celestial Bodies. Declares lunar resources "common heritage of mankind." Not ratified by any major space-faring nation.',
    category: 'International Treaties',
  },
  {
    name: 'Artemis Accords (2020)',
    type: 'International Agreement',
    url: 'https://www.nasa.gov/artemis-accords/',
    description: 'Bilateral agreements establishing principles for civil exploration and use of the Moon, Mars, and other celestial bodies. Signed by 40+ nations. Supports resource utilization rights.',
    category: 'International Treaties',
  },
  {
    name: 'ITU Radio Regulations',
    type: 'International Framework',
    url: 'https://www.itu.int/pub/R-REG-RR',
    description: 'International Telecommunication Union regulations governing radio frequency allocation and satellite orbital filing procedures. Updated at World Radiocommunication Conferences (WRC).',
    category: 'International Treaties',
  },
  {
    name: 'UN COPUOS Space Debris Mitigation Guidelines',
    type: 'International Guidelines',
    url: 'https://www.unoosa.org/oosa/en/ourwork/topics/space-debris/index.html',
    description: 'Non-binding guidelines adopted by the UN General Assembly in 2007. Establish baseline principles for orbital debris mitigation referenced by national regulations worldwide.',
    category: 'International Treaties',
  },
];

const CATEGORIES: ResourceCategory[] = [
  'Law Firms',
  'Regulations & Statutes',
  'Government Resources',
  'Industry Organizations',
  'Academic Resources',
  'International Treaties',
];

const CATEGORY_ICONS: Record<ResourceCategory, string> = {
  'Law Firms': 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
  'Regulations & Statutes': 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  'Government Resources': 'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0v-3m0 3h3.75m-3.75 0v3',
  'Industry Organizations': 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z',
  'Academic Resources': 'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5',
  'International Treaties': 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418',
};

const CATEGORY_COLORS: Record<ResourceCategory, string> = {
  'Law Firms': 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  'Regulations & Statutes': 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
  'Government Resources': 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
  'Industry Organizations': 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  'Academic Resources': 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
  'International Treaties': 'from-rose-500/20 to-rose-600/10 border-rose-500/30',
};

const CATEGORY_ICON_COLORS: Record<ResourceCategory, string> = {
  'Law Firms': 'text-blue-400',
  'Regulations & Statutes': 'text-amber-400',
  'Government Resources': 'text-emerald-400',
  'Industry Organizations': 'text-purple-400',
  'Academic Resources': 'text-cyan-400',
  'International Treaties': 'text-rose-400',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LegalResourcesPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ResourceCategory | 'All'>('All');

  const filtered = useMemo(() => {
    let results = LEGAL_RESOURCES;

    if (activeCategory !== 'All') {
      results = results.filter((r) => r.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
      );
    }

    return results;
  }, [search, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: LEGAL_RESOURCES.length };
    for (const cat of CATEGORIES) {
      counts[cat] = LEGAL_RESOURCES.filter((r) => r.category === cat).length;
    }
    return counts;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0a0a] to-black">
      {/* Header */}
      <AnimatedPageHeader
        title="Space Industry Legal Resources"
        subtitle="Curated directory of law firms, regulations, government agencies, industry organizations, academic programs, and international treaties for space industry professionals."
        breadcrumb="Legal Intelligence"
      />

      <div className="container mx-auto px-4 pb-20 -mt-6">
        {/* Stats bar */}
        <ScrollReveal>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? 'All' : cat)}
                className={`p-3 rounded-xl border text-center transition-all duration-200 ${
                  activeCategory === cat
                    ? `bg-gradient-to-b ${CATEGORY_COLORS[cat]} border-opacity-100`
                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
                }`}
              >
                <p className="text-lg font-bold text-white">{categoryCounts[cat]}</p>
                <p className="text-xs text-slate-400 leading-tight">{cat}</p>
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Search */}
        <ScrollReveal>
          <div className="mb-8">
            <div className="relative max-w-2xl mx-auto">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search legal resources, law firms, treaties..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {search && (
              <p className="text-center text-sm text-slate-500 mt-2">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
              </p>
            )}
          </div>
        </ScrollReveal>

        {/* Category filter pills */}
        <ScrollReveal>
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            <button
              onClick={() => setActiveCategory('All')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeCategory === 'All'
                  ? 'bg-white text-slate-900'
                  : 'bg-white/[0.06] text-slate-400 hover:bg-white/[0.1] hover:text-white'
              }`}
            >
              All ({categoryCounts.All})
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? 'All' : cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-white text-slate-900'
                    : 'bg-white/[0.06] text-slate-400 hover:bg-white/[0.1] hover:text-white'
                }`}
              >
                {cat} ({categoryCounts[cat]})
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Resources by category */}
        {activeCategory === 'All' ? (
          // Show all categories with section headers
          CATEGORIES.map((cat) => {
            const catResources = filtered.filter((r) => r.category === cat);
            if (catResources.length === 0) return null;
            return (
              <ScrollReveal key={cat}>
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-b ${CATEGORY_COLORS[cat]} border flex items-center justify-center`}>
                      <svg className={`w-5 h-5 ${CATEGORY_ICON_COLORS[cat]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={CATEGORY_ICONS[cat]} />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white">{cat}</h2>
                    <span className="text-sm text-slate-500">({catResources.length})</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {catResources.map((resource) => (
                      <ResourceCard key={resource.name} resource={resource} />
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            );
          })
        ) : (
          // Show filtered results without section headers
          <ScrollReveal>
            <div className="grid md:grid-cols-2 gap-4">
              {filtered.map((resource) => (
                <ResourceCard key={resource.name} resource={resource} />
              ))}
            </div>
          </ScrollReveal>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="text-slate-400 text-lg">No resources found</p>
            <p className="text-slate-500 text-sm mt-1">Try adjusting your search or filter criteria</p>
          </div>
        )}

        {/* CTA Section */}
        <ScrollReveal>
          <div className="mt-16 p-8 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.02] border border-white/[0.06] text-center">
            <h2 className="text-2xl font-bold text-white mb-3">
              Navigate Space Industry Compliance
            </h2>
            <p className="text-slate-400 mb-6 max-w-2xl mx-auto">
              SpaceNexus tracks regulatory changes, compliance deadlines, licensing requirements, and policy developments across all space regulatory agencies.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/compliance"
                className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-lg transition-colors"
              >
                Compliance Hub
              </Link>
              <Link
                href="/regulatory-agencies"
                className="px-6 py-3 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg transition-colors"
              >
                Regulatory Agencies
              </Link>
              <Link
                href="/space-law"
                className="px-6 py-3 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg transition-colors"
              >
                Space Law
              </Link>
            </div>
          </div>
        </ScrollReveal>

        {/* Share */}
        <div className="mt-10 flex justify-center">
          <SocialShare title="Space Industry Legal Resources" url="https://spacenexus.us/legal-resources" />
        </div>

        <SubscribeCTA />

        {/* Related Modules */}
        {PAGE_RELATIONS['legal-resources'] && (
          <div className="mt-12">
            <RelatedModules modules={PAGE_RELATIONS['legal-resources']} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ResourceCard component
// ---------------------------------------------------------------------------

function ResourceCard({ resource }: { resource: LegalResource }) {
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white group-hover:text-blue-300 transition-colors leading-tight">
            {resource.name}
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-1">{resource.type}</p>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">{resource.description}</p>
        </div>
        <svg
          className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors shrink-0 mt-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      </div>
    </a>
  );
}
