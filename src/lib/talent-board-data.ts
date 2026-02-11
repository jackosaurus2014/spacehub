import { SpaceTalent, TalentExpertiseArea, TalentAvailability } from '@/types';

// Talent directory - prominent public figures in the space industry
export const SPACE_TALENT_SEED: Omit<SpaceTalent, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // === SPACE LAW ===
  {
    slug: 'frans-von-der-dunk',
    name: 'Frans von der Dunk',
    title: 'Professor of Space Law',
    organization: 'University of Nebraska-Lincoln',
    expertise: ['space_law', 'international_policy'],
    bio: 'Harvey & Susan Perlman Alumni Professor of Space Law and one of the world\'s foremost authorities on international space law and policy.',
    contactEmail: 'spacelaw@unl.edu',
    linkedIn: null,
    consultingRate: 500,
    availability: 'limited',
    featured: true,
  },
  {
    slug: 'joanne-irene-gabrynowicz',
    name: 'Joanne Irene Gabrynowicz',
    title: 'Professor Emerita of Space Law',
    organization: 'University of Mississippi',
    expertise: ['space_law', 'regulatory'],
    bio: 'Former editor-in-chief of the Journal of Space Law and leading expert on remote sensing law and national space legislation.',
    contactEmail: 'jlaw@olemiss.edu',
    linkedIn: null,
    consultingRate: 450,
    availability: 'available',
    featured: false,
  },
  {
    slug: 'michael-listner',
    name: 'Michael Listner',
    title: 'Founder & Principal',
    organization: 'Space Law & Policy Solutions',
    expertise: ['space_law', 'international_policy', 'regulatory'],
    bio: 'Attorney and space policy analyst specializing in international space law, space security, and the intersection of national security and commercial space.',
    contactEmail: 'info@spacelawsolutions.com',
    linkedIn: null,
    consultingRate: 400,
    availability: 'available',
    featured: false,
  },

  // === EXPORT CONTROLS ===
  {
    slug: 'kevin-wolf',
    name: 'Kevin Wolf',
    title: 'Partner, International Trade',
    organization: 'Akin Gump Strauss Hauer & Feld',
    expertise: ['export_controls', 'regulatory', 'space_law'],
    bio: 'Former Assistant Secretary of Commerce for Export Administration who led the reform of U.S. export controls including ITAR and EAR regulations affecting the space industry.',
    contactEmail: 'info@akingump.com',
    linkedIn: null,
    consultingRate: null,
    availability: 'limited',
    featured: true,
  },
  {
    slug: 'tom-coppen',
    name: 'Tom Coppen',
    title: 'Senior Counsel, Export Controls',
    organization: 'Hogan Lovells',
    expertise: ['export_controls', 'regulatory'],
    bio: 'Specialist in ITAR and EAR compliance for satellite manufacturers and launch providers, advising on export licensing and compliance programs.',
    contactEmail: 'info@hoganlovells.com',
    linkedIn: null,
    consultingRate: null,
    availability: 'limited',
    featured: false,
  },
  {
    slug: 'brian-nilsson',
    name: 'Brian Nilsson',
    title: 'Director of Export Compliance',
    organization: 'Northrop Grumman',
    expertise: ['export_controls', 'regulatory', 'government_relations'],
    bio: 'Leads export compliance programs for one of the largest defense and space contractors, ensuring ITAR/EAR adherence across satellite and launch programs.',
    contactEmail: 'media@northropgrumman.com',
    linkedIn: null,
    consultingRate: null,
    availability: 'unavailable',
    featured: false,
  },

  // === REGULATORY ===
  {
    slug: 'jessica-rosenworcel',
    name: 'Jessica Rosenworcel',
    title: 'Former Chairwoman',
    organization: 'Federal Communications Commission',
    expertise: ['regulatory', 'international_policy'],
    bio: 'Led the FCC through major spectrum allocation decisions and satellite licensing reforms that shaped the modern commercial space communications landscape.',
    contactEmail: 'info@fcc.gov',
    linkedIn: null,
    consultingRate: null,
    availability: 'unavailable',
    featured: false,
  },
  {
    slug: 'george-nield',
    name: 'George Nield',
    title: 'President',
    organization: 'Commercial Space Technologies',
    expertise: ['regulatory', 'systems_engineering', 'government_relations'],
    bio: 'Former FAA Associate Administrator for Commercial Space Transportation who oversaw the licensing and regulation of commercial launch and reentry operations.',
    contactEmail: 'info@commercialspacetechnologies.com',
    linkedIn: null,
    consultingRate: 350,
    availability: 'available',
    featured: false,
  },

  // === PROPULSION ===
  {
    slug: 'tom-mueller',
    name: 'Tom Mueller',
    title: 'Co-Founder & CEO',
    organization: 'Impulse Space',
    expertise: ['propulsion', 'systems_engineering'],
    bio: 'Founding employee and former VP of Propulsion at SpaceX, where he designed the Merlin and Raptor rocket engines. Now leading orbital transportation at Impulse Space.',
    contactEmail: 'info@impulsespace.com',
    linkedIn: null,
    consultingRate: null,
    availability: 'booked',
    featured: true,
  },
  {
    slug: 'tina-ghataore',
    name: 'Tina Ghataore',
    title: 'Chief Commercial Officer',
    organization: 'Aerojet Rocketdyne (L3Harris)',
    expertise: ['propulsion', 'government_relations'],
    bio: 'Senior leader at the largest U.S. propulsion manufacturer, overseeing commercial strategy for liquid and solid rocket propulsion systems including RS-25 and RL10 engines.',
    contactEmail: 'media@l3harris.com',
    linkedIn: null,
    consultingRate: null,
    availability: 'unavailable',
    featured: false,
  },
  {
    slug: 'adam-london',
    name: 'Adam London',
    title: 'Co-Founder & CTO',
    organization: 'Ursa Major Technologies',
    expertise: ['propulsion', 'systems_engineering'],
    bio: 'Leading development of modular, 3D-printed rocket engines designed for rapid production and flexible integration across multiple launch vehicle platforms.',
    contactEmail: 'info@ursamajor.com',
    linkedIn: null,
    consultingRate: null,
    availability: 'booked',
    featured: false,
  },

  // === AVIONICS ===
  {
    slug: 'gwynne-shotwell',
    name: 'Gwynne Shotwell',
    title: 'President & COO',
    organization: 'SpaceX',
    expertise: ['avionics', 'systems_engineering', 'government_relations'],
    bio: 'Oversees all day-to-day operations and customer management at SpaceX, having guided the company through its first Falcon 1 launch to industry dominance in commercial launch.',
    contactEmail: 'media@spacex.com',
    linkedIn: null,
    consultingRate: null,
    availability: 'unavailable',
    featured: true,
  },
  {
    slug: 'steve-isakowitz',
    name: 'Steve Isakowitz',
    title: 'President & CEO',
    organization: 'The Aerospace Corporation',
    expertise: ['avionics', 'systems_engineering'],
    bio: 'Leads the federally funded research center supporting national security space programs, with deep expertise in spacecraft avionics architectures and mission assurance.',
    contactEmail: 'mediarelations@aero.org',
    linkedIn: null,
    consultingRate: null,
    availability: 'limited',
    featured: false,
  },
  {
    slug: 'deborah-lee-james',
    name: 'Deborah Lee James',
    title: 'Board Member & Advisor',
    organization: 'SAIC',
    expertise: ['avionics', 'government_relations'],
    bio: 'Former Secretary of the Air Force with extensive experience in defense avionics procurement and space systems acquisition strategy.',
    contactEmail: 'info@saic.com',
    linkedIn: null,
    consultingRate: null,
    availability: 'limited',
    featured: false,
  },

  // === SYSTEMS ENGINEERING ===
  {
    slug: 'tory-bruno',
    name: 'Tory Bruno',
    title: 'President & CEO',
    organization: 'United Launch Alliance',
    expertise: ['systems_engineering', 'propulsion', 'government_relations'],
    bio: 'Leads ULA through the Vulcan Centaur era, bringing decades of systems engineering experience from Lockheed Martin missile defense and space programs.',
    contactEmail: 'media@ulalaunch.com',
    linkedIn: null,
    consultingRate: null,
    availability: 'unavailable',
    featured: true,
  },
  {
    slug: 'peter-beck',
    name: 'Peter Beck',
    title: 'Founder & CEO',
    organization: 'Rocket Lab',
    expertise: ['systems_engineering', 'propulsion'],
    bio: 'Self-taught rocket engineer who built Rocket Lab into a leading small launch provider and spacecraft manufacturer with the Electron and Neutron vehicles.',
    contactEmail: 'media@rocketlabusa.com',
    linkedIn: null,
    consultingRate: null,
    availability: 'unavailable',
    featured: false,
  },
  {
    slug: 'mike-griffin',
    name: 'Mike Griffin',
    title: 'Former Administrator',
    organization: 'NASA',
    expertise: ['systems_engineering', 'international_policy', 'government_relations'],
    bio: 'Former NASA Administrator and Under Secretary of Defense for Research and Engineering, with deep expertise in spacecraft systems architecture and space policy.',
    contactEmail: 'contact@nasa.gov',
    linkedIn: null,
    consultingRate: 500,
    availability: 'limited',
    featured: false,
  },

  // === GOVERNMENT RELATIONS ===
  {
    slug: 'bill-nelson',
    name: 'Bill Nelson',
    title: 'Former Administrator',
    organization: 'NASA',
    expertise: ['government_relations', 'international_policy'],
    bio: 'Former NASA Administrator and U.S. Senator who flew on the Space Shuttle Columbia in 1986, championing bipartisan support for space exploration and Artemis.',
    contactEmail: 'contact@nasa.gov',
    linkedIn: null,
    consultingRate: null,
    availability: 'available',
    featured: false,
  },
  {
    slug: 'eric-stallmer',
    name: 'Eric Stallmer',
    title: 'Executive Vice President',
    organization: 'Voyager Space',
    expertise: ['government_relations', 'regulatory', 'international_policy'],
    bio: 'Former president of the Commercial Spaceflight Federation and longtime space industry advocate, now leading government affairs for commercial space station development.',
    contactEmail: 'info@voyagerspace.com',
    linkedIn: null,
    consultingRate: null,
    availability: 'limited',
    featured: false,
  },
  {
    slug: 'mary-lynne-dittmar',
    name: 'Mary Lynne Dittmar',
    title: 'Independent Consultant',
    organization: 'Dittmar Associates',
    expertise: ['government_relations', 'international_policy', 'regulatory'],
    bio: 'Former president of the Coalition for Deep Space Exploration and advisor to NASA on human spaceflight policy and commercial space partnerships.',
    contactEmail: 'info@dittmarassociates.com',
    linkedIn: null,
    consultingRate: 400,
    availability: 'available',
    featured: false,
  },

  // === INTERNATIONAL POLICY ===
  {
    slug: 'scott-pace',
    name: 'Scott Pace',
    title: 'Director, Space Policy Institute',
    organization: 'George Washington University',
    expertise: ['international_policy', 'space_law', 'government_relations'],
    bio: 'Former Executive Secretary of the National Space Council under the Trump administration and leading scholar on international space governance and the Artemis Accords.',
    contactEmail: 'spi@gwu.edu',
    linkedIn: null,
    consultingRate: 450,
    availability: 'limited',
    featured: true,
  },
  {
    slug: 'simonetta-di-pippo',
    name: 'Simonetta Di Pippo',
    title: 'Director, SEE Lab',
    organization: 'Bocconi University',
    expertise: ['international_policy', 'space_law'],
    bio: 'Former Director of the UN Office for Outer Space Affairs (UNOOSA) who led global space sustainability initiatives and international cooperation frameworks.',
    contactEmail: 'seelab@unibocconi.it',
    linkedIn: null,
    consultingRate: null,
    availability: 'limited',
    featured: false,
  },
  {
    slug: 'jean-yves-le-gall',
    name: 'Jean-Yves Le Gall',
    title: 'Former President',
    organization: 'CNES (French Space Agency)',
    expertise: ['international_policy', 'government_relations'],
    bio: 'Former president of the French space agency and chair of the International Astronautical Federation, instrumental in shaping European space strategy and Ariane development.',
    contactEmail: 'info@cnes.fr',
    linkedIn: null,
    consultingRate: null,
    availability: 'available',
    featured: false,
  },
  {
    slug: 'pamela-melroy',
    name: 'Pamela Melroy',
    title: 'Deputy Administrator',
    organization: 'NASA',
    expertise: ['international_policy', 'systems_engineering', 'government_relations'],
    bio: 'Former Space Shuttle commander and NASA Deputy Administrator overseeing agency-wide strategy, international partnerships, and the Artemis program.',
    contactEmail: 'contact@nasa.gov',
    linkedIn: null,
    consultingRate: null,
    availability: 'unavailable',
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

  const talentWithRates = talent.filter(t => t.consultingRate);
  const avgRate = talentWithRates.length > 0
    ? talentWithRates.reduce((sum, t) => sum + (t.consultingRate || 0), 0) / talentWithRates.length
    : 0;

  return {
    totalExperts: talent.length,
    featuredCount: talent.filter(t => t.featured).length,
    availableCount: talent.filter(t => t.availability === 'available').length,
    byExpertise,
    byAvailability,
    avgConsultingRate: Math.round(avgRate),
  };
}
