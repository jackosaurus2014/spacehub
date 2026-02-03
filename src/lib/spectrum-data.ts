import prisma from './db';
import { SpectrumAllocation, SpectrumFiling, SpectrumService, SpectrumFilingStatus } from '@/types';

// Seed data for spectrum allocations
export const SPECTRUM_ALLOCATIONS_SEED = [
  {
    slug: 'l-band',
    bandName: 'L-band',
    frequencyMin: 1000,
    frequencyMax: 2000,
    bandwidth: 1000,
    service: 'mobile_satellite',
    region: 'Global',
    allocationType: 'primary',
    assignedTo: 'Iridium / Inmarsat',
    filingStatus: 'assigned',
    numberOfFilings: 14,
    ituReference: 'RR 5.351A',
    fccReference: null,
    coordinationRequired: true,
    description: 'Primary mobile satellite band. Used by Iridium, Inmarsat, and Globalstar for voice and low-data-rate services.',
  },
  {
    slug: 's-band',
    bandName: 'S-band',
    frequencyMin: 2000,
    frequencyMax: 4000,
    bandwidth: 2000,
    service: 'earth_exploration',
    region: 'Global',
    allocationType: 'shared',
    assignedTo: null,
    filingStatus: 'filed',
    numberOfFilings: 22,
    ituReference: 'RR 5.391',
    fccReference: null,
    coordinationRequired: true,
    description: 'Used for Earth exploration satellite service and space research. Shared with terrestrial mobile services in many regions.',
  },
  {
    slug: 'c-band',
    bandName: 'C-band',
    frequencyMin: 4000,
    frequencyMax: 8000,
    bandwidth: 4000,
    service: 'fixed_satellite',
    region: 'Global',
    allocationType: 'primary',
    assignedTo: 'SES / Intelsat (transitioning)',
    filingStatus: 'congested',
    numberOfFilings: 87,
    ituReference: 'RR 5.418',
    fccReference: 'FCC 20-22',
    coordinationRequired: true,
    description: 'Heavily congested band undergoing transition. FCC C-band auction reallocated 3.7-3.98 GHz to 5G. Legacy satellite operators being relocated.',
  },
  {
    slug: 'x-band',
    bandName: 'X-band',
    frequencyMin: 8000,
    frequencyMax: 12000,
    bandwidth: 4000,
    service: 'earth_exploration',
    region: 'Region 2',
    allocationType: 'primary',
    assignedTo: 'Military / Government',
    filingStatus: 'assigned',
    numberOfFilings: 31,
    ituReference: 'RR 5.461',
    fccReference: null,
    coordinationRequired: true,
    description: 'Primarily reserved for military communications, radar, and Earth exploration satellite services. Limited commercial access.',
  },
  {
    slug: 'ku-band',
    bandName: 'Ku-band',
    frequencyMin: 12000,
    frequencyMax: 18000,
    bandwidth: 6000,
    service: 'fixed_satellite',
    region: 'Global',
    allocationType: 'primary',
    assignedTo: 'OneWeb / SES / Eutelsat',
    filingStatus: 'assigned',
    numberOfFilings: 64,
    ituReference: 'RR 5.484A',
    fccReference: 'FCC 17-122',
    coordinationRequired: true,
    description: 'Workhorse band for DTH television and VSAT services. Increasingly used by NGSO constellations like OneWeb.',
  },
  {
    slug: 'ka-band',
    bandName: 'Ka-band',
    frequencyMin: 26000,
    frequencyMax: 40000,
    bandwidth: 14000,
    service: 'fixed_satellite',
    region: 'Global',
    allocationType: 'primary',
    assignedTo: 'SpaceX / Amazon / Telesat',
    filingStatus: 'coordinating',
    numberOfFilings: 112,
    ituReference: 'RR 5.516B',
    fccReference: 'FCC 22-91',
    coordinationRequired: true,
    description: 'High-throughput band critical for next-gen broadband constellations. Active coordination between Starlink, Kuiper, and Lightspeed systems.',
  },
  {
    slug: 'v-band',
    bandName: 'V-band',
    frequencyMin: 40000,
    frequencyMax: 75000,
    bandwidth: 35000,
    service: 'inter_satellite',
    region: 'Global',
    allocationType: 'primary',
    assignedTo: null,
    filingStatus: 'available',
    numberOfFilings: 18,
    ituReference: 'RR 5.555',
    fccReference: null,
    coordinationRequired: false,
    description: 'Emerging band with large bandwidth availability. SpaceX has filed for V-band NGSO operations. High atmospheric attenuation limits ground use.',
  },
  {
    slug: 'q-band',
    bandName: 'Q-band',
    frequencyMin: 33000,
    frequencyMax: 50000,
    bandwidth: 17000,
    service: 'fixed_satellite',
    region: 'Global',
    allocationType: 'secondary',
    assignedTo: null,
    filingStatus: 'available',
    numberOfFilings: 7,
    ituReference: 'RR 5.547',
    fccReference: null,
    coordinationRequired: false,
    description: 'Largely unallocated band with potential for future high-capacity satellite links. Research and experimental use ongoing.',
  },
];

// Seed data for spectrum filings
const filingDate = (year: number, month: number, day: number) => new Date(year, month - 1, day);

export const SPECTRUM_FILINGS_SEED = [
  {
    filingId: 'SAT-LOI-2021-0002',
    operator: 'SpaceX',
    system: 'Starlink Gen2 V-band',
    agency: 'FCC',
    bandName: 'V-band',
    frequencyMin: 40000,
    frequencyMax: 50200,
    orbitType: 'NGSO',
    numberOfSatellites: 7500,
    status: 'approved',
    filingDate: filingDate(2021, 1, 15),
    grantDate: filingDate(2023, 12, 1),
    expiryDate: filingDate(2032, 12, 1),
    description: 'SpaceX Gen2 filing for V-band downlinks to support high-throughput Starlink services at scale.',
    country: 'USA',
  },
  {
    filingId: 'SAT-MPL-2020-0064',
    operator: 'SpaceX',
    system: 'Starlink Ka-band',
    agency: 'FCC',
    bandName: 'Ka-band',
    frequencyMin: 27500,
    frequencyMax: 29500,
    orbitType: 'NGSO',
    numberOfSatellites: 4408,
    status: 'approved',
    filingDate: filingDate(2020, 4, 17),
    grantDate: filingDate(2021, 4, 27),
    expiryDate: filingDate(2030, 4, 27),
    description: 'Ka-band authorization for Starlink broadband constellation. Includes gateway and user terminal links.',
    country: 'USA',
  },
  {
    filingId: 'SAT-LOI-2019-0034',
    operator: 'Amazon (Kuiper)',
    system: 'Project Kuiper',
    agency: 'FCC',
    bandName: 'Ka-band',
    frequencyMin: 28600,
    frequencyMax: 30000,
    orbitType: 'NGSO',
    numberOfSatellites: 3236,
    status: 'approved',
    filingDate: filingDate(2019, 7, 4),
    grantDate: filingDate(2020, 7, 30),
    expiryDate: filingDate(2029, 7, 30),
    description: 'Amazon Project Kuiper Ka-band LEO constellation for global broadband. Must deploy 50% by 2026.',
    country: 'USA',
  },
  {
    filingId: 'SAT-LOI-2016-0041',
    operator: 'OneWeb',
    system: 'OneWeb Phase 2',
    agency: 'FCC',
    bandName: 'Ku-band',
    frequencyMin: 12750,
    frequencyMax: 14500,
    orbitType: 'NGSO',
    numberOfSatellites: 648,
    status: 'coordinating',
    filingDate: filingDate(2016, 5, 27),
    grantDate: null,
    expiryDate: null,
    description: 'OneWeb Phase 2 expansion filing for Ku-band spectrum. Coordination ongoing with incumbent GEO operators.',
    country: 'UK',
  },
  {
    filingId: 'SAT-LOI-2022-0078',
    operator: 'Telesat',
    system: 'Lightspeed',
    agency: 'FCC',
    bandName: 'Ka-band',
    frequencyMin: 28350,
    frequencyMax: 29100,
    orbitType: 'NGSO',
    numberOfSatellites: 298,
    status: 'pending',
    filingDate: filingDate(2022, 9, 14),
    grantDate: null,
    expiryDate: null,
    description: 'Telesat Lightspeed Ka-band filing for enterprise and government broadband LEO constellation.',
    country: 'Canada',
  },
  {
    filingId: 'SAT-APL-2023-0015',
    operator: 'AST SpaceMobile',
    system: 'SpaceMobile',
    agency: 'FCC',
    bandName: 'L-band',
    frequencyMin: 1910,
    frequencyMax: 1990,
    orbitType: 'NGSO',
    numberOfSatellites: 168,
    status: 'pending',
    filingDate: filingDate(2023, 3, 10),
    grantDate: null,
    expiryDate: null,
    description: 'Direct-to-cellular satellite service using standard mobile phone frequencies. Coordination with terrestrial carriers required.',
    country: 'USA',
  },
];

// Initialize spectrum data
export async function initializeSpectrumData() {
  const results = {
    allocationsCreated: 0,
    filingsCreated: 0,
  };

  // Upsert spectrum allocations
  for (const allocationData of SPECTRUM_ALLOCATIONS_SEED) {
    const existing = await prisma.spectrumAllocation.findUnique({
      where: { slug: allocationData.slug },
    });

    if (!existing) {
      await prisma.spectrumAllocation.create({
        data: allocationData,
      });
      results.allocationsCreated++;
    }
  }

  // Upsert spectrum filings
  for (const filingData of SPECTRUM_FILINGS_SEED) {
    const existing = await prisma.spectrumFiling.findUnique({
      where: { filingId: filingData.filingId },
    });

    if (!existing) {
      await prisma.spectrumFiling.create({
        data: filingData,
      });
      results.filingsCreated++;
    }
  }

  return results;
}

// Query functions
export async function getSpectrumAllocations(): Promise<SpectrumAllocation[]> {
  const allocations = await prisma.spectrumAllocation.findMany({
    orderBy: { frequencyMin: 'asc' },
  });

  return allocations.map(a => ({
    ...a,
    service: a.service as SpectrumService,
    filingStatus: a.filingStatus as SpectrumFilingStatus,
  }));
}

export async function getSpectrumFilings(options?: {
  bandName?: string;
  status?: string;
  operator?: string;
}): Promise<SpectrumFiling[]> {
  const where: Record<string, unknown> = {};

  if (options?.bandName) {
    where.bandName = options.bandName;
  }
  if (options?.status) {
    where.status = options.status;
  }
  if (options?.operator) {
    where.operator = { contains: options.operator };
  }

  const filings = await prisma.spectrumFiling.findMany({
    where,
    orderBy: { filingDate: 'desc' },
  });

  return filings as SpectrumFiling[];
}

export async function getSpectrumStats() {
  const allocations = await prisma.spectrumAllocation.findMany();
  const filings = await prisma.spectrumFiling.findMany();

  const totalBands = allocations.length;
  const congestedBands = allocations.filter(a => a.filingStatus === 'congested').length;
  const totalFilings = filings.length;
  const pendingFilings = filings.filter(f => f.status === 'pending').length;

  // Find the band with the most filings
  const topBand = allocations.reduce(
    (top, a) => (a.numberOfFilings > (top?.numberOfFilings ?? 0) ? a : top),
    allocations[0],
  );

  return {
    totalBands,
    congestedBands,
    totalFilings,
    pendingFilings,
    topBand: topBand
      ? {
          bandName: topBand.bandName,
          filingStatus: topBand.filingStatus as SpectrumFilingStatus,
          numberOfFilings: topBand.numberOfFilings,
        }
      : null,
  };
}
