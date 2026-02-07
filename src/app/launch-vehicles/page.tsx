'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/ui/PageHeader';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type VehicleStatus = 'Operational' | 'In Development' | 'Retired';
type TabId = 'database' | 'compare' | 'reliability' | 'cost';

interface LaunchVehicle {
  id: string;
  name: string;
  manufacturer: string;
  country: string;
  status: VehicleStatus;
  heightM: number;
  diameterM: number;
  massKg: number;
  payloadLeoKg: number;
  payloadGtoKg: number | null;
  payloadSsoKg: number | null;
  payloadTliKg: number | null;
  costMillions: number | null;
  costPerKgLeo: number | null;
  totalLaunches: number;
  successes: number;
  failures: number;
  partialFailures: number;
  successRate: number;
  consecutiveSuccesses: number;
  reusable: boolean;
  stages: number;
  engines: string;
  propellant: string;
  fairingDiameterM: number;
  firstFlight: string;
  lastFlight: string | null;
  description: string;
}

// ────────────────────────────────────────
// Vehicle Seed Data (real specs)
// ────────────────────────────────────────

const VEHICLES: LaunchVehicle[] = [
  {
    id: 'falcon-9',
    name: 'Falcon 9 Block 5',
    manufacturer: 'SpaceX',
    country: 'United States',
    status: 'Operational',
    heightM: 70,
    diameterM: 3.7,
    massKg: 549054,
    payloadLeoKg: 22800,
    payloadGtoKg: 8300,
    payloadSsoKg: 15600,
    payloadTliKg: null,
    costMillions: 67,
    costPerKgLeo: 2940,
    totalLaunches: 382,
    successes: 380,
    failures: 1,
    partialFailures: 1,
    successRate: 99.5,
    consecutiveSuccesses: 310,
    reusable: true,
    stages: 2,
    engines: '9x Merlin 1D + 1x Merlin Vacuum',
    propellant: 'RP-1 / LOX',
    fairingDiameterM: 5.2,
    firstFlight: '2010-06-04',
    lastFlight: null,
    description: 'The workhorse of the global launch industry. First orbital-class rocket to achieve propulsive landing and routine reuse of the first stage. Dominates the global commercial launch market with the highest cadence of any active vehicle.',
  },
  {
    id: 'falcon-heavy',
    name: 'Falcon Heavy',
    manufacturer: 'SpaceX',
    country: 'United States',
    status: 'Operational',
    heightM: 70,
    diameterM: 12.2,
    massKg: 1420788,
    payloadLeoKg: 63800,
    payloadGtoKg: 26700,
    payloadSsoKg: null,
    payloadTliKg: 16800,
    costMillions: 97,
    costPerKgLeo: 1520,
    totalLaunches: 12,
    successes: 12,
    failures: 0,
    partialFailures: 0,
    successRate: 100,
    consecutiveSuccesses: 12,
    reusable: true,
    stages: 2,
    engines: '27x Merlin 1D + 1x Merlin Vacuum',
    propellant: 'RP-1 / LOX',
    fairingDiameterM: 5.2,
    firstFlight: '2018-02-06',
    lastFlight: null,
    description: 'The most powerful operational rocket by payload capacity to LEO. Uses three Falcon 9 first-stage cores strapped together. Side boosters are routinely recovered; center core recovery has been demonstrated.',
  },
  {
    id: 'starship',
    name: 'Starship / Super Heavy',
    manufacturer: 'SpaceX',
    country: 'United States',
    status: 'In Development',
    heightM: 121,
    diameterM: 9,
    massKg: 5000000,
    payloadLeoKg: 150000,
    payloadGtoKg: 21000,
    payloadSsoKg: null,
    payloadTliKg: 50000,
    costMillions: 10,
    costPerKgLeo: 67,
    totalLaunches: 7,
    successes: 3,
    failures: 2,
    partialFailures: 2,
    successRate: 42.9,
    consecutiveSuccesses: 2,
    reusable: true,
    stages: 2,
    engines: '33x Raptor (booster) + 6x Raptor (ship)',
    propellant: 'CH4 / LOX (Methalox)',
    fairingDiameterM: 8,
    firstFlight: '2023-04-20',
    lastFlight: null,
    description: 'The largest and most powerful rocket ever flown, designed for full and rapid reusability. Intended to enable Mars colonization, point-to-point Earth transport, and dramatically reduce cost per kg to orbit. Tower catch of the Super Heavy booster demonstrated in 2024.',
  },
  {
    id: 'electron',
    name: 'Electron',
    manufacturer: 'Rocket Lab',
    country: 'United States',
    status: 'Operational',
    heightM: 18,
    diameterM: 1.2,
    massKg: 12550,
    payloadLeoKg: 300,
    payloadGtoKg: null,
    payloadSsoKg: 200,
    payloadTliKg: null,
    costMillions: 7.5,
    costPerKgLeo: 25000,
    totalLaunches: 56,
    successes: 51,
    failures: 5,
    partialFailures: 0,
    successRate: 91.1,
    consecutiveSuccesses: 28,
    reusable: false,
    stages: 2,
    engines: '9x Rutherford + 1x Rutherford Vacuum',
    propellant: 'RP-1 / LOX',
    fairingDiameterM: 1.2,
    firstFlight: '2017-05-25',
    lastFlight: null,
    description: 'The leading dedicated small-satellite launcher. Uses electric turbopump-fed engines and carbon composite structure. Rocket Lab has demonstrated helicopter-based mid-air first stage recovery attempts to enable partial reuse.',
  },
  {
    id: 'neutron',
    name: 'Neutron',
    manufacturer: 'Rocket Lab',
    country: 'United States',
    status: 'In Development',
    heightM: 43,
    diameterM: 7,
    massKg: 480000,
    payloadLeoKg: 13000,
    payloadGtoKg: 1500,
    payloadSsoKg: null,
    payloadTliKg: null,
    costMillions: 50,
    costPerKgLeo: 3846,
    totalLaunches: 0,
    successes: 0,
    failures: 0,
    partialFailures: 0,
    successRate: 0,
    consecutiveSuccesses: 0,
    reusable: true,
    stages: 2,
    engines: '9x Archimedes + 1x Archimedes Vacuum',
    propellant: 'CH4 / LOX (Methalox)',
    fairingDiameterM: 5,
    firstFlight: '2025 (target)',
    lastFlight: null,
    description: 'Rocket Lab\'s medium-lift reusable launch vehicle, targeting the mega-constellation deployment market. Features a unique "Hungry Hippo" fairing design integrated into the first stage, Archimedes methalox engines, and propulsive landing capability.',
  },
  {
    id: 'vulcan-centaur',
    name: 'Vulcan Centaur',
    manufacturer: 'ULA',
    country: 'United States',
    status: 'Operational',
    heightM: 61.6,
    diameterM: 5.4,
    massKg: 546700,
    payloadLeoKg: 27200,
    payloadGtoKg: 12350,
    payloadSsoKg: null,
    payloadTliKg: 8900,
    costMillions: 110,
    costPerKgLeo: 4044,
    totalLaunches: 3,
    successes: 3,
    failures: 0,
    partialFailures: 0,
    successRate: 100,
    consecutiveSuccesses: 3,
    reusable: false,
    stages: 2,
    engines: '2x BE-4 + 1-2x RL-10C',
    propellant: 'CH4 / LOX (booster) + LH2 / LOX (upper)',
    fairingDiameterM: 5.4,
    firstFlight: '2024-01-08',
    lastFlight: null,
    description: 'ULA\'s next-generation launch vehicle replacing both Atlas V and Delta IV Heavy. Uses Blue Origin BE-4 methalox engines on the first stage and the proven Centaur V upper stage with RL-10C engines. Designed for national security missions.',
  },
  {
    id: 'atlas-v',
    name: 'Atlas V',
    manufacturer: 'ULA',
    country: 'United States',
    status: 'Retired',
    heightM: 58.3,
    diameterM: 3.81,
    massKg: 590000,
    payloadLeoKg: 18850,
    payloadGtoKg: 8900,
    payloadSsoKg: null,
    payloadTliKg: null,
    costMillions: 110,
    costPerKgLeo: 5836,
    totalLaunches: 101,
    successes: 100,
    failures: 0,
    partialFailures: 1,
    successRate: 99.0,
    consecutiveSuccesses: 101,
    reusable: false,
    stages: 2,
    engines: '1x RD-180 + 1-5x AJ-60A SRBs + 1-2x RL-10A',
    propellant: 'RP-1 / LOX (booster) + LH2 / LOX (upper)',
    fairingDiameterM: 5.4,
    firstFlight: '2002-08-21',
    lastFlight: '2024-04-02',
    description: 'One of the most reliable launch vehicles ever built, with a near-perfect flight record over two decades. Used Russian RD-180 engines. Retired in 2024 after final mission, replaced by Vulcan Centaur.',
  },
  {
    id: 'new-glenn',
    name: 'New Glenn',
    manufacturer: 'Blue Origin',
    country: 'United States',
    status: 'Operational',
    heightM: 98,
    diameterM: 7,
    massKg: 1500000,
    payloadLeoKg: 45000,
    payloadGtoKg: 13000,
    payloadSsoKg: null,
    payloadTliKg: null,
    costMillions: 68,
    costPerKgLeo: 1511,
    totalLaunches: 2,
    successes: 1,
    failures: 0,
    partialFailures: 1,
    successRate: 50,
    consecutiveSuccesses: 1,
    reusable: true,
    stages: 2,
    engines: '7x BE-4 + 2x BE-3U',
    propellant: 'CH4 / LOX (booster) + LH2 / LOX (upper)',
    fairingDiameterM: 7,
    firstFlight: '2025-01-13',
    lastFlight: null,
    description: 'Blue Origin\'s orbital heavy-lift launch vehicle with a reusable first stage. Features the largest payload fairing in production at 7 meters diameter. Named after astronaut John Glenn. Targets commercial, civil, and national security launches.',
  },
  {
    id: 'ariane-6',
    name: 'Ariane 6',
    manufacturer: 'ArianeGroup',
    country: 'France / ESA',
    status: 'Operational',
    heightM: 56,
    diameterM: 5.4,
    massKg: 530000,
    payloadLeoKg: 21650,
    payloadGtoKg: 11500,
    payloadSsoKg: 14900,
    payloadTliKg: null,
    costMillions: 77,
    costPerKgLeo: 3557,
    totalLaunches: 2,
    successes: 1,
    failures: 0,
    partialFailures: 1,
    successRate: 50,
    consecutiveSuccesses: 1,
    reusable: false,
    stages: 2,
    engines: '1x Vulcain 2.1 + 0/2/4x P120C SRBs + 1x Vinci',
    propellant: 'LH2 / LOX + HTPB (SRBs)',
    fairingDiameterM: 5.4,
    firstFlight: '2024-07-09',
    lastFlight: null,
    description: 'Europe\'s newest heavy-lift launcher replacing Ariane 5. Available in A62 (2 SRBs) and A64 (4 SRBs) configurations. The Vinci upper stage engine features a restart capability for complex mission profiles.',
  },
  {
    id: 'vega-c',
    name: 'Vega-C',
    manufacturer: 'Avio',
    country: 'Italy / ESA',
    status: 'Operational',
    heightM: 34.8,
    diameterM: 3.4,
    massKg: 210000,
    payloadLeoKg: 2300,
    payloadGtoKg: null,
    payloadSsoKg: 1500,
    payloadTliKg: null,
    costMillions: 37,
    costPerKgLeo: 16087,
    totalLaunches: 3,
    successes: 2,
    failures: 1,
    partialFailures: 0,
    successRate: 66.7,
    consecutiveSuccesses: 1,
    reusable: false,
    stages: 4,
    engines: 'P120C + Zefiro-40 + Zefiro-9 + AVUM+',
    propellant: 'HTPB (solid) + UDMH/N2O4 (AVUM+)',
    fairingDiameterM: 3.3,
    firstFlight: '2022-07-13',
    lastFlight: null,
    description: 'ESA\'s upgraded small-to-medium launch vehicle with improved performance over the original Vega. Uses the P120C solid motor shared with Ariane 6 as its first stage. Returned to flight in late 2024 after a Zefiro-40 nozzle failure.',
  },
  {
    id: 'h3',
    name: 'H3',
    manufacturer: 'JAXA / MHI',
    country: 'Japan',
    status: 'Operational',
    heightM: 63,
    diameterM: 5.2,
    massKg: 574000,
    payloadLeoKg: 16500,
    payloadGtoKg: 6500,
    payloadSsoKg: 12000,
    payloadTliKg: null,
    costMillions: 51,
    costPerKgLeo: 3091,
    totalLaunches: 4,
    successes: 3,
    failures: 1,
    partialFailures: 0,
    successRate: 75.0,
    consecutiveSuccesses: 3,
    reusable: false,
    stages: 2,
    engines: '2x LE-9 + 0/2x SRB-3 + 1x LE-5B-3',
    propellant: 'LH2 / LOX + HTPB (SRBs)',
    fairingDiameterM: 5.2,
    firstFlight: '2023-03-07',
    lastFlight: null,
    description: 'Japan\'s next-generation flagship launch vehicle replacing the H-IIA. Features the expander-bleed cycle LE-9 engine, designed for improved reliability and reduced cost. Achieved first successful orbital flight in February 2024.',
  },
  {
    id: 'pslv',
    name: 'PSLV',
    manufacturer: 'ISRO',
    country: 'India',
    status: 'Operational',
    heightM: 44,
    diameterM: 2.8,
    massKg: 320000,
    payloadLeoKg: 3800,
    payloadGtoKg: 1425,
    payloadSsoKg: 1750,
    payloadTliKg: null,
    costMillions: 21,
    costPerKgLeo: 5526,
    totalLaunches: 62,
    successes: 59,
    failures: 2,
    partialFailures: 1,
    successRate: 95.2,
    consecutiveSuccesses: 55,
    reusable: false,
    stages: 4,
    engines: 'S139 + Vikas + PS3 + PS4',
    propellant: 'HTPB + UDMH/N2O4 + HTPB + MMH/MON-3',
    fairingDiameterM: 3.2,
    firstFlight: '1993-09-20',
    lastFlight: null,
    description: 'India\'s highly reliable workhorse launcher with over 60 missions. Known for cost-effective rideshare and dedicated small satellite missions. Holds the record for deploying 104 satellites in a single mission (PSLV-C37).',
  },
  {
    id: 'lvm3',
    name: 'LVM3 (GSLV Mk III)',
    manufacturer: 'ISRO',
    country: 'India',
    status: 'Operational',
    heightM: 43.4,
    diameterM: 4,
    massKg: 640000,
    payloadLeoKg: 10000,
    payloadGtoKg: 4000,
    payloadSsoKg: null,
    payloadTliKg: null,
    costMillions: 47,
    costPerKgLeo: 4700,
    totalLaunches: 8,
    successes: 8,
    failures: 0,
    partialFailures: 0,
    successRate: 100,
    consecutiveSuccesses: 8,
    reusable: false,
    stages: 3,
    engines: '2x S200 SRBs + 2x Vikas + 1x CE-20',
    propellant: 'HTPB (SRBs) + UDMH/N2O4 + LH2/LOX',
    fairingDiameterM: 5,
    firstFlight: '2017-06-05',
    lastFlight: null,
    description: 'India\'s heaviest launch vehicle, used for Chandrayaan-3 lunar mission and OneWeb constellation deployment. Features indigenous CE-20 cryogenic upper stage engine. Also designated for the Gaganyaan crewed program.',
  },
  {
    id: 'long-march-5',
    name: 'Long March 5',
    manufacturer: 'CALT / CASC',
    country: 'China',
    status: 'Operational',
    heightM: 56.97,
    diameterM: 5,
    massKg: 869000,
    payloadLeoKg: 25000,
    payloadGtoKg: 14000,
    payloadSsoKg: null,
    payloadTliKg: 8200,
    costMillions: 100,
    costPerKgLeo: 4000,
    totalLaunches: 13,
    successes: 12,
    failures: 1,
    partialFailures: 0,
    successRate: 92.3,
    consecutiveSuccesses: 11,
    reusable: false,
    stages: 2,
    engines: '2x YF-77 + 4x boosters (2x YF-100 each) + 2x YF-75D',
    propellant: 'LH2 / LOX (core) + RP-1/LOX (boosters)',
    fairingDiameterM: 5.2,
    firstFlight: '2016-11-03',
    lastFlight: null,
    description: 'China\'s most powerful operational rocket, used for the Tianhe space station modules, Chang\'e lunar missions, and Tianwen Mars probe. The Long March 5B variant is used for LEO heavy-lift.',
  },
  {
    id: 'long-march-2d',
    name: 'Long March 2D',
    manufacturer: 'SAST / CASC',
    country: 'China',
    status: 'Operational',
    heightM: 41.06,
    diameterM: 3.35,
    massKg: 232250,
    payloadLeoKg: 3500,
    payloadGtoKg: null,
    payloadSsoKg: 1300,
    payloadTliKg: null,
    costMillions: 30,
    costPerKgLeo: 8571,
    totalLaunches: 92,
    successes: 91,
    failures: 1,
    partialFailures: 0,
    successRate: 98.9,
    consecutiveSuccesses: 87,
    reusable: false,
    stages: 2,
    engines: '4x YF-21C + 1x YF-24C',
    propellant: 'UDMH / N2O4',
    fairingDiameterM: 3.35,
    firstFlight: '1992-08-09',
    lastFlight: null,
    description: 'China\'s highly reliable medium-lift workhorse, primarily used for Earth observation and SSO missions. One of the most frequently launched Chinese vehicles with an excellent reliability record.',
  },
  {
    id: 'long-march-3b',
    name: 'Long March 3B/E',
    manufacturer: 'CALT / CASC',
    country: 'China',
    status: 'Operational',
    heightM: 56.33,
    diameterM: 3.35,
    massKg: 458970,
    payloadLeoKg: 11500,
    payloadGtoKg: 5500,
    payloadSsoKg: null,
    payloadTliKg: null,
    costMillions: 70,
    costPerKgLeo: 6087,
    totalLaunches: 94,
    successes: 90,
    failures: 3,
    partialFailures: 1,
    successRate: 95.7,
    consecutiveSuccesses: 47,
    reusable: false,
    stages: 3,
    engines: '4x YF-21C + 4x YF-25 (boosters) + 1x YF-24E + 2x YF-75',
    propellant: 'UDMH/N2O4 + LH2/LOX (3rd stage)',
    fairingDiameterM: 4.2,
    firstFlight: '1996-02-15',
    lastFlight: null,
    description: 'China\'s primary GTO launch vehicle, used extensively for BeiDou navigation satellite deployment. Features four strap-on liquid boosters and a cryogenic third stage.',
  },
  {
    id: 'ceres-1',
    name: 'Ceres-1',
    manufacturer: 'Galactic Energy',
    country: 'China',
    status: 'Operational',
    heightM: 20,
    diameterM: 1.4,
    massKg: 33000,
    payloadLeoKg: 400,
    payloadGtoKg: null,
    payloadSsoKg: 230,
    payloadTliKg: null,
    costMillions: 5,
    costPerKgLeo: 12500,
    totalLaunches: 15,
    successes: 13,
    failures: 2,
    partialFailures: 0,
    successRate: 86.7,
    consecutiveSuccesses: 7,
    reusable: false,
    stages: 4,
    engines: '4x solid stages + liquid kick stage',
    propellant: 'Solid (HTPB) + Liquid kick',
    fairingDiameterM: 1.4,
    firstFlight: '2020-11-07',
    lastFlight: null,
    description: 'China\'s leading commercial small launch vehicle from Galactic Energy. One of the first privately developed Chinese rockets to reach orbit. Provides cost-effective dedicated small-sat access to SSO.',
  },
  {
    id: 'soyuz-2',
    name: 'Soyuz-2.1b',
    manufacturer: 'RKTs Progress',
    country: 'Russia',
    status: 'Operational',
    heightM: 46.3,
    diameterM: 10.3,
    massKg: 312000,
    payloadLeoKg: 8200,
    payloadGtoKg: 3250,
    payloadSsoKg: 4850,
    payloadTliKg: null,
    costMillions: 48,
    costPerKgLeo: 5854,
    totalLaunches: 68,
    successes: 66,
    failures: 2,
    partialFailures: 0,
    successRate: 97.1,
    consecutiveSuccesses: 42,
    reusable: false,
    stages: 3,
    engines: '4x RD-107A + 1x RD-108A + 1x RD-0124',
    propellant: 'RP-1 / LOX',
    fairingDiameterM: 4.11,
    firstFlight: '2006-12-27',
    lastFlight: null,
    description: 'The modern variant of the legendary R-7 derived Soyuz family, the most launched rocket design in history. Used for ISS crew transport (with Soyuz-2.1a for crewed flights), Glonass navigation, and commercial payloads.',
  },
  {
    id: 'proton-m',
    name: 'Proton-M',
    manufacturer: 'Khrunichev',
    country: 'Russia',
    status: 'Operational',
    heightM: 58.2,
    diameterM: 7.4,
    massKg: 705000,
    payloadLeoKg: 23700,
    payloadGtoKg: 6920,
    payloadSsoKg: null,
    payloadTliKg: null,
    costMillions: 65,
    costPerKgLeo: 2743,
    totalLaunches: 114,
    successes: 103,
    failures: 10,
    partialFailures: 1,
    successRate: 90.4,
    consecutiveSuccesses: 14,
    reusable: false,
    stages: 4,
    engines: '6x RD-275M + 3x RD-0210/0211 + 1x RD-0212 + various upper stages',
    propellant: 'UDMH / N2O4',
    fairingDiameterM: 5,
    firstFlight: '2001-04-07',
    lastFlight: null,
    description: 'Russia\'s heavy-lift workhorse used primarily for GTO communications satellites and interplanetary missions. Uses hypergolic propellants throughout. Being phased out in favor of the Angara A5.',
  },
  {
    id: 'angara-a5',
    name: 'Angara A5',
    manufacturer: 'Khrunichev',
    country: 'Russia',
    status: 'Operational',
    heightM: 64,
    diameterM: 8.86,
    massKg: 773000,
    payloadLeoKg: 24500,
    payloadGtoKg: 5400,
    payloadSsoKg: null,
    payloadTliKg: null,
    costMillions: 100,
    costPerKgLeo: 4082,
    totalLaunches: 4,
    successes: 4,
    failures: 0,
    partialFailures: 0,
    successRate: 100,
    consecutiveSuccesses: 4,
    reusable: false,
    stages: 3,
    engines: '5x RD-191 (URM) + 1x RD-0124A + upper stages',
    propellant: 'RP-1 / LOX + LH2/LOX (upper)',
    fairingDiameterM: 5.1,
    firstFlight: '2014-12-23',
    lastFlight: null,
    description: 'Russia\'s new modular heavy-lift vehicle intended to replace the Proton-M. Built from Universal Rocket Modules (URMs). Unlike Proton, uses environmentally cleaner RP-1/LOX propellant. Launching from Vostochny Cosmodrome.',
  },
  {
    id: 'firefly-alpha',
    name: 'Firefly Alpha',
    manufacturer: 'Firefly Aerospace',
    country: 'United States',
    status: 'Operational',
    heightM: 29,
    diameterM: 1.82,
    massKg: 54000,
    payloadLeoKg: 1030,
    payloadGtoKg: null,
    payloadSsoKg: 630,
    payloadTliKg: null,
    costMillions: 15,
    costPerKgLeo: 14563,
    totalLaunches: 7,
    successes: 5,
    failures: 1,
    partialFailures: 1,
    successRate: 71.4,
    consecutiveSuccesses: 4,
    reusable: false,
    stages: 2,
    engines: '4x Reaver 1 + 1x Lightning 1',
    propellant: 'RP-1 / LOX',
    fairingDiameterM: 2,
    firstFlight: '2021-09-02',
    lastFlight: null,
    description: 'A small launch vehicle designed for dedicated small satellite missions. Uses tap-off cycle engines with carbon fiber composite structures. Also developing the medium-lift MLV in partnership with Northrop Grumman.',
  },
  {
    id: 'terran-r',
    name: 'Terran R',
    manufacturer: 'Relativity Space',
    country: 'United States',
    status: 'In Development',
    heightM: 66,
    diameterM: 5,
    massKg: 290000,
    payloadLeoKg: 20000,
    payloadGtoKg: 5000,
    payloadSsoKg: null,
    payloadTliKg: null,
    costMillions: null,
    costPerKgLeo: null,
    totalLaunches: 0,
    successes: 0,
    failures: 0,
    partialFailures: 0,
    successRate: 0,
    consecutiveSuccesses: 0,
    reusable: true,
    stages: 2,
    engines: '7x Aeon R (1st) + 1x Aeon Vac (2nd)',
    propellant: 'CH4 / LOX (Methalox)',
    fairingDiameterM: 5,
    firstFlight: '2026 (target)',
    lastFlight: null,
    description: 'A medium-to-heavy lift reusable launch vehicle incorporating 3D-printed manufacturing. Following the retirement of Terran 1 after its test flight, Relativity shifted focus entirely to Terran R for the medium-lift reusable market.',
  },
  {
    id: 'epsilon-s',
    name: 'Epsilon S',
    manufacturer: 'IHI Aerospace / JAXA',
    country: 'Japan',
    status: 'In Development',
    heightM: 27.5,
    diameterM: 2.6,
    massKg: 96000,
    payloadLeoKg: 1500,
    payloadGtoKg: null,
    payloadSsoKg: 600,
    payloadTliKg: null,
    costMillions: 30,
    costPerKgLeo: 20000,
    totalLaunches: 0,
    successes: 0,
    failures: 0,
    partialFailures: 0,
    successRate: 0,
    consecutiveSuccesses: 0,
    reusable: false,
    stages: 3,
    engines: 'SRB-3 + M-35 + KM-V2c',
    propellant: 'Solid (HTPB composite)',
    fairingDiameterM: 2.6,
    firstFlight: '2024 (engine test failure, delayed)',
    lastFlight: null,
    description: 'Japan\'s upgraded solid-fuel small satellite launcher, enhanced from the Epsilon series. Shares the SRB-3 booster with H3. Development delayed by a third-stage static fire test failure in 2023.',
  },
  {
    id: 'long-march-6a',
    name: 'Long March 6A',
    manufacturer: 'SAST / CASC',
    country: 'China',
    status: 'Operational',
    heightM: 50,
    diameterM: 3.35,
    massKg: 530000,
    payloadLeoKg: 7000,
    payloadGtoKg: null,
    payloadSsoKg: 4000,
    payloadTliKg: null,
    costMillions: 35,
    costPerKgLeo: 5000,
    totalLaunches: 3,
    successes: 3,
    failures: 0,
    partialFailures: 0,
    successRate: 100,
    consecutiveSuccesses: 3,
    reusable: false,
    stages: 2,
    engines: '1x YF-100K + 4x solid boosters + 1x YF-115',
    propellant: 'RP-1 / LOX + HTPB (SRBs)',
    fairingDiameterM: 4.2,
    firstFlight: '2022-03-29',
    lastFlight: null,
    description: 'China\'s newest medium-lift hybrid vehicle combining liquid core stage with solid strap-on boosters. Designed for SSO constellation deployment with high launch cadence.',
  },
];

// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────

function formatNumber(n: number | null): string {
  if (n === null) return '--';
  return n.toLocaleString();
}

function formatCost(millions: number | null): string {
  if (millions === null) return 'TBD';
  if (millions >= 1000) return `$${(millions / 1000).toFixed(1)}B`;
  return `$${millions}M`;
}

function formatCostPerKg(val: number | null): string {
  if (val === null) return 'TBD';
  return `$${val.toLocaleString()}/kg`;
}

function getStatusColor(status: VehicleStatus): { bg: string; text: string; border: string } {
  switch (status) {
    case 'Operational':
      return { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-500/30' };
    case 'In Development':
      return { bg: 'bg-cyan-900/30', text: 'text-cyan-400', border: 'border-cyan-500/30' };
    case 'Retired':
      return { bg: 'bg-gray-800/30', text: 'text-gray-400', border: 'border-gray-500/30' };
  }
}

function getReliabilityColor(rate: number): string {
  if (rate >= 97) return 'text-green-400';
  if (rate >= 90) return 'text-yellow-400';
  if (rate >= 75) return 'text-orange-400';
  return 'text-red-400';
}

function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    'United States': 'US',
    'France / ESA': 'EU',
    'Italy / ESA': 'EU',
    'Japan': 'JP',
    'India': 'IN',
    'China': 'CN',
    'Russia': 'RU',
  };
  return flags[country] || country.slice(0, 2).toUpperCase();
}

// ────────────────────────────────────────
// Vehicle Card Component
// ────────────────────────────────────────

function VehicleCard({ vehicle, onSelect, isSelected }: { vehicle: LaunchVehicle; onSelect?: (v: LaunchVehicle) => void; isSelected?: boolean }) {
  const statusStyle = getStatusColor(vehicle.status);

  return (
    <div
      className={`card p-5 transition-all cursor-default ${
        isSelected ? 'ring-2 ring-cyan-500 border-cyan-500/50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-white truncate">{vehicle.name}</h3>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-star-300">{vehicle.manufacturer}</span>
            <span className="text-star-300/30">|</span>
            <span className="text-star-300 text-xs font-mono">{getCountryFlag(vehicle.country)}</span>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border} whitespace-nowrap`}>
          {vehicle.status}
        </span>
      </div>

      {/* Key Specs Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
        <div>
          <span className="text-star-300 text-xs block">Payload LEO</span>
          <span className="text-white font-semibold">{formatNumber(vehicle.payloadLeoKg)} kg</span>
        </div>
        <div>
          <span className="text-star-300 text-xs block">Payload GTO</span>
          <span className="text-white font-semibold">{vehicle.payloadGtoKg ? `${formatNumber(vehicle.payloadGtoKg)} kg` : '--'}</span>
        </div>
        <div>
          <span className="text-star-300 text-xs block">Height</span>
          <span className="text-white font-semibold">{vehicle.heightM} m</span>
        </div>
        <div>
          <span className="text-star-300 text-xs block">Cost</span>
          <span className="text-white font-semibold">{formatCost(vehicle.costMillions)}</span>
        </div>
      </div>

      {/* Reliability Bar */}
      {vehicle.totalLaunches > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-star-300 text-xs">Reliability</span>
            <span className={`text-xs font-bold ${getReliabilityColor(vehicle.successRate)}`}>
              {vehicle.successRate.toFixed(1)}% ({vehicle.successes}/{vehicle.totalLaunches})
            </span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                vehicle.successRate >= 97 ? 'bg-green-500' :
                vehicle.successRate >= 90 ? 'bg-yellow-500' :
                vehicle.successRate >= 75 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${vehicle.successRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {vehicle.reusable && (
          <span className="px-2 py-0.5 rounded text-xs bg-cyan-900/30 text-cyan-400 border border-cyan-500/30">
            Reusable
          </span>
        )}
        <span className="px-2 py-0.5 rounded text-xs bg-slate-700/50 text-star-300 border border-slate-600/30">
          {vehicle.stages}-Stage
        </span>
        <span className="px-2 py-0.5 rounded text-xs bg-slate-700/50 text-star-300 border border-slate-600/30">
          {vehicle.propellant.split(' / ')[0].split(' ')[0]}
        </span>
      </div>

      <p className="text-star-300 text-xs leading-relaxed line-clamp-2 mb-3">{vehicle.description}</p>

      {onSelect && (
        <button
          onClick={() => onSelect(vehicle)}
          className={`w-full py-1.5 rounded text-xs font-medium transition-all ${
            isSelected
              ? 'bg-cyan-500 text-slate-900'
              : 'bg-slate-700 text-star-300 hover:bg-slate-600 hover:text-white'
          }`}
        >
          {isSelected ? 'Selected for Comparison' : 'Add to Comparison'}
        </button>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Content
// ────────────────────────────────────────

export default function LaunchVehiclesPage() {
  const [activeTab, setActiveTab] = useState<TabId>('database');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | ''>('');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('payloadLeo');
  const [compareSelection, setCompareSelection] = useState<string[]>([]);

  // Derived data
  const countries = useMemo(() => Array.from(new Set(VEHICLES.map(v => v.country))).sort(), []);
  const manufacturers = useMemo(() => Array.from(new Set(VEHICLES.map(v => v.manufacturer))).sort(), []);

  const filteredVehicles = useMemo(() => {
    let result = [...VEHICLES];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.manufacturer.toLowerCase().includes(q) ||
        v.country.toLowerCase().includes(q) ||
        v.propellant.toLowerCase().includes(q)
      );
    }

    if (statusFilter) {
      result = result.filter(v => v.status === statusFilter);
    }

    if (countryFilter) {
      result = result.filter(v => v.country === countryFilter);
    }

    // Sort
    switch (sortBy) {
      case 'payloadLeo':
        result.sort((a, b) => b.payloadLeoKg - a.payloadLeoKg);
        break;
      case 'payloadGto':
        result.sort((a, b) => (b.payloadGtoKg ?? 0) - (a.payloadGtoKg ?? 0));
        break;
      case 'cost':
        result.sort((a, b) => (a.costMillions ?? Infinity) - (b.costMillions ?? Infinity));
        break;
      case 'costPerKg':
        result.sort((a, b) => (a.costPerKgLeo ?? Infinity) - (b.costPerKgLeo ?? Infinity));
        break;
      case 'reliability':
        result.sort((a, b) => b.successRate - a.successRate);
        break;
      case 'launches':
        result.sort((a, b) => b.totalLaunches - a.totalLaunches);
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [searchQuery, statusFilter, countryFilter, sortBy]);

  const selectedVehicles = useMemo(
    () => VEHICLES.filter(v => compareSelection.includes(v.id)),
    [compareSelection]
  );

  const toggleCompare = (vehicle: LaunchVehicle) => {
    setCompareSelection(prev => {
      if (prev.includes(vehicle.id)) {
        return prev.filter(id => id !== vehicle.id);
      }
      if (prev.length >= 4) return prev;
      return [...prev, vehicle.id];
    });
  };

  // Reliability-sorted vehicles
  const reliabilityRanked = useMemo(() => {
    return [...VEHICLES]
      .filter(v => v.totalLaunches > 0)
      .sort((a, b) => {
        if (b.successRate !== a.successRate) return b.successRate - a.successRate;
        return b.totalLaunches - a.totalLaunches;
      });
  }, []);

  // Cost-sorted vehicles
  const costRanked = useMemo(() => {
    return [...VEHICLES]
      .filter(v => v.costPerKgLeo !== null)
      .sort((a, b) => (a.costPerKgLeo ?? Infinity) - (b.costPerKgLeo ?? Infinity));
  }, []);

  // Stats
  const totalOperational = VEHICLES.filter(v => v.status === 'Operational').length;
  const totalInDev = VEHICLES.filter(v => v.status === 'In Development').length;
  const totalLaunchesAll = VEHICLES.reduce((sum, v) => sum + v.totalLaunches, 0);
  const avgSuccessRate = VEHICLES.filter(v => v.totalLaunches > 0).reduce((sum, v) => sum + v.successRate, 0) / VEHICLES.filter(v => v.totalLaunches > 0).length;

  const TABS: { id: TabId; label: string }[] = [
    { id: 'database', label: 'Vehicle Database' },
    { id: 'compare', label: 'Compare' },
    { id: 'reliability', label: 'Reliability' },
    { id: 'cost', label: 'Cost Analysis' },
  ];

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <PageHeader
          title="Launch Vehicle Comparison"
          subtitle="Comprehensive database of active, in-development, and retired orbital launch vehicles worldwide with real specifications, reliability data, and cost analysis"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Launch Vehicles' }]}
        />

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card-elevated p-4 text-center">
            <div className="text-2xl font-bold font-display text-white">{VEHICLES.length}</div>
            <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Vehicles Tracked</div>
          </div>
          <div className="card-elevated p-4 text-center">
            <div className="text-2xl font-bold font-display text-green-400">{totalOperational}</div>
            <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Operational</div>
          </div>
          <div className="card-elevated p-4 text-center">
            <div className="text-2xl font-bold font-display text-cyan-400">{totalInDev}</div>
            <div className="text-star-300 text-xs uppercase tracking-widest font-medium">In Development</div>
          </div>
          <div className="card-elevated p-4 text-center">
            <div className="text-2xl font-bold font-display text-white">{totalLaunchesAll.toLocaleString()}</div>
            <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Total Launches</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-nebula-500 text-slate-900 shadow-glow-sm'
                  : 'bg-slate-800/50 text-star-300 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              {tab.label}
              {tab.id === 'compare' && compareSelection.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-slate-200 text-slate-900' : 'bg-cyan-500/30 text-cyan-400'
                }`}>
                  {compareSelection.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ──────────────── VEHICLE DATABASE TAB ──────────────── */}
        {activeTab === 'database' && (
          <div>
            {/* Filters */}
            <div className="card p-4 mb-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Search by name, manufacturer, country, or propellant..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-star-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-star-300 text-sm">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as VehicleStatus | '')}
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">All</option>
                    <option value="Operational">Operational</option>
                    <option value="In Development">In Development</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-star-300 text-sm">Country:</span>
                  <select
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">All</option>
                    {countries.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-star-300 text-sm">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="payloadLeo">Payload LEO</option>
                    <option value="payloadGto">Payload GTO</option>
                    <option value="cost">Cost (Low to High)</option>
                    <option value="costPerKg">Cost/kg (Low to High)</option>
                    <option value="reliability">Reliability</option>
                    <option value="launches">Total Launches</option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-4 text-star-300 text-sm">
              Showing {filteredVehicles.length} of {VEHICLES.length} launch vehicles
              {(searchQuery || statusFilter || countryFilter) && (
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter(''); setCountryFilter(''); }}
                  className="ml-2 text-cyan-400 hover:text-cyan-300"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Vehicle Grid */}
            {filteredVehicles.length === 0 ? (
              <div className="text-center py-16">
                <h3 className="text-xl font-semibold text-white mb-2">No Vehicles Found</h3>
                <p className="text-star-300">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredVehicles.map(v => (
                  <VehicleCard
                    key={v.id}
                    vehicle={v}
                    onSelect={toggleCompare}
                    isSelected={compareSelection.includes(v.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ──────────────── COMPARE TAB ──────────────── */}
        {activeTab === 'compare' && (
          <div>
            {/* Vehicle Selection */}
            <div className="card p-5 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Select Vehicles to Compare (2-4)</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {VEHICLES.map(v => (
                  <button
                    key={v.id}
                    onClick={() => toggleCompare(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      compareSelection.includes(v.id)
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                        : 'bg-slate-800 text-star-300 border-slate-700 hover:border-slate-500'
                    } ${compareSelection.length >= 4 && !compareSelection.includes(v.id) ? 'opacity-40 cursor-not-allowed' : ''}`}
                    disabled={compareSelection.length >= 4 && !compareSelection.includes(v.id)}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
              {compareSelection.length > 0 && (
                <button
                  onClick={() => setCompareSelection([])}
                  className="text-xs text-star-300 hover:text-white transition-colors"
                >
                  Clear selection
                </button>
              )}
            </div>

            {selectedVehicles.length < 2 ? (
              <div className="text-center py-16 card">
                <div className="text-5xl mb-4">&#128640;</div>
                <h3 className="text-xl font-semibold text-white mb-2">Select at Least 2 Vehicles</h3>
                <p className="text-star-300">
                  Choose 2 to 4 vehicles above to compare them side by side.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-star-300 font-medium text-xs uppercase tracking-widest sticky left-0 bg-slate-900 z-10 min-w-[160px]">Specification</th>
                      {selectedVehicles.map(v => (
                        <th key={v.id} className="text-center py-3 px-4 min-w-[180px]">
                          <div className="text-white font-bold">{v.name}</div>
                          <div className="text-star-300 text-xs">{v.manufacturer}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {/* General */}
                    <tr className="bg-slate-800/30">
                      <td colSpan={selectedVehicles.length + 1} className="py-2 px-4 text-xs font-bold text-cyan-400 uppercase tracking-widest">General</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-slate-900">Status</td>
                      {selectedVehicles.map(v => {
                        const s = getStatusColor(v.status);
                        return <td key={v.id} className="py-2 px-4 text-center"><span className={`px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}`}>{v.status}</span></td>;
                      })}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-slate-900">Country</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{v.country}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-slate-900">First Flight</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{v.firstFlight}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-slate-900">Reusable</td>
                      {selectedVehicles.map(v => <td key={v.id} className={`py-2 px-4 text-center font-medium ${v.reusable ? 'text-green-400' : 'text-star-300'}`}>{v.reusable ? 'Yes' : 'No'}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-slate-900">Stages</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{v.stages}</td>)}
                    </tr>

                    {/* Dimensions */}
                    <tr className="bg-slate-800/30">
                      <td colSpan={selectedVehicles.length + 1} className="py-2 px-4 text-xs font-bold text-cyan-400 uppercase tracking-widest">Dimensions</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-slate-900">Height</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{v.heightM} m</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-slate-900">Diameter</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{v.diameterM} m</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-slate-900">Launch Mass</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{(v.massKg / 1000).toLocaleString()} t</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-slate-900">Fairing Diameter</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{v.fairingDiameterM} m</td>)}
                    </tr>

                    {/* Payload */}
                    <tr className="bg-slate-800/30">
                      <td colSpan={selectedVehicles.length + 1} className="py-2 px-4 text-xs font-bold text-cyan-400 uppercase tracking-widest">Payload Capacity</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-slate-900">LEO</td>
                      {selectedVehicles.map(v => {
                        const max = Math.max(...selectedVehicles.map(sv => sv.payloadLeoKg));
                        return <td key={v.id} className={`py-2 px-4 text-center font-semibold ${v.payloadLeoKg === max ? 'text-cyan-400' : 'text-white'}`}>{formatNumber(v.payloadLeoKg)} kg</td>;
                      })}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-slate-900">GTO</td>
                      {selectedVehicles.map(v => {
                        const max = Math.max(...selectedVehicles.map(sv => sv.payloadGtoKg ?? 0));
                        return <td key={v.id} className={`py-2 px-4 text-center font-semibold ${v.payloadGtoKg === max && max > 0 ? 'text-cyan-400' : 'text-white'}`}>{v.payloadGtoKg ? `${formatNumber(v.payloadGtoKg)} kg` : '--'}</td>;
                      })}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-slate-900">SSO</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{v.payloadSsoKg ? `${formatNumber(v.payloadSsoKg)} kg` : '--'}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-slate-900">TLI</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{v.payloadTliKg ? `${formatNumber(v.payloadTliKg)} kg` : '--'}</td>)}
                    </tr>

                    {/* Propulsion */}
                    <tr className="bg-slate-800/30">
                      <td colSpan={selectedVehicles.length + 1} className="py-2 px-4 text-xs font-bold text-cyan-400 uppercase tracking-widest">Propulsion</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-slate-900">Engines</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white text-xs">{v.engines}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-slate-900">Propellant</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white text-xs">{v.propellant}</td>)}
                    </tr>

                    {/* Cost */}
                    <tr className="bg-slate-800/30">
                      <td colSpan={selectedVehicles.length + 1} className="py-2 px-4 text-xs font-bold text-cyan-400 uppercase tracking-widest">Cost</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-slate-900">Launch Price</td>
                      {selectedVehicles.map(v => {
                        const min = Math.min(...selectedVehicles.filter(sv => sv.costMillions !== null).map(sv => sv.costMillions!));
                        return <td key={v.id} className={`py-2 px-4 text-center font-semibold ${v.costMillions === min ? 'text-green-400' : 'text-white'}`}>{formatCost(v.costMillions)}</td>;
                      })}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-slate-900">Cost per kg LEO</td>
                      {selectedVehicles.map(v => {
                        const costs = selectedVehicles.filter(sv => sv.costPerKgLeo !== null).map(sv => sv.costPerKgLeo!);
                        const min = costs.length > 0 ? Math.min(...costs) : 0;
                        return <td key={v.id} className={`py-2 px-4 text-center font-semibold ${v.costPerKgLeo === min && min > 0 ? 'text-green-400' : 'text-white'}`}>{formatCostPerKg(v.costPerKgLeo)}</td>;
                      })}
                    </tr>

                    {/* Reliability */}
                    <tr className="bg-slate-800/30">
                      <td colSpan={selectedVehicles.length + 1} className="py-2 px-4 text-xs font-bold text-cyan-400 uppercase tracking-widest">Reliability</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-slate-900">Total Launches</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white font-semibold">{v.totalLaunches}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-slate-900">Success Rate</td>
                      {selectedVehicles.map(v => <td key={v.id} className={`py-2 px-4 text-center font-bold ${v.totalLaunches > 0 ? getReliabilityColor(v.successRate) : 'text-star-300'}`}>{v.totalLaunches > 0 ? `${v.successRate.toFixed(1)}%` : 'N/A'}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-slate-900">Consecutive Successes</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{v.consecutiveSuccesses}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-slate-900">Cadence (launches)</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{v.totalLaunches > 0 ? v.totalLaunches : '--'}</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ──────────────── RELIABILITY TAB ──────────────── */}
        {activeTab === 'reliability' && (
          <div className="space-y-6">
            {/* Overall Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-4 text-center">
                <div className={`text-2xl font-bold font-display ${getReliabilityColor(avgSuccessRate)}`}>
                  {avgSuccessRate.toFixed(1)}%
                </div>
                <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Avg Success Rate</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold font-display text-white">
                  {totalLaunchesAll.toLocaleString()}
                </div>
                <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Total Launches</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold font-display text-green-400">
                  {VEHICLES.reduce((sum, v) => sum + v.successes, 0).toLocaleString()}
                </div>
                <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Total Successes</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold font-display text-red-400">
                  {VEHICLES.reduce((sum, v) => sum + v.failures, 0)}
                </div>
                <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Total Failures</div>
              </div>
            </div>

            {/* Reliability Ranking */}
            <div className="card p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Reliability Ranking</h3>
              <p className="text-star-300 text-sm mb-6">Ranked by success rate, then total launches. Only vehicles with flight history are shown.</p>

              <div className="space-y-3">
                {reliabilityRanked.map((v, idx) => (
                  <div key={v.id} className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-8 text-center">
                      <span className={`text-sm font-bold ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-star-300'}`}>
                        #{idx + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-white font-medium text-sm truncate">{v.name}</span>
                          <span className="text-star-300 text-xs hidden sm:inline">({v.manufacturer})</span>
                          {v.reusable && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 hidden md:inline">
                              Reusable
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                          <span className={`text-sm font-bold ${getReliabilityColor(v.successRate)}`}>
                            {v.successRate.toFixed(1)}%
                          </span>
                          <span className="text-star-300 text-xs whitespace-nowrap">
                            {v.successes}/{v.totalLaunches}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            v.successRate >= 97 ? 'bg-gradient-to-r from-green-600 to-green-400' :
                            v.successRate >= 90 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
                            v.successRate >= 75 ? 'bg-gradient-to-r from-orange-600 to-orange-400' :
                            'bg-gradient-to-r from-red-600 to-red-400'
                          }`}
                          style={{ width: `${v.successRate}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-star-300">
                        <span>Failures: {v.failures}</span>
                        <span>Partial: {v.partialFailures}</span>
                        <span>Streak: {v.consecutiveSuccesses} consecutive</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Consecutive Successes Chart */}
            <div className="card p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Consecutive Success Streaks</h3>
              <p className="text-star-300 text-sm mb-6">Current consecutive successful missions without a failure.</p>
              <div className="space-y-3">
                {[...reliabilityRanked]
                  .sort((a, b) => b.consecutiveSuccesses - a.consecutiveSuccesses)
                  .filter(v => v.consecutiveSuccesses > 0)
                  .map(v => {
                    const maxStreak = Math.max(...reliabilityRanked.map(rv => rv.consecutiveSuccesses));
                    const pct = maxStreak > 0 ? (v.consecutiveSuccesses / maxStreak) * 100 : 0;
                    return (
                      <div key={v.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white text-sm font-medium">{v.name}</span>
                          <span className="text-cyan-400 text-sm font-bold">{v.consecutiveSuccesses}</span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Data Sources */}
            <div className="card p-5 border-dashed border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-3">Data Sources</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-star-300">
                <div>
                  <h4 className="text-white font-medium mb-2">Launch Records</h4>
                  <ul className="space-y-1">
                    <li>Jonathan McDowell's Launch Log</li>
                    <li>Space Launch Report</li>
                    <li>Gunter's Space Page</li>
                    <li>Next Spaceflight</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Manufacturer Data</h4>
                  <ul className="space-y-1">
                    <li>SpaceX Capabilities & Services</li>
                    <li>ULA Payload Planner's Guide</li>
                    <li>Arianespace User's Manual</li>
                    <li>ISRO Official Launch Records</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────── COST ANALYSIS TAB ──────────────── */}
        {activeTab === 'cost' && (
          <div className="space-y-6">
            {/* Cost Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold font-display text-green-400">
                  {formatCostPerKg(costRanked[0]?.costPerKgLeo ?? null)}
                </div>
                <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Lowest $/kg LEO</div>
                <div className="text-star-300 text-[10px] mt-0.5">{costRanked[0]?.name}</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold font-display text-white">
                  {formatCost(costRanked.find(v => v.id === 'falcon-9')?.costMillions ?? null)}
                </div>
                <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Market Leader</div>
                <div className="text-star-300 text-[10px] mt-0.5">Falcon 9</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold font-display text-cyan-400">
                  {VEHICLES.filter(v => v.reusable).length}
                </div>
                <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Reusable Vehicles</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold font-display text-white">
                  {formatCost(costRanked.length > 0 ? costRanked[costRanked.length - 1].costMillions : null)}
                </div>
                <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Most Expensive</div>
                <div className="text-star-300 text-[10px] mt-0.5">{costRanked.length > 0 ? costRanked[costRanked.length - 1].name : '--'}</div>
              </div>
            </div>

            {/* Cost per kg to LEO Ranking */}
            <div className="card p-5">
              <h3 className="text-lg font-semibold text-white mb-2">Cost per Kilogram to LEO</h3>
              <p className="text-star-300 text-sm mb-6">Published or estimated launch cost divided by maximum LEO payload capacity. Lower is better. Reusable vehicles shown with cyan accent.</p>
              <div className="space-y-4">
                {costRanked.map((v, idx) => {
                  const maxCost = costRanked[costRanked.length - 1]?.costPerKgLeo ?? 1;
                  const pct = maxCost > 0 ? ((v.costPerKgLeo ?? 0) / maxCost) * 100 : 0;
                  return (
                    <div key={v.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold w-6 ${idx === 0 ? 'text-green-400' : 'text-star-300'}`}>#{idx + 1}</span>
                          <span className="text-white font-medium text-sm">{v.name}</span>
                          <span className="text-star-300 text-xs">({v.manufacturer})</span>
                          {v.reusable && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-900/30 text-cyan-400 border border-cyan-500/30">
                              Reusable
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                          <span className={`text-sm font-bold ${idx === 0 ? 'text-green-400' : idx < 3 ? 'text-cyan-400' : 'text-white'}`}>
                            {formatCostPerKg(v.costPerKgLeo)}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            v.reusable ? 'bg-gradient-to-r from-cyan-600 to-cyan-400' : 'bg-gradient-to-r from-slate-500 to-slate-400'
                          }`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-star-300">
                        <span>Launch price: {formatCost(v.costMillions)}</span>
                        <span>Payload LEO: {formatNumber(v.payloadLeoKg)} kg</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Published Launch Prices */}
            <div className="card p-5">
              <h3 className="text-lg font-semibold text-white mb-2">Published Launch Prices</h3>
              <p className="text-star-300 text-sm mb-6">Advertised or estimated per-launch pricing. Actual prices vary by mission profile, orbit, and contract terms.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-widest">Vehicle</th>
                      <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-widest">Manufacturer</th>
                      <th className="text-right py-2 px-3 text-star-300 text-xs uppercase tracking-widest">Price</th>
                      <th className="text-right py-2 px-3 text-star-300 text-xs uppercase tracking-widest">$/kg LEO</th>
                      <th className="text-right py-2 px-3 text-star-300 text-xs uppercase tracking-widest">LEO Capacity</th>
                      <th className="text-center py-2 px-3 text-star-300 text-xs uppercase tracking-widest">Reusable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {[...VEHICLES]
                      .filter(v => v.costMillions !== null)
                      .sort((a, b) => (a.costMillions ?? 0) - (b.costMillions ?? 0))
                      .map(v => (
                        <tr key={v.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="py-2.5 px-3 text-white font-medium">{v.name}</td>
                          <td className="py-2.5 px-3 text-star-300">{v.manufacturer}</td>
                          <td className="py-2.5 px-3 text-right text-white font-semibold">{formatCost(v.costMillions)}</td>
                          <td className="py-2.5 px-3 text-right text-cyan-400 font-semibold">{formatCostPerKg(v.costPerKgLeo)}</td>
                          <td className="py-2.5 px-3 text-right text-white">{formatNumber(v.payloadLeoKg)} kg</td>
                          <td className="py-2.5 px-3 text-center">
                            {v.reusable ? (
                              <span className="text-green-400 font-medium">Yes</span>
                            ) : (
                              <span className="text-star-300">No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reusability Impact */}
            <div className="card p-5 border border-cyan-500/20 bg-gradient-to-br from-cyan-900/10 to-transparent">
              <h3 className="text-lg font-semibold text-white mb-3">Reusability Impact on Pricing</h3>
              <p className="text-star-300 text-sm mb-4">Reusable vehicles demonstrate significantly lower cost per kilogram compared to expendable counterparts.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-cyan-400 font-medium text-sm mb-3 uppercase tracking-widest">Reusable Vehicles</h4>
                  <div className="space-y-3">
                    {VEHICLES.filter(v => v.reusable && v.costPerKgLeo !== null).sort((a, b) => (a.costPerKgLeo ?? 0) - (b.costPerKgLeo ?? 0)).map(v => (
                      <div key={v.id} className="flex items-center justify-between">
                        <div>
                          <span className="text-white text-sm font-medium">{v.name}</span>
                          <span className="text-star-300 text-xs ml-2">{v.manufacturer}</span>
                        </div>
                        <span className="text-cyan-400 font-bold text-sm">{formatCostPerKg(v.costPerKgLeo)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-star-300 text-sm">Average $/kg</span>
                        <span className="text-cyan-400 font-bold text-sm">
                          ${Math.round(
                            VEHICLES.filter(v => v.reusable && v.costPerKgLeo !== null).reduce((sum, v) => sum + (v.costPerKgLeo ?? 0), 0)
                            / VEHICLES.filter(v => v.reusable && v.costPerKgLeo !== null).length
                          ).toLocaleString()}/kg
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-star-300 font-medium text-sm mb-3 uppercase tracking-widest">Expendable Vehicles</h4>
                  <div className="space-y-3">
                    {VEHICLES.filter(v => !v.reusable && v.costPerKgLeo !== null).sort((a, b) => (a.costPerKgLeo ?? 0) - (b.costPerKgLeo ?? 0)).map(v => (
                      <div key={v.id} className="flex items-center justify-between">
                        <div>
                          <span className="text-white text-sm font-medium">{v.name}</span>
                          <span className="text-star-300 text-xs ml-2">{v.manufacturer}</span>
                        </div>
                        <span className="text-white font-bold text-sm">{formatCostPerKg(v.costPerKgLeo)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-star-300 text-sm">Average $/kg</span>
                        <span className="text-white font-bold text-sm">
                          ${Math.round(
                            VEHICLES.filter(v => !v.reusable && v.costPerKgLeo !== null).reduce((sum, v) => sum + (v.costPerKgLeo ?? 0), 0)
                            / VEHICLES.filter(v => !v.reusable && v.costPerKgLeo !== null).length
                          ).toLocaleString()}/kg
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cost Trends Note */}
            <div className="card p-5 border-dashed border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-3">Notes on Pricing</h3>
              <div className="text-sm text-star-300 space-y-2">
                <p>Published prices are approximate and may not reflect actual contract values. Government, military, and rideshare pricing differs significantly from commercial list prices.</p>
                <p>SpaceX Starship targets a cost per launch under $10M with full reusability, which would represent a 10-100x reduction in cost per kilogram compared to all other vehicles. This target has not yet been demonstrated commercially.</p>
                <p>Rideshare services (e.g., SpaceX Transporter missions) can reduce effective cost per kg by 50-80% for small payloads willing to share a launch with other customers.</p>
                <p>Chinese commercial launchers like Ceres-1 offer competitive pricing but are subject to export control restrictions that limit their addressable market.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
