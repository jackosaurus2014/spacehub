import prisma from './db';
import {
  MiningBody,
  MiningResource,
  CommodityPrice,
  MiningBodyType,
  SpectralType,
  OrbitalFamily,
  TrajectoryStatus,
  ValueConfidence,
  MiningResourceCategory,
  ExtractionCost,
  CommodityCategory,
  PriceVolatility,
} from '@/types';

// ============================================================
// Seed Data Interfaces
// ============================================================

interface MiningBodySeed {
  slug: string;
  name: string;
  designation?: string;
  bodyType: MiningBodyType;
  spectralType?: SpectralType;
  orbitalFamily?: OrbitalFamily;
  diameter?: number;
  mass?: number;
  density?: number;
  rotationPeriod?: number;
  semiMajorAxis?: number;
  eccentricity?: number;
  inclination?: number;
  perihelion?: number;
  aphelion?: number;
  orbitalPeriod?: number;
  deltaV?: number;
  trajectoryStatus?: TrajectoryStatus;
  missionHistory?: string[];
  estimatedValue?: number;
  valueConfidence?: ValueConfidence;
  composition?: Record<string, number>;
  description?: string;
  imageUrl?: string;
}

interface MiningResourceSeed {
  miningBodySlug: string;
  resourceType: string;
  category: MiningResourceCategory;
  abundancePercent?: number;
  estimatedMass?: number;
  estimatedValue?: number;
  extractionMethod?: string;
  extractionCost?: ExtractionCost;
  notes?: string;
}

interface CommodityPriceSeed {
  slug: string;
  name: string;
  symbol?: string;
  category: CommodityCategory;
  pricePerKg: number;
  pricePerTonne?: number;
  priceUnit?: string;
  priceSource?: string;
  annualProduction?: number;
  marketCap?: number;
  priceVolatility?: PriceVolatility;
  spaceApplications?: string[];
  inSpaceValue?: number;
  description?: string;
}

// ============================================================
// Asteroids Seed Data (30+ asteroids)
// ============================================================
const ASTEROIDS_SEED: MiningBodySeed[] = [
  // M-type (Metallic) Asteroids - Most valuable
  {
    slug: '16-psyche',
    name: '16 Psyche',
    designation: '16 Psyche',
    bodyType: 'asteroid',
    spectralType: 'M',
    orbitalFamily: 'Main Belt',
    diameter: 226,
    mass: 2.72e19,
    density: 3.78,
    rotationPeriod: 4.196,
    semiMajorAxis: 2.921,
    eccentricity: 0.134,
    inclination: 3.095,
    perihelion: 2.53,
    aphelion: 3.31,
    orbitalPeriod: 4.99,
    deltaV: 9.5,
    trajectoryStatus: 'challenging',
    missionHistory: ['NASA Psyche Mission (2023 launch)'],
    estimatedValue: 1e19, // $10 quintillion
    valueConfidence: 'medium',
    composition: { iron: 85, nickel: 10, cobalt: 1.5, gold: 0.001, platinum: 0.01 },
    description: 'Largest M-type asteroid, potentially an exposed planetary core. One of the most massive objects in the asteroid belt. Target of NASA Psyche mission.',
  },
  {
    slug: '1986-da',
    name: '1986 DA',
    designation: '(6178) 1986 DA',
    bodyType: 'asteroid',
    spectralType: 'M',
    orbitalFamily: 'Mars-crosser',
    diameter: 2.3,
    mass: 2e13,
    density: 7.8,
    semiMajorAxis: 2.815,
    eccentricity: 0.584,
    inclination: 4.31,
    deltaV: 6.8,
    trajectoryStatus: 'accessible',
    missionHistory: [],
    estimatedValue: 7e12, // $7 trillion
    valueConfidence: 'medium',
    composition: { iron: 80, nickel: 15, gold: 0.001, platinum: 0.02 },
    description: 'Small but accessible M-type asteroid with significant metal content. Radar observations confirm metallic nature.',
  },
  {
    slug: '3554-amun',
    name: 'Amun',
    designation: '(3554) Amun',
    bodyType: 'asteroid',
    spectralType: 'M',
    orbitalFamily: 'NEA',
    diameter: 2.5,
    mass: 3e13,
    density: 5.0,
    semiMajorAxis: 0.974,
    eccentricity: 0.281,
    inclination: 23.36,
    deltaV: 5.5,
    trajectoryStatus: 'accessible',
    estimatedValue: 8e12,
    valueConfidence: 'medium',
    composition: { iron: 70, nickel: 20, cobalt: 5, platinum: 0.015 },
    description: 'One of the most accessible M-type near-Earth asteroids. Named after Egyptian deity Amun.',
  },
  {
    slug: '6178-1986-da',
    name: '2011 UW158',
    designation: '2011 UW158',
    bodyType: 'asteroid',
    spectralType: 'X',
    orbitalFamily: 'NEA',
    diameter: 0.5,
    mass: 1e11,
    density: 6.0,
    semiMajorAxis: 1.62,
    eccentricity: 0.376,
    inclination: 4.81,
    deltaV: 5.1,
    trajectoryStatus: 'accessible',
    estimatedValue: 5.4e12,
    valueConfidence: 'low',
    composition: { platinum: 0.1, gold: 0.05, iron: 60, nickel: 20 },
    description: 'Small NEA that passed close to Earth in 2015. Potentially platinum-rich core.',
  },

  // C-type (Carbonaceous) Asteroids - Water-rich
  {
    slug: '162173-ryugu',
    name: 'Ryugu',
    designation: '162173 Ryugu',
    bodyType: 'asteroid',
    spectralType: 'C',
    orbitalFamily: 'NEA',
    diameter: 0.9,
    mass: 4.5e11,
    density: 1.19,
    rotationPeriod: 7.63,
    semiMajorAxis: 1.189,
    eccentricity: 0.190,
    inclination: 5.88,
    perihelion: 0.96,
    aphelion: 1.42,
    orbitalPeriod: 1.30,
    deltaV: 4.7,
    trajectoryStatus: 'accessible',
    missionHistory: ['JAXA Hayabusa2 (2014-2020, sample return)'],
    estimatedValue: 8.3e10,
    valueConfidence: 'high',
    composition: { water: 8, carbon: 5, iron: 10, nickel: 1, organics: 3 },
    description: 'Rubble-pile asteroid visited by Hayabusa2. Samples returned to Earth in 2020 revealed abundant water and organic compounds.',
  },
  {
    slug: '101955-bennu',
    name: 'Bennu',
    designation: '101955 Bennu',
    bodyType: 'asteroid',
    spectralType: 'B',
    orbitalFamily: 'NEA',
    diameter: 0.49,
    mass: 7.8e10,
    density: 1.26,
    rotationPeriod: 4.297,
    semiMajorAxis: 1.126,
    eccentricity: 0.204,
    inclination: 6.03,
    perihelion: 0.90,
    aphelion: 1.36,
    orbitalPeriod: 1.20,
    deltaV: 5.1,
    trajectoryStatus: 'accessible',
    missionHistory: ['NASA OSIRIS-REx (2016-2023, sample return)'],
    estimatedValue: 6.5e10,
    valueConfidence: 'high',
    composition: { water: 10, carbon: 6, iron: 8, nickel: 0.5, organics: 4 },
    description: 'Potentially hazardous asteroid visited by OSIRIS-REx. Samples returned in 2023. Rich in water and organics.',
  },
  {
    slug: '1-ceres',
    name: 'Ceres',
    designation: '1 Ceres',
    bodyType: 'dwarf_planet',
    spectralType: 'C',
    orbitalFamily: 'Main Belt',
    diameter: 939,
    mass: 9.39e20,
    density: 2.16,
    rotationPeriod: 9.07,
    semiMajorAxis: 2.768,
    eccentricity: 0.076,
    inclination: 10.59,
    perihelion: 2.56,
    aphelion: 2.98,
    orbitalPeriod: 4.60,
    deltaV: 9.8,
    trajectoryStatus: 'challenging',
    missionHistory: ['NASA Dawn (2015-2018)'],
    estimatedValue: 1e17,
    valueConfidence: 'medium',
    composition: { water: 25, iron: 5, carbon: 10, ammonia: 5, silicates: 40 },
    description: 'Largest object in asteroid belt. Contains significant water ice and may have subsurface ocean. Dawn mission revealed bright spots and cryovolcanism.',
  },
  {
    slug: '4-vesta',
    name: 'Vesta',
    designation: '4 Vesta',
    bodyType: 'asteroid',
    spectralType: 'V',
    orbitalFamily: 'Main Belt',
    diameter: 525,
    mass: 2.59e20,
    density: 3.46,
    rotationPeriod: 5.34,
    semiMajorAxis: 2.362,
    eccentricity: 0.089,
    inclination: 7.14,
    perihelion: 2.15,
    aphelion: 2.57,
    orbitalPeriod: 3.63,
    deltaV: 9.4,
    trajectoryStatus: 'challenging',
    missionHistory: ['NASA Dawn (2011-2012)'],
    estimatedValue: 5e16,
    valueConfidence: 'medium',
    composition: { iron: 25, nickel: 5, magnesium: 15, silicon: 20, pyroxene: 30 },
    description: 'Second largest asteroid. Differentiated body with iron core. Source of HED meteorites. Studied by Dawn mission.',
  },
  {
    slug: '433-eros',
    name: 'Eros',
    designation: '433 Eros',
    bodyType: 'asteroid',
    spectralType: 'S',
    orbitalFamily: 'NEA',
    diameter: 16.84,
    mass: 6.69e15,
    density: 2.67,
    rotationPeriod: 5.27,
    semiMajorAxis: 1.458,
    eccentricity: 0.223,
    inclination: 10.83,
    perihelion: 1.13,
    aphelion: 1.78,
    orbitalPeriod: 1.76,
    deltaV: 5.6,
    trajectoryStatus: 'accessible',
    missionHistory: ['NASA NEAR Shoemaker (1996-2001)'],
    estimatedValue: 1e16,
    valueConfidence: 'high',
    composition: { iron: 20, nickel: 3, silicon: 25, magnesium: 15, aluminum: 5 },
    description: 'First asteroid orbited by a spacecraft (NEAR Shoemaker). S-type with significant metal content. Peanut shape.',
  },
  {
    slug: '25143-itokawa',
    name: 'Itokawa',
    designation: '25143 Itokawa',
    bodyType: 'asteroid',
    spectralType: 'S',
    orbitalFamily: 'NEA',
    diameter: 0.535,
    mass: 3.51e10,
    density: 1.95,
    rotationPeriod: 12.13,
    semiMajorAxis: 1.324,
    eccentricity: 0.280,
    inclination: 1.62,
    perihelion: 0.95,
    aphelion: 1.70,
    orbitalPeriod: 1.52,
    deltaV: 4.6,
    trajectoryStatus: 'accessible',
    missionHistory: ['JAXA Hayabusa (2003-2010, sample return)'],
    estimatedValue: 1e9,
    valueConfidence: 'high',
    composition: { iron: 18, nickel: 2, silicon: 20, magnesium: 15, olivine: 30 },
    description: 'First asteroid from which samples were returned (Hayabusa). Rubble pile with contact binary structure.',
  },
  {
    slug: '99942-apophis',
    name: 'Apophis',
    designation: '99942 Apophis',
    bodyType: 'asteroid',
    spectralType: 'S',
    orbitalFamily: 'NEA',
    diameter: 0.37,
    mass: 6.1e10,
    density: 3.2,
    rotationPeriod: 30.4,
    semiMajorAxis: 0.922,
    eccentricity: 0.191,
    inclination: 3.33,
    perihelion: 0.75,
    aphelion: 1.10,
    orbitalPeriod: 0.89,
    deltaV: 4.8,
    trajectoryStatus: 'accessible',
    missionHistory: ['ESA RAMSES (planned 2029)'],
    estimatedValue: 5e9,
    valueConfidence: 'medium',
    composition: { iron: 15, nickel: 2, silicon: 25, magnesium: 20 },
    description: 'Will pass extremely close to Earth in 2029. Target of ESA RAMSES mission. Named after Egyptian god of chaos.',
  },

  // More NEAs
  {
    slug: '1989-ml',
    name: '1989 ML',
    designation: '(10302) 1989 ML',
    bodyType: 'asteroid',
    spectralType: 'X',
    orbitalFamily: 'NEA',
    diameter: 0.6,
    mass: 2e11,
    density: 2.0,
    semiMajorAxis: 1.272,
    eccentricity: 0.137,
    inclination: 4.38,
    deltaV: 4.4,
    trajectoryStatus: 'accessible',
    estimatedValue: 1.5e10,
    valueConfidence: 'low',
    composition: { iron: 30, nickel: 5, carbon: 10, water: 5 },
    description: 'Highly accessible NEA with low delta-v requirement. Considered prime mining candidate.',
  },
  {
    slug: '2001-cc21',
    name: '2001 CC21',
    designation: '2001 CC21',
    bodyType: 'asteroid',
    spectralType: 'S',
    orbitalFamily: 'NEA',
    diameter: 0.7,
    mass: 3e11,
    density: 2.5,
    semiMajorAxis: 1.034,
    eccentricity: 0.228,
    inclination: 4.53,
    deltaV: 5.2,
    trajectoryStatus: 'accessible',
    estimatedValue: 8e9,
    valueConfidence: 'low',
    composition: { iron: 15, nickel: 2, silicon: 25 },
    description: 'Small S-type NEA with favorable orbital characteristics.',
  },
  {
    slug: '2008-ev5',
    name: '2008 EV5',
    designation: '2008 EV5',
    bodyType: 'asteroid',
    spectralType: 'C',
    orbitalFamily: 'NEA',
    diameter: 0.45,
    mass: 1.5e10,
    density: 1.5,
    semiMajorAxis: 0.958,
    eccentricity: 0.083,
    inclination: 7.44,
    deltaV: 4.5,
    trajectoryStatus: 'accessible',
    estimatedValue: 2e10,
    valueConfidence: 'medium',
    composition: { water: 15, carbon: 8, iron: 5 },
    description: 'Was candidate target for ARM mission. Very low delta-v, water-rich C-type.',
  },
  {
    slug: '2009-fg',
    name: '2009 FG',
    designation: '2009 FG',
    bodyType: 'asteroid',
    spectralType: 'S',
    orbitalFamily: 'NEA',
    diameter: 0.1,
    mass: 5e8,
    density: 2.5,
    semiMajorAxis: 1.017,
    eccentricity: 0.134,
    inclination: 4.17,
    deltaV: 4.6,
    trajectoryStatus: 'accessible',
    estimatedValue: 1e8,
    valueConfidence: 'low',
    composition: { iron: 18, nickel: 3, silicon: 20 },
    description: 'Small but very accessible NEA.',
  },
  {
    slug: '2011-ag5',
    name: '2011 AG5',
    designation: '2011 AG5',
    bodyType: 'asteroid',
    spectralType: 'S',
    orbitalFamily: 'NEA',
    diameter: 0.14,
    mass: 4e9,
    density: 2.5,
    semiMajorAxis: 1.431,
    eccentricity: 0.390,
    inclination: 3.68,
    deltaV: 5.8,
    trajectoryStatus: 'accessible',
    estimatedValue: 5e8,
    valueConfidence: 'low',
    composition: { iron: 15, nickel: 2, silicon: 25 },
    description: 'Elongated NEA with close Earth approaches.',
  },
  {
    slug: '2000-sg344',
    name: '2000 SG344',
    designation: '2000 SG344',
    bodyType: 'asteroid',
    spectralType: 'S',
    orbitalFamily: 'NEA',
    diameter: 0.037,
    mass: 7e7,
    density: 2.5,
    semiMajorAxis: 0.978,
    eccentricity: 0.067,
    inclination: 0.11,
    deltaV: 3.4,
    trajectoryStatus: 'accessible',
    estimatedValue: 2e7,
    valueConfidence: 'low',
    composition: { iron: 15, nickel: 2, silicon: 25 },
    description: 'One of the lowest delta-v NEAs known. May be spent rocket stage or asteroid.',
  },

  // Main Belt Asteroids
  {
    slug: '2-pallas',
    name: 'Pallas',
    designation: '2 Pallas',
    bodyType: 'asteroid',
    spectralType: 'B',
    orbitalFamily: 'Main Belt',
    diameter: 512,
    mass: 2.04e20,
    density: 2.73,
    rotationPeriod: 7.81,
    semiMajorAxis: 2.773,
    eccentricity: 0.231,
    inclination: 34.84,
    deltaV: 10.5,
    trajectoryStatus: 'difficult',
    estimatedValue: 2e16,
    valueConfidence: 'low',
    composition: { water: 10, carbon: 5, silicates: 60, iron: 10 },
    description: 'Third largest asteroid. Highly inclined orbit makes access challenging.',
  },
  {
    slug: '10-hygiea',
    name: 'Hygiea',
    designation: '10 Hygiea',
    bodyType: 'asteroid',
    spectralType: 'C',
    orbitalFamily: 'Main Belt',
    diameter: 434,
    mass: 8.3e19,
    density: 2.06,
    rotationPeriod: 27.62,
    semiMajorAxis: 3.139,
    eccentricity: 0.117,
    inclination: 3.84,
    deltaV: 10.1,
    trajectoryStatus: 'challenging',
    estimatedValue: 8e15,
    valueConfidence: 'low',
    composition: { water: 15, carbon: 8, silicates: 50, iron: 5 },
    description: 'Fourth largest asteroid. Nearly spherical, may qualify as dwarf planet.',
  },
  {
    slug: '704-interamnia',
    name: 'Interamnia',
    designation: '704 Interamnia',
    bodyType: 'asteroid',
    spectralType: 'B',
    orbitalFamily: 'Main Belt',
    diameter: 332,
    mass: 3.5e19,
    density: 1.98,
    semiMajorAxis: 3.062,
    eccentricity: 0.153,
    inclination: 17.30,
    deltaV: 10.3,
    trajectoryStatus: 'challenging',
    estimatedValue: 3e15,
    valueConfidence: 'low',
    composition: { water: 12, carbon: 6, silicates: 55, iron: 8 },
    description: 'Fifth largest asteroid by volume. B-type with water content.',
  },
  {
    slug: '511-davida',
    name: 'Davida',
    designation: '511 Davida',
    bodyType: 'asteroid',
    spectralType: 'C',
    orbitalFamily: 'Main Belt',
    diameter: 289,
    mass: 3.84e19,
    density: 3.16,
    semiMajorAxis: 3.174,
    eccentricity: 0.186,
    inclination: 15.94,
    deltaV: 10.4,
    trajectoryStatus: 'challenging',
    estimatedValue: 2.5e15,
    valueConfidence: 'low',
    composition: { water: 10, carbon: 5, silicates: 50, iron: 15 },
    description: 'Large C-type main belt asteroid.',
  },
  {
    slug: '52-europa',
    name: '52 Europa',
    designation: '52 Europa',
    bodyType: 'asteroid',
    spectralType: 'C',
    orbitalFamily: 'Main Belt',
    diameter: 303,
    mass: 1.7e19,
    density: 1.5,
    semiMajorAxis: 3.101,
    eccentricity: 0.101,
    inclination: 7.44,
    deltaV: 10.0,
    trajectoryStatus: 'challenging',
    estimatedValue: 1.5e15,
    valueConfidence: 'low',
    composition: { water: 20, carbon: 8, silicates: 45, iron: 5 },
    description: 'Large C-type asteroid, likely water-rich.',
  },
  {
    slug: '87-sylvia',
    name: 'Sylvia',
    designation: '87 Sylvia',
    bodyType: 'asteroid',
    spectralType: 'X',
    orbitalFamily: 'Main Belt',
    diameter: 274,
    mass: 1.48e19,
    density: 1.39,
    rotationPeriod: 5.18,
    semiMajorAxis: 3.490,
    eccentricity: 0.083,
    inclination: 10.85,
    deltaV: 10.8,
    trajectoryStatus: 'difficult',
    estimatedValue: 1e15,
    valueConfidence: 'low',
    composition: { iron: 20, nickel: 5, silicates: 50, water: 10 },
    description: 'Triple asteroid system with two moons (Romulus and Remus).',
  },
  {
    slug: '21-lutetia',
    name: 'Lutetia',
    designation: '21 Lutetia',
    bodyType: 'asteroid',
    spectralType: 'M',
    orbitalFamily: 'Main Belt',
    diameter: 100,
    mass: 1.7e18,
    density: 3.4,
    rotationPeriod: 8.17,
    semiMajorAxis: 2.435,
    eccentricity: 0.164,
    inclination: 3.06,
    deltaV: 9.1,
    trajectoryStatus: 'challenging',
    missionHistory: ['ESA Rosetta flyby (2010)'],
    estimatedValue: 5e14,
    valueConfidence: 'medium',
    composition: { iron: 50, nickel: 10, silicates: 30, cobalt: 2 },
    description: 'M-type asteroid visited by Rosetta. Unusual for its spectral class.',
  },
  {
    slug: '253-mathilde',
    name: 'Mathilde',
    designation: '253 Mathilde',
    bodyType: 'asteroid',
    spectralType: 'C',
    orbitalFamily: 'Main Belt',
    diameter: 52.8,
    mass: 1.03e17,
    density: 1.3,
    rotationPeriod: 417.7,
    semiMajorAxis: 2.647,
    eccentricity: 0.266,
    inclination: 6.74,
    deltaV: 9.5,
    trajectoryStatus: 'challenging',
    missionHistory: ['NEAR Shoemaker flyby (1997)'],
    estimatedValue: 5e13,
    valueConfidence: 'medium',
    composition: { water: 18, carbon: 10, silicates: 50 },
    description: 'Very dark C-type asteroid with extremely slow rotation. Heavily cratered.',
  },
  {
    slug: '951-gaspra',
    name: 'Gaspra',
    designation: '951 Gaspra',
    bodyType: 'asteroid',
    spectralType: 'S',
    orbitalFamily: 'Main Belt',
    diameter: 12.2,
    mass: 2e15,
    density: 2.7,
    rotationPeriod: 7.04,
    semiMajorAxis: 2.210,
    eccentricity: 0.174,
    inclination: 4.10,
    deltaV: 8.8,
    trajectoryStatus: 'challenging',
    missionHistory: ['Galileo flyby (1991)'],
    estimatedValue: 5e12,
    valueConfidence: 'medium',
    composition: { iron: 20, nickel: 3, silicon: 25, olivine: 35 },
    description: 'First asteroid visited by spacecraft (Galileo). S-type main belt asteroid.',
  },
  {
    slug: '243-ida',
    name: 'Ida',
    designation: '243 Ida',
    bodyType: 'asteroid',
    spectralType: 'S',
    orbitalFamily: 'Main Belt',
    diameter: 31.4,
    mass: 4.2e16,
    density: 2.6,
    rotationPeriod: 4.63,
    semiMajorAxis: 2.862,
    eccentricity: 0.043,
    inclination: 1.14,
    deltaV: 9.3,
    trajectoryStatus: 'challenging',
    missionHistory: ['Galileo flyby (1993)'],
    estimatedValue: 1e13,
    valueConfidence: 'medium',
    composition: { iron: 18, nickel: 2, silicon: 25, olivine: 35, pyroxene: 15 },
    description: 'S-type asteroid with moon Dactyl (first asteroid moon discovered).',
  },
  {
    slug: '5535-annefrank',
    name: 'Annefrank',
    designation: '5535 Annefrank',
    bodyType: 'asteroid',
    spectralType: 'S',
    orbitalFamily: 'Main Belt',
    diameter: 6.6,
    mass: 5e14,
    density: 2.5,
    semiMajorAxis: 2.212,
    eccentricity: 0.065,
    inclination: 4.25,
    deltaV: 8.9,
    trajectoryStatus: 'challenging',
    missionHistory: ['Stardust flyby (2002)'],
    estimatedValue: 1e12,
    valueConfidence: 'medium',
    composition: { iron: 15, nickel: 2, silicon: 25, olivine: 40 },
    description: 'S-type asteroid visited by Stardust mission en route to comet Wild 2.',
  },

  // Additional NEAs for accessibility
  {
    slug: '4660-nereus',
    name: 'Nereus',
    designation: '4660 Nereus',
    bodyType: 'asteroid',
    spectralType: 'X',
    orbitalFamily: 'NEA',
    diameter: 0.33,
    mass: 3e10,
    density: 2.0,
    semiMajorAxis: 1.489,
    eccentricity: 0.360,
    inclination: 1.43,
    deltaV: 4.9,
    trajectoryStatus: 'accessible',
    estimatedValue: 5e9,
    valueConfidence: 'low',
    composition: { iron: 25, nickel: 5, water: 5, carbon: 5 },
    description: 'Highly accessible X-type NEA. Was candidate for early asteroid missions.',
  },
  {
    slug: '65803-didymos',
    name: 'Didymos',
    designation: '65803 Didymos',
    bodyType: 'asteroid',
    spectralType: 'S',
    orbitalFamily: 'NEA',
    diameter: 0.78,
    mass: 5.3e11,
    density: 2.17,
    rotationPeriod: 2.26,
    semiMajorAxis: 1.644,
    eccentricity: 0.384,
    inclination: 3.41,
    deltaV: 5.8,
    trajectoryStatus: 'accessible',
    missionHistory: ['NASA DART impact (2022)', 'ESA Hera (2024 launch)'],
    estimatedValue: 2e10,
    valueConfidence: 'medium',
    composition: { iron: 15, nickel: 2, silicon: 25, olivine: 40 },
    description: 'Binary asteroid system. Target of NASA DART planetary defense mission that successfully altered orbit of moon Dimorphos.',
  },
  {
    slug: '2100-ra-shalom',
    name: 'Ra-Shalom',
    designation: '2100 Ra-Shalom',
    bodyType: 'asteroid',
    spectralType: 'C',
    orbitalFamily: 'NEA',
    diameter: 2.4,
    mass: 5e12,
    density: 1.5,
    semiMajorAxis: 0.832,
    eccentricity: 0.437,
    inclination: 15.76,
    deltaV: 6.2,
    trajectoryStatus: 'accessible',
    estimatedValue: 3e11,
    valueConfidence: 'low',
    composition: { water: 12, carbon: 8, iron: 5, silicates: 50 },
    description: 'Aten-class NEA with C-type spectrum indicating water content.',
  },
  {
    slug: '3200-phaethon',
    name: 'Phaethon',
    designation: '3200 Phaethon',
    bodyType: 'asteroid',
    spectralType: 'B',
    orbitalFamily: 'NEA',
    diameter: 5.8,
    mass: 1.4e14,
    density: 1.67,
    rotationPeriod: 3.60,
    semiMajorAxis: 1.271,
    eccentricity: 0.890,
    inclination: 22.26,
    deltaV: 7.5,
    trajectoryStatus: 'accessible',
    missionHistory: ['JAXA DESTINY+ (planned)'],
    estimatedValue: 5e12,
    valueConfidence: 'medium',
    composition: { water: 5, carbon: 10, iron: 10, silicates: 60 },
    description: 'Parent body of Geminid meteor shower. Target of JAXA DESTINY+ mission. Unusual blue B-type.',
  },
];

// ============================================================
// Moons Seed Data (15 moons)
// ============================================================
const MOONS_SEED: MiningBodySeed[] = [
  {
    slug: 'luna',
    name: 'Moon (Luna)',
    designation: 'Luna',
    bodyType: 'moon',
    orbitalFamily: 'Planetary Moon',
    diameter: 3474.8,
    mass: 7.342e22,
    density: 3.34,
    rotationPeriod: 655.7,
    semiMajorAxis: 0.00257, // AU from Earth
    eccentricity: 0.0549,
    inclination: 5.145,
    deltaV: 6.0,
    trajectoryStatus: 'accessible',
    missionHistory: ['Apollo 11-17', 'Luna program', 'Chang\'e missions', 'Artemis'],
    estimatedValue: 5e17,
    valueConfidence: 'high',
    composition: { oxygen: 43, silicon: 20, iron: 10, calcium: 9, aluminum: 7, magnesium: 5, titanium: 2, water: 0.1 },
    description: 'Earth\'s only natural satellite. Primary target for human settlement. Water ice at poles, helium-3 in regolith.',
  },
  {
    slug: 'titan',
    name: 'Titan',
    designation: 'Saturn VI',
    bodyType: 'moon',
    orbitalFamily: 'Planetary Moon',
    diameter: 5149.5,
    mass: 1.345e23,
    density: 1.88,
    rotationPeriod: 382.7,
    semiMajorAxis: 9.54, // Saturn distance from Sun
    eccentricity: 0.0288,
    inclination: 0.35,
    deltaV: 15.5,
    trajectoryStatus: 'not_feasible',
    missionHistory: ['Cassini-Huygens (2004-2017)', 'NASA Dragonfly (planned 2027)'],
    estimatedValue: 1e18,
    valueConfidence: 'low',
    composition: { water: 30, methane: 5, nitrogen: 60, ammonia: 2, organics: 3 },
    description: 'Saturn\'s largest moon with thick atmosphere. Lakes of liquid methane/ethane. Target of NASA Dragonfly mission.',
  },
  {
    slug: 'europa',
    name: 'Europa',
    designation: 'Jupiter II',
    bodyType: 'moon',
    orbitalFamily: 'Planetary Moon',
    diameter: 3121.6,
    mass: 4.8e22,
    density: 3.01,
    rotationPeriod: 85.2,
    semiMajorAxis: 5.2, // Jupiter distance from Sun
    eccentricity: 0.009,
    inclination: 0.47,
    deltaV: 14.2,
    trajectoryStatus: 'not_feasible',
    missionHistory: ['Galileo (1995-2003)', 'NASA Europa Clipper (2024)'],
    estimatedValue: 1e18,
    valueConfidence: 'speculative',
    composition: { water: 50, silicates: 40, iron: 8, sulfur: 2 },
    description: 'Ice-covered moon with subsurface ocean. Potential for life. Target of Europa Clipper mission.',
  },
  {
    slug: 'enceladus',
    name: 'Enceladus',
    designation: 'Saturn II',
    bodyType: 'moon',
    orbitalFamily: 'Planetary Moon',
    diameter: 504.2,
    mass: 1.08e20,
    density: 1.61,
    rotationPeriod: 32.9,
    semiMajorAxis: 9.54,
    eccentricity: 0.0047,
    inclination: 0.02,
    deltaV: 15.2,
    trajectoryStatus: 'not_feasible',
    missionHistory: ['Cassini (2004-2017)'],
    estimatedValue: 5e16,
    valueConfidence: 'speculative',
    composition: { water: 60, silicates: 30, organics: 5, ammonia: 3, hydrogen: 2 },
    description: 'Active water geysers from subsurface ocean. Potential habitable environment.',
  },
  {
    slug: 'ganymede',
    name: 'Ganymede',
    designation: 'Jupiter III',
    bodyType: 'moon',
    orbitalFamily: 'Planetary Moon',
    diameter: 5268.2,
    mass: 1.48e23,
    density: 1.94,
    rotationPeriod: 171.7,
    semiMajorAxis: 5.2,
    eccentricity: 0.0013,
    inclination: 0.18,
    deltaV: 14.5,
    trajectoryStatus: 'not_feasible',
    missionHistory: ['Galileo (1995-2003)', 'ESA JUICE (2023)'],
    estimatedValue: 1e18,
    valueConfidence: 'low',
    composition: { water: 45, silicates: 45, iron: 8, sulfur: 2 },
    description: 'Largest moon in solar system. Has magnetic field and subsurface ocean. Target of ESA JUICE mission.',
  },
  {
    slug: 'callisto',
    name: 'Callisto',
    designation: 'Jupiter IV',
    bodyType: 'moon',
    orbitalFamily: 'Planetary Moon',
    diameter: 4820.6,
    mass: 1.08e23,
    density: 1.83,
    rotationPeriod: 400.5,
    semiMajorAxis: 5.2,
    eccentricity: 0.0074,
    inclination: 0.19,
    deltaV: 14.0,
    trajectoryStatus: 'not_feasible',
    missionHistory: ['Galileo (1995-2003)'],
    estimatedValue: 8e17,
    valueConfidence: 'low',
    composition: { water: 40, silicates: 50, iron: 5, organics: 3, ammonia: 2 },
    description: 'Most heavily cratered body in solar system. Possible subsurface ocean. Outside Jupiter radiation belts.',
  },
  {
    slug: 'phobos',
    name: 'Phobos',
    designation: 'Mars I',
    bodyType: 'moon',
    spectralType: 'C',
    orbitalFamily: 'Planetary Moon',
    diameter: 22.5,
    mass: 1.07e16,
    density: 1.88,
    rotationPeriod: 7.66,
    semiMajorAxis: 1.52, // Mars distance
    eccentricity: 0.0151,
    inclination: 1.08,
    deltaV: 8.5,
    trajectoryStatus: 'challenging',
    missionHistory: ['Viking (1977)', 'JAXA MMX (planned 2026)'],
    estimatedValue: 5e13,
    valueConfidence: 'medium',
    composition: { water: 15, carbon: 8, iron: 5, silicates: 60 },
    description: 'Larger moon of Mars. May be captured asteroid or formed from Mars debris. Target of JAXA MMX sample return.',
  },
  {
    slug: 'deimos',
    name: 'Deimos',
    designation: 'Mars II',
    bodyType: 'moon',
    spectralType: 'C',
    orbitalFamily: 'Planetary Moon',
    diameter: 12.4,
    mass: 1.48e15,
    density: 1.47,
    rotationPeriod: 30.3,
    semiMajorAxis: 1.52,
    eccentricity: 0.0002,
    inclination: 1.79,
    deltaV: 8.8,
    trajectoryStatus: 'challenging',
    missionHistory: ['Viking (1977)'],
    estimatedValue: 1e13,
    valueConfidence: 'medium',
    composition: { water: 12, carbon: 6, iron: 5, silicates: 65 },
    description: 'Smaller moon of Mars. Very low surface gravity. Potential staging base for Mars missions.',
  },
  {
    slug: 'triton',
    name: 'Triton',
    designation: 'Neptune I',
    bodyType: 'moon',
    orbitalFamily: 'Planetary Moon',
    diameter: 2706.8,
    mass: 2.14e22,
    density: 2.06,
    rotationPeriod: 141.0,
    semiMajorAxis: 30.1, // Neptune distance
    eccentricity: 0.00002,
    inclination: 156.9,
    deltaV: 22.0,
    trajectoryStatus: 'not_feasible',
    missionHistory: ['Voyager 2 (1989)'],
    estimatedValue: 5e17,
    valueConfidence: 'speculative',
    composition: { nitrogen: 55, water: 25, methane: 10, carbon: 5, ammonia: 5 },
    description: 'Largest moon of Neptune. Retrograde orbit suggests captured KBO. Active geysers.',
  },
  {
    slug: 'io',
    name: 'Io',
    designation: 'Jupiter I',
    bodyType: 'moon',
    orbitalFamily: 'Planetary Moon',
    diameter: 3643.2,
    mass: 8.93e22,
    density: 3.53,
    rotationPeriod: 42.5,
    semiMajorAxis: 5.2,
    eccentricity: 0.0041,
    inclination: 0.04,
    deltaV: 14.8,
    trajectoryStatus: 'not_feasible',
    missionHistory: ['Galileo (1995-2003)', 'New Horizons (2007)', 'Juno'],
    estimatedValue: 2e17,
    valueConfidence: 'speculative',
    composition: { sulfur: 30, silicon: 20, iron: 20, oxygen: 20, sodium: 5, magnesium: 5 },
    description: 'Most volcanically active body in solar system. Extreme radiation environment.',
  },
  {
    slug: 'mimas',
    name: 'Mimas',
    designation: 'Saturn I',
    bodyType: 'moon',
    orbitalFamily: 'Planetary Moon',
    diameter: 396.4,
    mass: 3.75e19,
    density: 1.15,
    rotationPeriod: 22.6,
    semiMajorAxis: 9.54,
    eccentricity: 0.0196,
    inclination: 1.57,
    deltaV: 15.0,
    trajectoryStatus: 'not_feasible',
    missionHistory: ['Cassini (2004-2017)'],
    estimatedValue: 1e15,
    valueConfidence: 'speculative',
    composition: { water: 80, silicates: 15, organics: 5 },
    description: 'Small icy moon with giant Herschel crater ("Death Star" appearance). May have internal ocean.',
  },
  {
    slug: 'miranda',
    name: 'Miranda',
    designation: 'Uranus V',
    bodyType: 'moon',
    orbitalFamily: 'Planetary Moon',
    diameter: 471.6,
    mass: 6.6e19,
    density: 1.20,
    rotationPeriod: 33.9,
    semiMajorAxis: 19.2, // Uranus distance
    eccentricity: 0.0013,
    inclination: 4.34,
    deltaV: 18.5,
    trajectoryStatus: 'not_feasible',
    missionHistory: ['Voyager 2 (1986)'],
    estimatedValue: 5e14,
    valueConfidence: 'speculative',
    composition: { water: 60, silicates: 30, ammonia: 5, methane: 5 },
    description: 'Smallest and innermost of Uranus major moons. Extreme surface features suggest violent geological history.',
  },
  {
    slug: 'charon',
    name: 'Charon',
    designation: 'Pluto I',
    bodyType: 'moon',
    orbitalFamily: 'Kuiper Belt',
    diameter: 1212,
    mass: 1.586e21,
    density: 1.70,
    rotationPeriod: 153.3,
    semiMajorAxis: 39.5, // Pluto distance
    eccentricity: 0.0002,
    inclination: 0.001,
    deltaV: 25.0,
    trajectoryStatus: 'not_feasible',
    missionHistory: ['New Horizons (2015)'],
    estimatedValue: 1e16,
    valueConfidence: 'speculative',
    composition: { water: 55, ammonia: 10, nitrogen: 5, methane: 5, silicates: 25 },
    description: 'Pluto\'s largest moon, nearly half Pluto\'s size. Binary dwarf planet system.',
  },
  {
    slug: 'ariel',
    name: 'Ariel',
    designation: 'Uranus I',
    bodyType: 'moon',
    orbitalFamily: 'Planetary Moon',
    diameter: 1157.8,
    mass: 1.35e21,
    density: 1.59,
    rotationPeriod: 60.5,
    semiMajorAxis: 19.2,
    eccentricity: 0.0012,
    inclination: 0.04,
    deltaV: 18.2,
    trajectoryStatus: 'not_feasible',
    missionHistory: ['Voyager 2 (1986)'],
    estimatedValue: 8e15,
    valueConfidence: 'speculative',
    composition: { water: 50, ammonia: 10, silicates: 35, carbon: 5 },
    description: 'Fourth largest moon of Uranus. Brightest of Uranian moons with youngest surface.',
  },
  {
    slug: 'rhea',
    name: 'Rhea',
    designation: 'Saturn V',
    bodyType: 'moon',
    orbitalFamily: 'Planetary Moon',
    diameter: 1527.6,
    mass: 2.31e21,
    density: 1.24,
    rotationPeriod: 108.4,
    semiMajorAxis: 9.54,
    eccentricity: 0.0010,
    inclination: 0.35,
    deltaV: 15.3,
    trajectoryStatus: 'not_feasible',
    missionHistory: ['Cassini (2004-2017)'],
    estimatedValue: 2e15,
    valueConfidence: 'speculative',
    composition: { water: 75, silicates: 20, organics: 5 },
    description: 'Second largest moon of Saturn. Mostly water ice with possible tenuous ring system.',
  },
];

// ============================================================
// Planets Seed Data
// ============================================================
const PLANETS_SEED: MiningBodySeed[] = [
  {
    slug: 'mars',
    name: 'Mars',
    designation: 'Sol IV',
    bodyType: 'planet',
    orbitalFamily: 'Planetary Moon',
    diameter: 6779,
    mass: 6.39e23,
    density: 3.93,
    rotationPeriod: 24.6,
    semiMajorAxis: 1.524,
    eccentricity: 0.0934,
    inclination: 1.85,
    perihelion: 1.38,
    aphelion: 1.67,
    orbitalPeriod: 1.88,
    deltaV: 11.5,
    trajectoryStatus: 'challenging',
    missionHistory: ['Viking', 'Spirit', 'Opportunity', 'Curiosity', 'Perseverance', 'InSight'],
    estimatedValue: 1e20,
    valueConfidence: 'speculative',
    composition: { iron: 20, silicon: 15, magnesium: 10, oxygen: 40, sulfur: 3, aluminum: 5, calcium: 3, water: 2 },
    description: 'Fourth planet. Primary target for human colonization. Water ice at poles and subsurface. Rich in iron oxide.',
  },
  {
    slug: 'mercury',
    name: 'Mercury',
    designation: 'Sol I',
    bodyType: 'planet',
    orbitalFamily: 'Planetary Moon',
    diameter: 4879,
    mass: 3.3e23,
    density: 5.43,
    rotationPeriod: 1407.6,
    semiMajorAxis: 0.387,
    eccentricity: 0.2056,
    inclination: 7.00,
    perihelion: 0.31,
    aphelion: 0.47,
    orbitalPeriod: 0.24,
    deltaV: 12.5,
    trajectoryStatus: 'challenging',
    missionHistory: ['Mariner 10', 'MESSENGER', 'BepiColombo'],
    estimatedValue: 5e19,
    valueConfidence: 'speculative',
    composition: { iron: 70, silicon: 10, magnesium: 5, oxygen: 10, sulfur: 2, potassium: 1 },
    description: 'Closest planet to Sun. Large iron core (70% of mass). Extreme temperature variations. Water ice in shadowed craters.',
  },
  {
    slug: 'venus',
    name: 'Venus',
    designation: 'Sol II',
    bodyType: 'planet',
    orbitalFamily: 'Planetary Moon',
    diameter: 12104,
    mass: 4.87e24,
    density: 5.24,
    rotationPeriod: 5832.5,
    semiMajorAxis: 0.723,
    eccentricity: 0.0067,
    inclination: 3.39,
    perihelion: 0.72,
    aphelion: 0.73,
    orbitalPeriod: 0.62,
    deltaV: 10.5,
    trajectoryStatus: 'challenging',
    missionHistory: ['Venera program', 'Magellan', 'Venus Express', 'Akatsuki'],
    estimatedValue: 2e19,
    valueConfidence: 'speculative',
    composition: { iron: 30, silicon: 20, magnesium: 15, oxygen: 30, sulfur: 3, carbon: 2 },
    description: 'Earth\'s twin in size. Extreme surface conditions (460C, 90 atm). Sulfuric acid clouds. Target of upcoming VERITAS and DAVINCI missions.',
  },
  {
    slug: 'pluto',
    name: 'Pluto',
    designation: '134340 Pluto',
    bodyType: 'dwarf_planet',
    orbitalFamily: 'Kuiper Belt',
    diameter: 2376.6,
    mass: 1.303e22,
    density: 1.85,
    rotationPeriod: 153.3,
    semiMajorAxis: 39.48,
    eccentricity: 0.2488,
    inclination: 17.16,
    perihelion: 29.66,
    aphelion: 49.31,
    orbitalPeriod: 247.94,
    deltaV: 25.0,
    trajectoryStatus: 'not_feasible',
    missionHistory: ['New Horizons (2015)'],
    estimatedValue: 5e16,
    valueConfidence: 'speculative',
    composition: { nitrogen: 50, methane: 10, carbon: 5, water: 30, ammonia: 5 },
    description: 'Largest known dwarf planet. Heart-shaped nitrogen ice plain. Complex atmosphere and active geology.',
  },
];

// ============================================================
// Commodity Prices Seed Data (20+ commodities with real Earth prices)
// ============================================================
const COMMODITY_PRICES_SEED: CommodityPriceSeed[] = [
  // Precious Metals
  {
    slug: 'gold',
    name: 'Gold',
    symbol: 'Au',
    category: 'precious_metal',
    pricePerKg: 62000,
    pricePerTonne: 62000000,
    priceSource: 'LBMA Gold Price (2024)',
    annualProduction: 3000,
    marketCap: 13e12,
    priceVolatility: 'medium',
    spaceApplications: ['thermal coatings', 'electrical contacts', 'radiation shielding', 'connectors'],
    inSpaceValue: 150000,
    description: 'Primary precious metal. Used in spacecraft for thermal control and electrical connections.',
  },
  {
    slug: 'platinum',
    name: 'Platinum',
    symbol: 'Pt',
    category: 'precious_metal',
    pricePerKg: 30000,
    pricePerTonne: 30000000,
    priceSource: 'LPPM Platinum Price (2024)',
    annualProduction: 180,
    marketCap: 200e9,
    priceVolatility: 'high',
    spaceApplications: ['catalysts', 'fuel cells', 'sensors', 'electronics'],
    inSpaceValue: 80000,
    description: 'Key catalyst metal. Critical for hydrogen fuel cells and chemical processing.',
  },
  {
    slug: 'palladium',
    name: 'Palladium',
    symbol: 'Pd',
    category: 'precious_metal',
    pricePerKg: 32000,
    pricePerTonne: 32000000,
    priceSource: 'LPPM Palladium Price (2024)',
    annualProduction: 210,
    marketCap: 220e9,
    priceVolatility: 'high',
    spaceApplications: ['catalysts', 'electronics', 'hydrogen storage'],
    inSpaceValue: 85000,
    description: 'Platinum group metal. Critical for catalytic converters and electronics.',
  },
  {
    slug: 'rhodium',
    name: 'Rhodium',
    symbol: 'Rh',
    category: 'precious_metal',
    pricePerKg: 145000,
    pricePerTonne: 145000000,
    priceSource: 'LPPM Rhodium Price (2024)',
    annualProduction: 30,
    marketCap: 15e9,
    priceVolatility: 'high',
    spaceApplications: ['catalysts', 'reflective coatings', 'high-temperature crucibles'],
    inSpaceValue: 350000,
    description: 'Rarest and most expensive platinum group metal. Exceptional corrosion resistance.',
  },
  {
    slug: 'iridium',
    name: 'Iridium',
    symbol: 'Ir',
    category: 'precious_metal',
    pricePerKg: 140000,
    pricePerTonne: 140000000,
    priceSource: 'Johnson Matthey (2024)',
    annualProduction: 7,
    marketCap: 5e9,
    priceVolatility: 'medium',
    spaceApplications: ['spark plugs', 'crucibles', 'electrical contacts', 'high-temp applications'],
    inSpaceValue: 300000,
    description: 'Densest naturally occurring element. Extremely corrosion resistant.',
  },
  {
    slug: 'osmium',
    name: 'Osmium',
    symbol: 'Os',
    category: 'precious_metal',
    pricePerKg: 12000,
    pricePerTonne: 12000000,
    priceSource: 'Specialty Metals Market (2024)',
    annualProduction: 1,
    marketCap: 500e6,
    priceVolatility: 'low',
    spaceApplications: ['alloys', 'electrical contacts', 'instrument pivots'],
    inSpaceValue: 30000,
    description: 'Densest naturally occurring element. Used in alloys for extreme durability.',
  },
  {
    slug: 'ruthenium',
    name: 'Ruthenium',
    symbol: 'Ru',
    category: 'precious_metal',
    pricePerKg: 12000,
    pricePerTonne: 12000000,
    priceSource: 'Johnson Matthey (2024)',
    annualProduction: 35,
    marketCap: 1e9,
    priceVolatility: 'medium',
    spaceApplications: ['electronics', 'catalysts', 'solar cells', 'data storage'],
    inSpaceValue: 30000,
    description: 'Platinum group metal. Key for electronics and chip manufacturing.',
  },

  // Industrial Metals
  {
    slug: 'iron',
    name: 'Iron',
    symbol: 'Fe',
    category: 'industrial_metal',
    pricePerKg: 0.12,
    pricePerTonne: 120,
    priceSource: 'Iron Ore Index (2024)',
    annualProduction: 1800000000,
    marketCap: 200e9,
    priceVolatility: 'medium',
    spaceApplications: ['structural materials', 'steel production', 'radiation shielding'],
    inSpaceValue: 5000,
    description: 'Most common industrial metal. Primary component of steel for space structures.',
  },
  {
    slug: 'nickel',
    name: 'Nickel',
    symbol: 'Ni',
    category: 'industrial_metal',
    pricePerKg: 16,
    pricePerTonne: 16000,
    priceSource: 'LME Nickel (2024)',
    annualProduction: 3300000,
    marketCap: 50e9,
    priceVolatility: 'high',
    spaceApplications: ['superalloys', 'batteries', 'coatings', 'stainless steel'],
    inSpaceValue: 20000,
    description: 'Key for superalloys and batteries. Critical for rocket engines and EV batteries.',
  },
  {
    slug: 'cobalt',
    name: 'Cobalt',
    symbol: 'Co',
    category: 'industrial_metal',
    pricePerKg: 33,
    pricePerTonne: 33000,
    priceSource: 'LME Cobalt (2024)',
    annualProduction: 170000,
    marketCap: 10e9,
    priceVolatility: 'high',
    spaceApplications: ['batteries', 'superalloys', 'magnets', 'radiation therapy'],
    inSpaceValue: 50000,
    description: 'Critical battery metal. Essential for Li-ion batteries and superalloys.',
  },
  {
    slug: 'copper',
    name: 'Copper',
    symbol: 'Cu',
    category: 'industrial_metal',
    pricePerKg: 8.5,
    pricePerTonne: 8500,
    priceSource: 'LME Copper (2024)',
    annualProduction: 22000000,
    marketCap: 180e9,
    priceVolatility: 'medium',
    spaceApplications: ['electrical systems', 'heat exchangers', 'wiring'],
    inSpaceValue: 15000,
    description: 'Primary electrical conductor. Essential for all spacecraft electrical systems.',
  },
  {
    slug: 'titanium',
    name: 'Titanium',
    symbol: 'Ti',
    category: 'industrial_metal',
    pricePerKg: 35,
    pricePerTonne: 35000,
    priceSource: 'Aerospace Grade Titanium (2024)',
    annualProduction: 300000,
    marketCap: 30e9,
    priceVolatility: 'low',
    spaceApplications: ['aerospace structures', 'engines', 'pressure vessels', 'fasteners'],
    inSpaceValue: 50000,
    description: 'Aerospace-grade metal. High strength-to-weight ratio, corrosion resistant.',
  },
  {
    slug: 'aluminum',
    name: 'Aluminum',
    symbol: 'Al',
    category: 'industrial_metal',
    pricePerKg: 2.5,
    pricePerTonne: 2500,
    priceSource: 'LME Aluminum (2024)',
    annualProduction: 69000000,
    marketCap: 170e9,
    priceVolatility: 'medium',
    spaceApplications: ['spacecraft structures', 'fuel tanks', 'radiators'],
    inSpaceValue: 8000,
    description: 'Primary aerospace structural metal. Lightweight and easily machined.',
  },
  {
    slug: 'magnesium',
    name: 'Magnesium',
    symbol: 'Mg',
    category: 'industrial_metal',
    pricePerKg: 3.5,
    pricePerTonne: 3500,
    priceSource: 'Global Magnesium Market (2024)',
    annualProduction: 1100000,
    marketCap: 5e9,
    priceVolatility: 'medium',
    spaceApplications: ['lightweight alloys', 'pyrotechnics', 'aerospace components'],
    inSpaceValue: 10000,
    description: 'Lightest structural metal. Used in aerospace alloys.',
  },

  // Rare Earth Elements
  {
    slug: 'neodymium',
    name: 'Neodymium',
    symbol: 'Nd',
    category: 'rare_earth',
    pricePerKg: 85,
    pricePerTonne: 85000,
    priceSource: 'Rare Earth Market (2024)',
    annualProduction: 30000,
    marketCap: 3e9,
    priceVolatility: 'high',
    spaceApplications: ['permanent magnets', 'lasers', 'motors', 'sensors'],
    inSpaceValue: 150000,
    description: 'Key magnet material. Critical for electric motors and wind turbines.',
  },
  {
    slug: 'europium',
    name: 'Europium',
    symbol: 'Eu',
    category: 'rare_earth',
    pricePerKg: 350,
    pricePerTonne: 350000,
    priceSource: 'Rare Earth Market (2024)',
    annualProduction: 400,
    marketCap: 150e6,
    priceVolatility: 'medium',
    spaceApplications: ['phosphors', 'displays', 'lasers', 'nuclear control rods'],
    inSpaceValue: 600000,
    description: 'Most reactive rare earth. Used in display phosphors and lighting.',
  },
  {
    slug: 'yttrium',
    name: 'Yttrium',
    symbol: 'Y',
    category: 'rare_earth',
    pricePerKg: 35,
    pricePerTonne: 35000,
    priceSource: 'Rare Earth Market (2024)',
    annualProduction: 10000,
    marketCap: 400e6,
    priceVolatility: 'medium',
    spaceApplications: ['superconductors', 'lasers', 'ceramics', 'alloys'],
    inSpaceValue: 80000,
    description: 'Used in superconductors and high-temperature ceramics.',
  },

  // Volatiles
  {
    slug: 'water-ice',
    name: 'Water Ice',
    symbol: 'H2O',
    category: 'volatile',
    pricePerKg: 0.002,
    pricePerTonne: 2,
    priceSource: 'Municipal Water (reference)',
    annualProduction: 4e12,
    priceVolatility: 'low',
    spaceApplications: ['life support', 'rocket fuel', 'radiation shielding', 'oxygen production'],
    inSpaceValue: 10000,
    description: 'Most valuable space resource. Provides life support, rocket propellant (H2/O2), and radiation shielding.',
  },
  {
    slug: 'helium-3',
    name: 'Helium-3',
    symbol: 'He-3',
    category: 'volatile',
    pricePerKg: 1400000,
    pricePerTonne: 1400000000,
    priceSource: 'DOE Research Supply (2024)',
    annualProduction: 0.015,
    marketCap: 20e6,
    priceVolatility: 'low',
    spaceApplications: ['fusion fuel', 'cryogenics', 'neutron detection', 'MRI'],
    inSpaceValue: 3000000,
    description: 'Potential fusion fuel. Abundant on lunar surface. Extremely rare on Earth.',
  },
  {
    slug: 'hydrogen',
    name: 'Hydrogen',
    symbol: 'H2',
    category: 'volatile',
    pricePerKg: 6,
    pricePerTonne: 6000,
    priceSource: 'Industrial Hydrogen (2024)',
    annualProduction: 70000000,
    marketCap: 150e9,
    priceVolatility: 'medium',
    spaceApplications: ['rocket fuel', 'fuel cells', 'chemical feedstock'],
    inSpaceValue: 15000,
    description: 'Primary rocket fuel. Can be produced from water electrolysis in space.',
  },
  {
    slug: 'oxygen',
    name: 'Oxygen',
    symbol: 'O2',
    category: 'volatile',
    pricePerKg: 0.20,
    pricePerTonne: 200,
    priceSource: 'Industrial Oxygen (2024)',
    annualProduction: 400000000,
    marketCap: 50e9,
    priceVolatility: 'low',
    spaceApplications: ['life support', 'rocket oxidizer', 'fuel cells'],
    inSpaceValue: 5000,
    description: 'Life support and rocket oxidizer. Can be extracted from lunar regolith or water.',
  },

  // Minerals
  {
    slug: 'silicon',
    name: 'Silicon',
    symbol: 'Si',
    category: 'mineral',
    pricePerKg: 2,
    pricePerTonne: 2000,
    priceSource: 'Metallurgical Silicon (2024)',
    annualProduction: 8000000,
    marketCap: 16e9,
    priceVolatility: 'low',
    spaceApplications: ['solar cells', 'electronics', 'glass', 'construction'],
    inSpaceValue: 6000,
    description: 'Semiconductor base material. Essential for solar panels and electronics.',
  },
  {
    slug: 'carbon',
    name: 'Carbon',
    symbol: 'C',
    category: 'mineral',
    pricePerKg: 0.5,
    pricePerTonne: 500,
    priceSource: 'Industrial Carbon (2024)',
    annualProduction: 15000000,
    marketCap: 8e9,
    priceVolatility: 'low',
    spaceApplications: ['composites', 'life support', 'fuel', 'construction'],
    inSpaceValue: 3000,
    description: 'Building block of life. Used in composites, fuels, and life support systems.',
  },
];

// ============================================================
// Mining Resources Seed Data
// ============================================================
const MINING_RESOURCES_SEED: MiningResourceSeed[] = [
  // 16 Psyche resources
  { miningBodySlug: '16-psyche', resourceType: 'iron', category: 'metal', abundancePercent: 85, estimatedMass: 2.3e19, estimatedValue: 2.76e15, extractionMethod: 'surface_mining', extractionCost: 'high' },
  { miningBodySlug: '16-psyche', resourceType: 'nickel', category: 'metal', abundancePercent: 10, estimatedMass: 2.72e18, estimatedValue: 4.35e16, extractionMethod: 'surface_mining', extractionCost: 'high' },
  { miningBodySlug: '16-psyche', resourceType: 'cobalt', category: 'metal', abundancePercent: 1.5, estimatedMass: 4.08e17, estimatedValue: 1.35e16, extractionMethod: 'surface_mining', extractionCost: 'high' },
  { miningBodySlug: '16-psyche', resourceType: 'gold', category: 'precious_metal', abundancePercent: 0.001, estimatedMass: 2.72e14, estimatedValue: 1.69e19, extractionMethod: 'surface_mining', extractionCost: 'very_high' },
  { miningBodySlug: '16-psyche', resourceType: 'platinum', category: 'precious_metal', abundancePercent: 0.01, estimatedMass: 2.72e15, estimatedValue: 8.16e19, extractionMethod: 'surface_mining', extractionCost: 'very_high' },

  // Ryugu resources
  { miningBodySlug: '162173-ryugu', resourceType: 'water', category: 'volatile', abundancePercent: 8, estimatedMass: 3.6e10, estimatedValue: 3.6e14, extractionMethod: 'thermal_extraction', extractionCost: 'medium' },
  { miningBodySlug: '162173-ryugu', resourceType: 'carbon', category: 'volatile', abundancePercent: 5, estimatedMass: 2.25e10, estimatedValue: 1.125e10, extractionMethod: 'surface_mining', extractionCost: 'low' },
  { miningBodySlug: '162173-ryugu', resourceType: 'iron', category: 'metal', abundancePercent: 10, estimatedMass: 4.5e10, estimatedValue: 5.4e9, extractionMethod: 'surface_mining', extractionCost: 'low' },

  // Bennu resources
  { miningBodySlug: '101955-bennu', resourceType: 'water', category: 'volatile', abundancePercent: 10, estimatedMass: 7.8e9, estimatedValue: 7.8e13, extractionMethod: 'thermal_extraction', extractionCost: 'medium' },
  { miningBodySlug: '101955-bennu', resourceType: 'carbon', category: 'volatile', abundancePercent: 6, estimatedMass: 4.68e9, estimatedValue: 2.34e9, extractionMethod: 'surface_mining', extractionCost: 'low' },

  // Ceres resources
  { miningBodySlug: '1-ceres', resourceType: 'water', category: 'volatile', abundancePercent: 25, estimatedMass: 2.35e20, estimatedValue: 2.35e24, extractionMethod: 'subsurface_mining', extractionCost: 'high' },
  { miningBodySlug: '1-ceres', resourceType: 'ammonia', category: 'volatile', abundancePercent: 5, estimatedMass: 4.7e19, estimatedValue: 4.7e18, extractionMethod: 'thermal_extraction', extractionCost: 'high' },

  // Eros resources
  { miningBodySlug: '433-eros', resourceType: 'iron', category: 'metal', abundancePercent: 20, estimatedMass: 1.34e15, estimatedValue: 1.6e14, extractionMethod: 'surface_mining', extractionCost: 'medium' },
  { miningBodySlug: '433-eros', resourceType: 'nickel', category: 'metal', abundancePercent: 3, estimatedMass: 2e14, estimatedValue: 3.2e15, extractionMethod: 'surface_mining', extractionCost: 'medium' },

  // Moon resources
  { miningBodySlug: 'luna', resourceType: 'oxygen', category: 'volatile', abundancePercent: 43, estimatedMass: 3.16e22, estimatedValue: 6.32e21, extractionMethod: 'regolith_processing', extractionCost: 'medium' },
  { miningBodySlug: 'luna', resourceType: 'silicon', category: 'silicate', abundancePercent: 20, estimatedMass: 1.47e22, estimatedValue: 2.94e22, extractionMethod: 'regolith_processing', extractionCost: 'medium' },
  { miningBodySlug: 'luna', resourceType: 'iron', category: 'metal', abundancePercent: 10, estimatedMass: 7.34e21, estimatedValue: 8.8e20, extractionMethod: 'regolith_processing', extractionCost: 'medium' },
  { miningBodySlug: 'luna', resourceType: 'water', category: 'volatile', abundancePercent: 0.1, estimatedMass: 7.34e19, estimatedValue: 7.34e23, extractionMethod: 'polar_mining', extractionCost: 'high' },
  { miningBodySlug: 'luna', resourceType: 'helium-3', category: 'volatile', abundancePercent: 0.00001, estimatedMass: 7.34e15, estimatedValue: 1.03e22, extractionMethod: 'regolith_heating', extractionCost: 'very_high' },

  // Mars resources
  { miningBodySlug: 'mars', resourceType: 'water', category: 'volatile', abundancePercent: 2, estimatedMass: 1.28e22, estimatedValue: 1.28e26, extractionMethod: 'subsurface_mining', extractionCost: 'high' },
  { miningBodySlug: 'mars', resourceType: 'iron', category: 'metal', abundancePercent: 20, estimatedMass: 1.28e23, estimatedValue: 1.54e22, extractionMethod: 'surface_mining', extractionCost: 'high' },
  { miningBodySlug: 'mars', resourceType: 'oxygen', category: 'volatile', abundancePercent: 40, estimatedMass: 2.56e23, estimatedValue: 5.12e22, extractionMethod: 'atmosphere_processing', extractionCost: 'medium' },

  // Phobos resources
  { miningBodySlug: 'phobos', resourceType: 'water', category: 'volatile', abundancePercent: 15, estimatedMass: 1.6e15, estimatedValue: 1.6e19, extractionMethod: 'thermal_extraction', extractionCost: 'medium' },
  { miningBodySlug: 'phobos', resourceType: 'carbon', category: 'volatile', abundancePercent: 8, estimatedMass: 8.56e14, estimatedValue: 4.28e14, extractionMethod: 'surface_mining', extractionCost: 'low' },
];

// ============================================================
// Database Initialization
// ============================================================
export async function initializeSpaceMiningData() {
  const results = {
    bodiesCreated: 0,
    resourcesCreated: 0,
    commoditiesCreated: 0,
  };

  // Create mining bodies (asteroids, moons, planets)
  const allBodies = [...ASTEROIDS_SEED, ...MOONS_SEED, ...PLANETS_SEED];

  for (const bodyData of allBodies) {
    const existing = await prisma.miningBody.findUnique({
      where: { slug: bodyData.slug },
    });

    if (!existing) {
      await prisma.miningBody.create({
        data: {
          slug: bodyData.slug,
          name: bodyData.name,
          designation: bodyData.designation,
          bodyType: bodyData.bodyType,
          spectralType: bodyData.spectralType,
          orbitalFamily: bodyData.orbitalFamily,
          diameter: bodyData.diameter,
          mass: bodyData.mass,
          density: bodyData.density,
          rotationPeriod: bodyData.rotationPeriod,
          semiMajorAxis: bodyData.semiMajorAxis,
          eccentricity: bodyData.eccentricity,
          inclination: bodyData.inclination,
          perihelion: bodyData.perihelion,
          aphelion: bodyData.aphelion,
          orbitalPeriod: bodyData.orbitalPeriod,
          deltaV: bodyData.deltaV,
          trajectoryStatus: bodyData.trajectoryStatus,
          missionHistory: bodyData.missionHistory ? JSON.stringify(bodyData.missionHistory) : null,
          estimatedValue: bodyData.estimatedValue,
          valueConfidence: bodyData.valueConfidence,
          composition: bodyData.composition ? JSON.stringify(bodyData.composition) : null,
          description: bodyData.description,
          imageUrl: bodyData.imageUrl,
        },
      });
      results.bodiesCreated++;
    }
  }

  // Create mining resources
  for (const resourceData of MINING_RESOURCES_SEED) {
    const body = await prisma.miningBody.findUnique({
      where: { slug: resourceData.miningBodySlug },
    });

    if (body) {
      // Check if resource already exists
      const existing = await prisma.miningResource.findFirst({
        where: {
          miningBodyId: body.id,
          resourceType: resourceData.resourceType,
        },
      });

      if (!existing) {
        await prisma.miningResource.create({
          data: {
            miningBodyId: body.id,
            resourceType: resourceData.resourceType,
            category: resourceData.category,
            abundancePercent: resourceData.abundancePercent,
            estimatedMass: resourceData.estimatedMass,
            estimatedValue: resourceData.estimatedValue,
            extractionMethod: resourceData.extractionMethod,
            extractionCost: resourceData.extractionCost,
            notes: resourceData.notes,
          },
        });
        results.resourcesCreated++;
      }
    }
  }

  // Create commodity prices
  for (const commodityData of COMMODITY_PRICES_SEED) {
    const existing = await prisma.commodityPrice.findUnique({
      where: { slug: commodityData.slug },
    });

    if (!existing) {
      await prisma.commodityPrice.create({
        data: {
          slug: commodityData.slug,
          name: commodityData.name,
          symbol: commodityData.symbol,
          category: commodityData.category,
          pricePerKg: commodityData.pricePerKg,
          pricePerTonne: commodityData.pricePerTonne,
          priceUnit: commodityData.priceUnit,
          priceSource: commodityData.priceSource,
          annualProduction: commodityData.annualProduction,
          marketCap: commodityData.marketCap,
          priceVolatility: commodityData.priceVolatility,
          spaceApplications: commodityData.spaceApplications ? JSON.stringify(commodityData.spaceApplications) : null,
          inSpaceValue: commodityData.inSpaceValue,
          description: commodityData.description,
        },
      });
      results.commoditiesCreated++;
    }
  }

  return results;
}

// ============================================================
// Query Functions
// ============================================================

export async function getMiningBodies(options?: {
  bodyType?: MiningBodyType;
  spectralType?: SpectralType;
  orbitalFamily?: string;
  trajectoryStatus?: TrajectoryStatus;
  minValue?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'value' | 'deltaV' | 'diameter' | 'name';
  sortOrder?: 'asc' | 'desc';
}): Promise<{ bodies: MiningBody[]; total: number }> {
  const {
    bodyType,
    spectralType,
    orbitalFamily,
    trajectoryStatus,
    minValue,
    limit = 50,
    offset = 0,
    sortBy = 'value',
    sortOrder = 'desc',
  } = options || {};

  const where: Record<string, unknown> = {};

  if (bodyType) where.bodyType = bodyType;
  if (spectralType) where.spectralType = spectralType;
  if (orbitalFamily) where.orbitalFamily = orbitalFamily;
  if (trajectoryStatus) where.trajectoryStatus = trajectoryStatus;
  if (minValue) where.estimatedValue = { gte: minValue };

  const orderBy: Record<string, 'asc' | 'desc'> = {};
  switch (sortBy) {
    case 'value':
      orderBy.estimatedValue = sortOrder;
      break;
    case 'deltaV':
      orderBy.deltaV = sortOrder;
      break;
    case 'diameter':
      orderBy.diameter = sortOrder;
      break;
    case 'name':
      orderBy.name = sortOrder;
      break;
  }

  const [bodies, total] = await Promise.all([
    prisma.miningBody.findMany({
      where,
      include: {
        resources: true,
      },
      orderBy,
      take: limit,
      skip: offset,
    }),
    prisma.miningBody.count({ where }),
  ]);

  return {
    bodies: bodies.map(body => ({
      ...body,
      bodyType: body.bodyType as MiningBodyType,
      spectralType: body.spectralType as SpectralType | null,
      orbitalFamily: body.orbitalFamily as OrbitalFamily | null,
      trajectoryStatus: body.trajectoryStatus as TrajectoryStatus | null,
      valueConfidence: body.valueConfidence as ValueConfidence | null,
      missionHistory: body.missionHistory ? JSON.parse(body.missionHistory) : null,
      composition: body.composition ? JSON.parse(body.composition) : null,
      resources: body.resources.map(r => ({
        ...r,
        category: r.category as MiningResourceCategory,
        extractionCost: r.extractionCost as ExtractionCost | null,
      })),
    })),
    total,
  };
}

export async function getMiningBodyBySlug(slug: string): Promise<MiningBody | null> {
  const body = await prisma.miningBody.findUnique({
    where: { slug },
    include: {
      resources: true,
    },
  });

  if (!body) return null;

  return {
    ...body,
    bodyType: body.bodyType as MiningBodyType,
    spectralType: body.spectralType as SpectralType | null,
    orbitalFamily: body.orbitalFamily as OrbitalFamily | null,
    trajectoryStatus: body.trajectoryStatus as TrajectoryStatus | null,
    valueConfidence: body.valueConfidence as ValueConfidence | null,
    missionHistory: body.missionHistory ? JSON.parse(body.missionHistory) : null,
    composition: body.composition ? JSON.parse(body.composition) : null,
    resources: body.resources.map(r => ({
      ...r,
      category: r.category as MiningResourceCategory,
      extractionCost: r.extractionCost as ExtractionCost | null,
    })),
  };
}

export async function getCommodityPrices(options?: {
  category?: CommodityCategory;
  limit?: number;
  sortBy?: 'price' | 'name' | 'production';
  sortOrder?: 'asc' | 'desc';
}): Promise<CommodityPrice[]> {
  const {
    category,
    limit = 50,
    sortBy = 'price',
    sortOrder = 'desc',
  } = options || {};

  const where: Record<string, unknown> = {};
  if (category) where.category = category;

  const orderBy: Record<string, 'asc' | 'desc'> = {};
  switch (sortBy) {
    case 'price':
      orderBy.pricePerKg = sortOrder;
      break;
    case 'name':
      orderBy.name = sortOrder;
      break;
    case 'production':
      orderBy.annualProduction = sortOrder;
      break;
  }

  const commodities = await prisma.commodityPrice.findMany({
    where,
    orderBy,
    take: limit,
  });

  return commodities.map(c => ({
    ...c,
    category: c.category as CommodityCategory,
    priceVolatility: c.priceVolatility as PriceVolatility | null,
    spaceApplications: c.spaceApplications ? JSON.parse(c.spaceApplications) : null,
  }));
}

export async function getCommodityBySlug(slug: string): Promise<CommodityPrice | null> {
  const commodity = await prisma.commodityPrice.findUnique({
    where: { slug },
  });

  if (!commodity) return null;

  return {
    ...commodity,
    category: commodity.category as CommodityCategory,
    priceVolatility: commodity.priceVolatility as PriceVolatility | null,
    spaceApplications: commodity.spaceApplications ? JSON.parse(commodity.spaceApplications) : null,
  };
}

export async function getSpaceMiningStats() {
  const [
    totalBodies,
    totalResources,
    totalCommodities,
    bodiesByType,
    bodiesBySpectralType,
    accessibleBodies,
    totalEstimatedValue,
  ] = await Promise.all([
    prisma.miningBody.count(),
    prisma.miningResource.count(),
    prisma.commodityPrice.count(),
    prisma.miningBody.groupBy({
      by: ['bodyType'],
      _count: { bodyType: true },
    }),
    prisma.miningBody.groupBy({
      by: ['spectralType'],
      _count: { spectralType: true },
    }),
    prisma.miningBody.count({
      where: { trajectoryStatus: 'accessible' },
    }),
    prisma.miningBody.aggregate({
      _sum: { estimatedValue: true },
    }),
  ]);

  return {
    totalBodies,
    totalResources,
    totalCommodities,
    accessibleBodies,
    totalEstimatedValue: totalEstimatedValue._sum.estimatedValue || 0,
    bodiesByType: Object.fromEntries(
      bodiesByType.map(b => [b.bodyType, b._count.bodyType])
    ),
    bodiesBySpectralType: Object.fromEntries(
      bodiesBySpectralType
        .filter(b => b.spectralType)
        .map(b => [b.spectralType, b._count.spectralType])
    ),
  };
}

// ============================================================
// Value Calculation Utilities
// ============================================================

/**
 * Calculate the estimated value of a mining body based on its composition
 * and current commodity prices
 */
export async function calculateBodyValue(
  composition: Record<string, number>,
  totalMass: number
): Promise<{ totalValue: number; breakdown: Array<{ resource: string; mass: number; value: number }> }> {
  const commodities = await prisma.commodityPrice.findMany();
  const commodityMap = new Map(commodities.map(c => [c.slug, c.pricePerKg]));

  const breakdown: Array<{ resource: string; mass: number; value: number }> = [];
  let totalValue = 0;

  for (const [resource, percentage] of Object.entries(composition)) {
    const mass = totalMass * (percentage / 100);
    const pricePerKg = commodityMap.get(resource) || commodityMap.get(resource.toLowerCase()) || 0;
    const value = mass * pricePerKg;

    breakdown.push({ resource, mass, value });
    totalValue += value;
  }

  // Sort by value descending
  breakdown.sort((a, b) => b.value - a.value);

  return { totalValue, breakdown };
}

/**
 * Calculate delta-V accessibility score (0-100)
 * Lower delta-V = higher score
 */
export function calculateAccessibilityScore(deltaV: number): number {
  // Optimal: < 5 km/s (100 points)
  // Good: 5-7 km/s (75-99 points)
  // Moderate: 7-10 km/s (50-74 points)
  // Difficult: 10-15 km/s (25-49 points)
  // Very difficult: > 15 km/s (0-24 points)

  if (deltaV <= 5) return 100;
  if (deltaV <= 7) return 100 - ((deltaV - 5) / 2) * 25;
  if (deltaV <= 10) return 75 - ((deltaV - 7) / 3) * 25;
  if (deltaV <= 15) return 50 - ((deltaV - 10) / 5) * 25;
  return Math.max(0, 25 - ((deltaV - 15) / 10) * 25);
}

/**
 * Calculate mining profitability score based on value and accessibility
 */
export function calculateProfitabilityScore(
  estimatedValue: number,
  deltaV: number,
  valueConfidence: ValueConfidence
): number {
  const accessibilityScore = calculateAccessibilityScore(deltaV);

  // Value score (logarithmic scale, max 100)
  const valueScore = Math.min(100, Math.log10(estimatedValue) * 5);

  // Confidence multiplier
  const confidenceMultiplier =
    valueConfidence === 'high' ? 1.0 :
    valueConfidence === 'medium' ? 0.8 :
    valueConfidence === 'low' ? 0.5 : 0.3;

  // Combined score (weighted average)
  return ((valueScore * 0.4) + (accessibilityScore * 0.6)) * confidenceMultiplier;
}

/**
 * Get top mining targets by profitability
 */
export async function getTopMiningTargets(limit: number = 10): Promise<MiningBody[]> {
  const { bodies } = await getMiningBodies({ limit: 100 });

  // Calculate profitability scores
  const scoredBodies = bodies
    .filter(b => b.estimatedValue && b.deltaV)
    .map(body => ({
      body,
      score: calculateProfitabilityScore(
        body.estimatedValue!,
        body.deltaV!,
        body.valueConfidence || 'speculative'
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scoredBodies.map(s => s.body);
}

// Export seed data for reference
export {
  ASTEROIDS_SEED,
  MOONS_SEED,
  PLANETS_SEED,
  COMMODITY_PRICES_SEED,
  MINING_RESOURCES_SEED,
};
