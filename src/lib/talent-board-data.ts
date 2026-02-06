import { SpaceTalent, TalentExpertiseArea, TalentAvailability } from '@/types';

// Seed data for Space Talent Board - 18 industry experts
export const SPACE_TALENT_SEED: Omit<SpaceTalent, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Lawyers (Space Law, Export Controls, Regulatory) - 6 experts
  {
    slug: 'sarah-chen-space-law',
    name: 'Dr. Sarah Chen',
    title: 'Partner, Space Law Practice',
    organization: 'Hogan Lovells',
    expertise: ['space_law', 'regulatory'],
    bio: 'Leading space law attorney with 15+ years advising satellite operators, launch providers, and space agencies on licensing, liability, and international space treaties. Former FAA/AST counsel.',
    contactEmail: 'sarah.chen@example.com',
    linkedIn: 'https://linkedin.com/in/sarahchenspacelaw',
    consultingRate: 750,
    availability: 'limited',
    featured: true,
  },
  {
    slug: 'michael-torres-itar',
    name: 'Michael Torres',
    title: 'Export Controls Director',
    organization: 'Aerospace Defense Partners',
    expertise: ['export_controls', 'regulatory'],
    bio: 'ITAR and EAR compliance expert specializing in space technologies. Former BIS official with deep expertise in commodity jurisdiction, TAAs, and voluntary disclosures.',
    contactEmail: 'michael.torres@example.com',
    linkedIn: 'https://linkedin.com/in/mtorresitar',
    consultingRate: 650,
    availability: 'available',
    featured: true,
  },
  {
    slug: 'jennifer-pak-fcc',
    name: 'Jennifer Pak',
    title: 'Regulatory Affairs Counsel',
    organization: 'Wiley Rein LLP',
    expertise: ['regulatory', 'space_law'],
    bio: 'Spectrum licensing and FCC regulatory expert for satellite communications. Represents major constellation operators and handles complex ITU coordination matters.',
    contactEmail: 'jennifer.pak@example.com',
    linkedIn: 'https://linkedin.com/in/jenniferpak',
    consultingRate: 600,
    availability: 'available',
    featured: false,
  },
  {
    slug: 'david-armstrong-commercial',
    name: 'David Armstrong',
    title: 'Commercial Space Counsel',
    organization: 'Morrison Foerster',
    expertise: ['space_law', 'regulatory'],
    bio: 'Specialist in commercial launch licensing, spaceport development, and space tourism regulations. Advised on multiple FAA launch licenses and reentry permits.',
    contactEmail: 'david.armstrong@example.com',
    linkedIn: 'https://linkedin.com/in/davidarmstronglaw',
    consultingRate: 700,
    availability: 'limited',
    featured: false,
  },
  {
    slug: 'lisa-nakamura-ip',
    name: 'Dr. Lisa Nakamura',
    title: 'Space IP & Technology Counsel',
    organization: 'Cooley LLP',
    expertise: ['space_law', 'export_controls'],
    bio: 'Patent attorney specializing in space propulsion and satellite technology. Expert in technology transfer agreements and protecting IP in international collaborations.',
    contactEmail: 'lisa.nakamura@example.com',
    linkedIn: 'https://linkedin.com/in/lisanakamuraip',
    consultingRate: 625,
    availability: 'available',
    featured: false,
  },
  {
    slug: 'robert-martinez-defense',
    name: 'Robert Martinez',
    title: 'National Security Space Counsel',
    organization: 'Arnold & Porter',
    expertise: ['export_controls', 'regulatory'],
    bio: 'Defense space contracting and security clearance specialist. Former DoD Space Programs attorney with expertise in classified contracts and CFIUS reviews.',
    contactEmail: 'robert.martinez@example.com',
    linkedIn: 'https://linkedin.com/in/rmartinezdefense',
    consultingRate: 800,
    availability: 'booked',
    featured: true,
  },

  // Engineers (Propulsion, Avionics, Systems) - 6 experts
  {
    slug: 'dr-elena-volkov-propulsion',
    name: 'Dr. Elena Volkov',
    title: 'Chief Propulsion Engineer',
    organization: 'Independent Consultant',
    expertise: ['propulsion', 'systems_engineering'],
    bio: 'Former SpaceX propulsion lead with expertise in Merlin and Raptor engine development. Specializes in LOX/methane systems, turbopump design, and combustion stability.',
    contactEmail: 'elena.volkov@example.com',
    linkedIn: 'https://linkedin.com/in/elenavolkovprop',
    consultingRate: 900,
    availability: 'limited',
    featured: true,
  },
  {
    slug: 'james-oconnor-avionics',
    name: 'James O\'Connor',
    title: 'Avionics Systems Architect',
    organization: 'Lockheed Martin (Retired)',
    expertise: ['avionics', 'systems_engineering'],
    bio: '30-year veteran in spacecraft avionics design. Led GN&C systems for multiple Mars missions. Expert in radiation-hardened electronics and fault-tolerant architectures.',
    contactEmail: 'james.oconnor@example.com',
    linkedIn: 'https://linkedin.com/in/joconnoravionics',
    consultingRate: 750,
    availability: 'available',
    featured: true,
  },
  {
    slug: 'priya-sharma-thermal',
    name: 'Dr. Priya Sharma',
    title: 'Thermal Systems Engineer',
    organization: 'Sharma Aerospace Consulting',
    expertise: ['systems_engineering', 'propulsion'],
    bio: 'Expert in spacecraft thermal control systems and electric propulsion thermal management. Former Boeing satellite thermal engineer with 50+ satellite programs.',
    contactEmail: 'priya.sharma@example.com',
    linkedIn: 'https://linkedin.com/in/priyasharmathrml',
    consultingRate: 550,
    availability: 'available',
    featured: false,
  },
  {
    slug: 'kevin-zhang-gnc',
    name: 'Kevin Zhang',
    title: 'GN&C Principal Engineer',
    organization: 'Blue Origin (On Leave)',
    expertise: ['avionics', 'systems_engineering'],
    bio: 'Guidance, navigation, and control specialist with expertise in autonomous landing systems and precision orbital mechanics. Key contributor to New Shepard GN&C.',
    contactEmail: 'kevin.zhang@example.com',
    linkedIn: 'https://linkedin.com/in/kevinzhanggnc',
    consultingRate: 800,
    availability: 'unavailable',
    featured: false,
  },
  {
    slug: 'amanda-foster-structures',
    name: 'Amanda Foster',
    title: 'Structural Systems Lead',
    organization: 'Northrop Grumman',
    expertise: ['systems_engineering'],
    bio: 'Composite structures specialist for launch vehicles and spacecraft. Expert in additive manufacturing for space applications and structural qualification testing.',
    contactEmail: 'amanda.foster@example.com',
    linkedIn: 'https://linkedin.com/in/amandafosterstruct',
    consultingRate: 600,
    availability: 'limited',
    featured: false,
  },
  {
    slug: 'carlos-rivera-electric',
    name: 'Dr. Carlos Rivera',
    title: 'Electric Propulsion Scientist',
    organization: 'NASA JPL (Retired)',
    expertise: ['propulsion', 'systems_engineering'],
    bio: 'Hall thruster and ion propulsion expert with 25 years at JPL. Led propulsion development for Dawn and DART missions. Consulting on next-gen EP systems.',
    contactEmail: 'carlos.rivera@example.com',
    linkedIn: 'https://linkedin.com/in/carlosriveraep',
    consultingRate: 700,
    availability: 'available',
    featured: true,
  },

  // Policy Experts (Government Relations, International Space Policy) - 6 experts
  {
    slug: 'margaret-wilson-policy',
    name: 'Dr. Margaret Wilson',
    title: 'Space Policy Director',
    organization: 'Center for Strategic & International Studies',
    expertise: ['government_relations', 'international_policy'],
    bio: 'Former White House OSTP space policy advisor. Expert on US-China space relations, Artemis Accords, and civil-military space coordination.',
    contactEmail: 'margaret.wilson@example.com',
    linkedIn: 'https://linkedin.com/in/mwilsonpolicy',
    consultingRate: 850,
    availability: 'limited',
    featured: true,
  },
  {
    slug: 'thomas-brennan-congress',
    name: 'Thomas Brennan',
    title: 'Congressional Affairs Consultant',
    organization: 'Brennan Government Relations',
    expertise: ['government_relations'],
    bio: 'Former Senate Commerce Committee staffer specializing in NASA authorization and commercial space legislation. Extensive Capitol Hill relationships.',
    contactEmail: 'thomas.brennan@example.com',
    linkedIn: 'https://linkedin.com/in/tbrennangovrel',
    consultingRate: 600,
    availability: 'available',
    featured: false,
  },
  {
    slug: 'yuki-tanaka-international',
    name: 'Dr. Yuki Tanaka',
    title: 'International Space Law Scholar',
    organization: 'Georgetown Law Center',
    expertise: ['international_policy', 'space_law'],
    bio: 'Leading academic on international space governance, UN COPUOS negotiations, and space sustainability. Advisor to JAXA on international partnerships.',
    contactEmail: 'yuki.tanaka@example.com',
    linkedIn: 'https://linkedin.com/in/yukitanakalaw',
    consultingRate: 500,
    availability: 'available',
    featured: false,
  },
  {
    slug: 'andrew-hayes-dod',
    name: 'Lt Gen (Ret) Andrew Hayes',
    title: 'Space Force Strategic Advisor',
    organization: 'Hayes Strategic Advisory',
    expertise: ['government_relations', 'international_policy'],
    bio: 'Former Space Force deputy commander with expertise in space domain awareness, national security space policy, and allied space cooperation.',
    contactEmail: 'andrew.hayes@example.com',
    linkedIn: 'https://linkedin.com/in/ltgenhayesspace',
    consultingRate: 950,
    availability: 'booked',
    featured: true,
  },
  {
    slug: 'christina-mueller-eu',
    name: 'Dr. Christina Mueller',
    title: 'European Space Policy Expert',
    organization: 'European Space Policy Institute',
    expertise: ['international_policy'],
    bio: 'Expert on ESA programs, EU space regulation, and transatlantic space cooperation. Former German Space Agency policy director.',
    contactEmail: 'christina.mueller@example.com',
    linkedIn: 'https://linkedin.com/in/cmuellerespi',
    consultingRate: 550,
    availability: 'available',
    featured: false,
  },
  {
    slug: 'raj-patel-procurement',
    name: 'Raj Patel',
    title: 'Federal Space Procurement Advisor',
    organization: 'Patel Consulting Group',
    expertise: ['government_relations'],
    bio: 'NASA and DoD procurement specialist. Expert in SBIR/STTR programs, CRADAs, and navigating federal acquisition for space companies.',
    contactEmail: 'raj.patel@example.com',
    linkedIn: 'https://linkedin.com/in/rajpatelgov',
    consultingRate: 475,
    availability: 'available',
    featured: false,
  },
];

// Get all talent with optional filters
export async function getTalentBoard(filters?: {
  expertise?: TalentExpertiseArea;
  availability?: TalentAvailability;
  featured?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ talent: SpaceTalent[]; total: number }> {
  let filteredTalent = SPACE_TALENT_SEED.map((t, index) => ({
    ...t,
    id: `talent-${index + 1}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  })) as SpaceTalent[];

  if (filters?.expertise) {
    filteredTalent = filteredTalent.filter(t => t.expertise.includes(filters.expertise!));
  }

  if (filters?.availability) {
    filteredTalent = filteredTalent.filter(t => t.availability === filters.availability);
  }

  if (filters?.featured !== undefined) {
    filteredTalent = filteredTalent.filter(t => t.featured === filters.featured);
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    filteredTalent = filteredTalent.filter(t =>
      t.name.toLowerCase().includes(searchLower) ||
      t.title.toLowerCase().includes(searchLower) ||
      t.organization.toLowerCase().includes(searchLower) ||
      t.bio.toLowerCase().includes(searchLower)
    );
  }

  const total = filteredTalent.length;

  // Apply pagination
  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;
  filteredTalent = filteredTalent.slice(offset, offset + limit);

  return { talent: filteredTalent, total };
}

// Get single talent by slug
export async function getTalentBySlug(slug: string): Promise<SpaceTalent | null> {
  const talent = SPACE_TALENT_SEED.find(t => t.slug === slug);
  if (!talent) return null;

  const index = SPACE_TALENT_SEED.indexOf(talent);
  return {
    ...talent,
    id: `talent-${index + 1}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as SpaceTalent;
}

// Get talent stats
export async function getTalentStats() {
  const talent = SPACE_TALENT_SEED;

  const byExpertise: Record<string, number> = {};
  talent.forEach(t => {
    t.expertise.forEach(exp => {
      byExpertise[exp] = (byExpertise[exp] || 0) + 1;
    });
  });

  const byAvailability: Record<TalentAvailability, number> = {
    available: 0,
    limited: 0,
    booked: 0,
    unavailable: 0,
  };
  talent.forEach(t => {
    byAvailability[t.availability]++;
  });

  const avgRate = talent
    .filter(t => t.consultingRate)
    .reduce((sum, t) => sum + (t.consultingRate || 0), 0) / talent.filter(t => t.consultingRate).length;

  return {
    totalExperts: talent.length,
    featuredCount: talent.filter(t => t.featured).length,
    availableCount: talent.filter(t => t.availability === 'available').length,
    byExpertise,
    byAvailability,
    avgConsultingRate: Math.round(avgRate),
  };
}
