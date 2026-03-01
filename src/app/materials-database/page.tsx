'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type MaterialCategory = 'Metal' | 'Composite' | 'Ceramic' | 'Polymer' | 'Thermal' | 'Shielding' | 'Coating';
type RadiationResistance = 'Excellent' | 'Good' | 'Moderate' | 'Low';

interface SpaceMaterial {
  name: string;
  category: MaterialCategory;
  applications: string[];
  properties: string;
  advantages: string[];
  disadvantages: string[];
  manufacturers: string[];
  tempRange: { min: number; max: number };
  radiationResistance: RadiationResistance;
}

// ────────────────────────────────────────
// Filter options
// ────────────────────────────────────────

const CATEGORY_FILTERS: { label: string; value: MaterialCategory | 'All' }[] = [
  { label: 'All Categories', value: 'All' },
  { label: 'Metals', value: 'Metal' },
  { label: 'Composites', value: 'Composite' },
  { label: 'Ceramics', value: 'Ceramic' },
  { label: 'Polymers', value: 'Polymer' },
  { label: 'Thermal Materials', value: 'Thermal' },
  { label: 'Shielding', value: 'Shielding' },
  { label: 'Coatings', value: 'Coating' },
];

const APPLICATION_FILTERS: { label: string; value: string }[] = [
  { label: 'All Applications', value: 'All' },
  { label: 'Structural', value: 'Structural' },
  { label: 'Thermal Protection', value: 'Thermal' },
  { label: 'Radiation Shielding', value: 'Radiation' },
  { label: 'Propulsion', value: 'Propulsion' },
  { label: 'Optical / Sensors', value: 'Optical' },
  { label: 'Electronics', value: 'Electronics' },
  { label: 'EVA / Crew Safety', value: 'EVA' },
];

const TEMP_RANGE_FILTERS: { label: string; value: string }[] = [
  { label: 'All Temp Ranges', value: 'All' },
  { label: 'Cryogenic (< -150 C)', value: 'cryo' },
  { label: 'Standard (-150 to 300 C)', value: 'standard' },
  { label: 'High Temp (300 to 1000 C)', value: 'high' },
  { label: 'Extreme (> 1000 C)', value: 'extreme' },
];

type SortKey = 'name' | 'radiation' | 'tempMax' | 'tempMin' | 'category';

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: 'Name', value: 'name' },
  { label: 'Radiation Resistance', value: 'radiation' },
  { label: 'Max Temperature', value: 'tempMax' },
  { label: 'Min Temperature', value: 'tempMin' },
  { label: 'Category', value: 'category' },
];

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function radiationRank(r: RadiationResistance): number {
  switch (r) {
    case 'Excellent': return 4;
    case 'Good': return 3;
    case 'Moderate': return 2;
    case 'Low': return 1;
  }
}

function categoryColor(cat: MaterialCategory): string {
  switch (cat) {
    case 'Metal': return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
    case 'Composite': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    case 'Ceramic': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    case 'Polymer': return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
    case 'Thermal': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    case 'Shielding': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    case 'Coating': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  }
}

function radiationColor(r: RadiationResistance): string {
  switch (r) {
    case 'Excellent': return 'text-emerald-400';
    case 'Good': return 'text-blue-400';
    case 'Moderate': return 'text-amber-400';
    case 'Low': return 'text-red-400';
  }
}

function radiationBg(r: RadiationResistance): string {
  switch (r) {
    case 'Excellent': return 'bg-emerald-400';
    case 'Good': return 'bg-blue-400';
    case 'Moderate': return 'bg-amber-400';
    case 'Low': return 'bg-red-400';
  }
}

function matchesApplication(mat: SpaceMaterial, filter: string): boolean {
  if (filter === 'All') return true;
  const lower = filter.toLowerCase();
  return mat.applications.some(a => a.toLowerCase().includes(lower));
}

function matchesTempRange(mat: SpaceMaterial, filter: string): boolean {
  if (filter === 'All') return true;
  switch (filter) {
    case 'cryo': return mat.tempRange.min < -150;
    case 'standard': return mat.tempRange.min >= -150 && mat.tempRange.max <= 300;
    case 'high': return mat.tempRange.max > 300 && mat.tempRange.max <= 1000;
    case 'extreme': return mat.tempRange.max > 1000;
    default: return true;
  }
}

// ────────────────────────────────────────
// Materials Data (28 materials)
// ────────────────────────────────────────

const MATERIALS: SpaceMaterial[] = [
  // ── Metals ──
  {
    name: 'Aluminum 6061-T6',
    category: 'Metal',
    applications: ['Structural bus frames', 'Fuel tanks', 'Fairings', 'Secondary structures'],
    properties: 'Density 2.70 g/cm3, tensile strength 310 MPa, thermal conductivity 167 W/mK. Age-hardened wrought alloy with excellent machinability.',
    advantages: ['Low cost and widely available', 'Excellent machinability', 'Good strength-to-weight ratio', 'Well-characterized flight heritage'],
    disadvantages: ['Lower strength than titanium alloys', 'Susceptible to stress corrosion cracking', 'Softens above 150 C'],
    manufacturers: ['Alcoa', 'Kaiser Aluminum', 'Constellium', 'Hindalco'],
    tempRange: { min: -269, max: 150 },
    radiationResistance: 'Moderate',
  },
  {
    name: 'Ti-6Al-4V (Grade 5 Titanium)',
    category: 'Metal',
    applications: ['Structural load-bearing members', 'Propulsion components', 'Fasteners', 'Pressure vessels'],
    properties: 'Density 4.43 g/cm3, tensile strength 950 MPa, thermal conductivity 6.7 W/mK. Alpha-beta titanium alloy, most widely used Ti alloy in aerospace.',
    advantages: ['Outstanding strength-to-weight ratio', 'Excellent corrosion resistance', 'Biocompatible for crew systems', 'Performs well at cryogenic temperatures'],
    disadvantages: ['Expensive raw material and machining', 'Low thermal conductivity', 'Difficult to weld without inert atmosphere', 'Galling risk on threaded interfaces'],
    manufacturers: ['TIMET', 'ATI', 'VSMPO-AVISMA', 'Toho Titanium'],
    tempRange: { min: -269, max: 400 },
    radiationResistance: 'Good',
  },
  {
    name: 'Inconel 718',
    category: 'Metal',
    applications: ['Propulsion turbopumps', 'Combustion chambers', 'Exhaust ducts', 'High-temp fasteners'],
    properties: 'Density 8.19 g/cm3, tensile strength 1240 MPa at RT, retains 1000 MPa at 650 C. Nickel-chromium superalloy precipitation-hardened with niobium.',
    advantages: ['Exceptional high-temperature strength', 'Oxidation and creep resistant', 'Weldable superalloy', 'Additive manufacturing compatible'],
    disadvantages: ['Very high density', 'Expensive', 'Difficult to machine conventionally', 'Limited above 700 C without coatings'],
    manufacturers: ['Special Metals (Huntington)', 'Haynes International', 'Carpenter Technology', 'VDM Metals'],
    tempRange: { min: -253, max: 700 },
    radiationResistance: 'Good',
  },
  {
    name: 'Beryllium',
    category: 'Metal',
    applications: ['Optical mirror substrates', 'Structural brackets', 'Thermal management', 'X-ray windows'],
    properties: 'Density 1.85 g/cm3, elastic modulus 287 GPa, thermal conductivity 200 W/mK. Lightest structural metal with exceptional stiffness-to-weight ratio.',
    advantages: ['Highest specific stiffness of any metal', 'Excellent thermal conductivity', 'Transparent to X-rays', 'Dimensionally stable'],
    disadvantages: ['Toxic dust requires specialized handling', 'Extremely expensive', 'Brittle at room temperature', 'Limited suppliers worldwide'],
    manufacturers: ['Materion', 'NGK Insulators', 'IBC Advanced Alloys'],
    tempRange: { min: -269, max: 600 },
    radiationResistance: 'Low',
  },
  {
    name: 'Invar 36 (FeNi36)',
    category: 'Metal',
    applications: ['Optical bench structures', 'Telescope metering rods', 'Composite tooling', 'Precision instrument mounts'],
    properties: 'Density 8.05 g/cm3, CTE 1.2 ppm/K (20-100 C), tensile strength 500 MPa. Iron-nickel alloy with near-zero thermal expansion at room temperature.',
    advantages: ['Ultra-low coefficient of thermal expansion', 'Dimensionally stable across temperature cycles', 'Good machinability', 'Predictable and repeatable behavior'],
    disadvantages: ['Very high density', 'Relatively low strength', 'Susceptible to corrosion without coatings', 'CTE rises sharply above 200 C'],
    manufacturers: ['Aperam', 'Carpenter Technology', 'City Special Metals'],
    tempRange: { min: -269, max: 230 },
    radiationResistance: 'Moderate',
  },
  {
    name: 'Kovar (ASTM F15)',
    category: 'Metal',
    applications: ['Electronic hermetic seals', 'Glass-to-metal seals', 'Microwave packages', 'Sensor housings'],
    properties: 'Density 8.36 g/cm3, CTE 5.1 ppm/K (matched to borosilicate glass), tensile strength 520 MPa. Iron-nickel-cobalt alloy.',
    advantages: ['CTE matched to common glasses and ceramics', 'Excellent hermetic sealing capability', 'Reliable in vacuum environments', 'Proven electronics packaging heritage'],
    disadvantages: ['Heavy', 'Lower strength than stainless steels', 'Requires nickel or gold plating for corrosion protection', 'Magnetic, which can interfere with sensors'],
    manufacturers: ['Carpenter Technology', 'Ed Fagan Inc.', 'National Electronic Alloys'],
    tempRange: { min: -80, max: 480 },
    radiationResistance: 'Moderate',
  },

  // ── Composites ──
  {
    name: 'Carbon Fiber Reinforced Polymer (CFRP)',
    category: 'Composite',
    applications: ['Structural primary and secondary structures', 'Solar array substrates', 'Antenna reflectors', 'Propellant tanks'],
    properties: 'Density 1.55-1.65 g/cm3, tensile strength 600-3500 MPa (fiber-dependent), CTE near-zero achievable with layup design. Continuous carbon fiber in epoxy or cyanate ester matrix.',
    advantages: ['Exceptional specific strength and stiffness', 'Tailorable CTE through layup design', 'Fatigue resistant', 'Corrosion immune'],
    disadvantages: ['Expensive fabrication and inspection', 'Susceptible to impact damage', 'Outgassing in vacuum requires bakeout', 'Moisture absorption degrades properties'],
    manufacturers: ['Toray', 'Hexcel', 'Solvay', 'Mitsubishi Chemical', 'Teijin'],
    tempRange: { min: -180, max: 260 },
    radiationResistance: 'Good',
  },
  {
    name: 'Kevlar (Aramid Fiber Composite)',
    category: 'Composite',
    applications: ['Micrometeoroid shielding (Whipple shields)', 'Pressure vessel overwrap', 'EVA suit layers', 'Cable insulation'],
    properties: 'Density 1.44 g/cm3, tensile strength 3620 MPa (fiber), excellent impact energy absorption. Para-aramid fiber in various matrix systems.',
    advantages: ['Outstanding impact resistance', 'Excellent energy absorption for ballistic protection', 'Low density', 'Flexible fiber form for soft goods'],
    disadvantages: ['Degrades under UV exposure', 'Absorbs moisture (up to 4%)', 'Poor compressive strength', 'Difficult to cut and machine'],
    manufacturers: ['DuPont', 'Teijin Aramid (Twaron)', 'Kolon Industries'],
    tempRange: { min: -196, max: 180 },
    radiationResistance: 'Moderate',
  },
  {
    name: 'Spectra (UHMWPE Fiber)',
    category: 'Composite',
    applications: ['Radiation shielding structures', 'Tethers', 'Micrometeoroid protection', 'Lightweight structural panels'],
    properties: 'Density 0.97 g/cm3 (floats on water), tensile strength 3500 MPa (fiber). Ultra-high-molecular-weight polyethylene with extremely high hydrogen content.',
    advantages: ['Highest specific strength of any commercial fiber', 'Excellent radiation shielding due to hydrogen content', 'Chemical resistant', 'Lightweight'],
    disadvantages: ['Very low melting point (150 C)', 'Poor adhesion to matrix resins', 'Creep under sustained load', 'Limited high-temperature use'],
    manufacturers: ['Honeywell (Spectra)', 'DSM (Dyneema)'],
    tempRange: { min: -150, max: 130 },
    radiationResistance: 'Excellent',
  },
  {
    name: 'Aluminum Honeycomb Core',
    category: 'Composite',
    applications: ['Structural sandwich panels', 'Solar array substrates', 'Equipment platforms', 'Antenna structures'],
    properties: 'Core density 16-192 kg/m3, crush strength 0.4-17 MPa (cell-size dependent). Hexagonal cell aluminum foil core bonded between CFRP or aluminum face sheets.',
    advantages: ['Exceptional stiffness-to-weight ratio in sandwich form', 'Very high energy absorption', 'Well-characterized for space', 'Customizable cell size and density'],
    disadvantages: ['Cannot carry in-plane loads alone', 'Moisture entrapment in cells', 'Complex repair procedures', 'Disbond risk at face-to-core interface'],
    manufacturers: ['Hexcel', 'Plascore', 'Euro-Composites', 'Argosy International'],
    tempRange: { min: -269, max: 177 },
    radiationResistance: 'Moderate',
  },

  // ── Ceramics ──
  {
    name: 'Silicon Carbide (SiC)',
    category: 'Ceramic',
    applications: ['Optical mirror substrates', 'Thermal protection tiles', 'Thruster nozzle liners', 'Semiconductor substrates'],
    properties: 'Density 3.21 g/cm3, elastic modulus 410 GPa, thermal conductivity 120 W/mK, hardness 2800 HV. Covalently bonded ceramic with diamond-like hardness.',
    advantages: ['Extreme hardness and wear resistance', 'High thermal conductivity for a ceramic', 'Lightweight mirror material', 'Stable to very high temperatures'],
    disadvantages: ['Brittle with no plastic deformation', 'Expensive to machine (diamond tooling required)', 'Difficult to join to other materials', 'Susceptible to thermal shock if rapid'],
    manufacturers: ['CoorsTek', 'Morgan Advanced Materials', 'Boostec (Mersen)', 'Rohm and Haas'],
    tempRange: { min: -269, max: 1600 },
    radiationResistance: 'Excellent',
  },
  {
    name: 'Alumina (Al2O3)',
    category: 'Ceramic',
    applications: ['Electronic substrate insulators', 'Thruster chamber liners', 'Optical windows', 'Structural insulators'],
    properties: 'Density 3.95 g/cm3, elastic modulus 370 GPa, thermal conductivity 30 W/mK, dielectric strength 17 kV/mm. Most widely used engineering ceramic.',
    advantages: ['Excellent electrical insulation', 'High-temperature stability', 'Chemically inert', 'Low cost for a technical ceramic'],
    disadvantages: ['Brittle', 'Low thermal shock resistance', 'Heavy compared to composites', 'Poor tensile strength'],
    manufacturers: ['CoorsTek', 'Kyocera', 'CeramTec', 'Morgan Advanced Materials'],
    tempRange: { min: -269, max: 1700 },
    radiationResistance: 'Good',
  },
  {
    name: 'Zirconia (ZrO2 / YSZ)',
    category: 'Ceramic',
    applications: ['Thermal barrier coatings on turbine blades', 'Solid oxide fuel cell electrolytes', 'Oxygen sensors', 'High-temp insulation'],
    properties: 'Density 5.68 g/cm3, thermal conductivity 2.0 W/mK, fracture toughness 8-10 MPa-m^0.5. Yttria-stabilized zirconia retains tetragonal phase for toughness.',
    advantages: ['Highest fracture toughness of any ceramic', 'Very low thermal conductivity (thermal barrier)', 'Ionic conductor at high temperature', 'Transformation toughening mechanism'],
    disadvantages: ['High density', 'Aging degradation in humid environments', 'Phase destabilization above 1200 C long-term', 'Expensive in high-purity forms'],
    manufacturers: ['Tosoh', 'Saint-Gobain', 'CoorsTek', 'Zircar Zirconia'],
    tempRange: { min: -100, max: 1500 },
    radiationResistance: 'Good',
  },
  {
    name: 'Fused Silica (SiO2)',
    category: 'Ceramic',
    applications: ['Optical windows and lenses', 'Thermal protection system tiles', 'Fiber optic components', 'UV-transparent viewports'],
    properties: 'Density 2.20 g/cm3, CTE 0.55 ppm/K, thermal conductivity 1.4 W/mK, transparent from UV to near-IR. Amorphous silicon dioxide with near-zero thermal expansion.',
    advantages: ['Near-zero thermal expansion', 'Excellent UV to IR transparency', 'Outstanding thermal shock resistance', 'Extremely low outgassing'],
    disadvantages: ['Low mechanical strength', 'Susceptible to alkali attack', 'Expensive in large optical grades', 'Crystallization risk above 1000 C'],
    manufacturers: ['Heraeus', 'Corning', 'Shin-Etsu', 'Momentive'],
    tempRange: { min: -269, max: 1100 },
    radiationResistance: 'Moderate',
  },

  // ── Polymers ──
  {
    name: 'Kapton (Polyimide Film)',
    category: 'Polymer',
    applications: ['Thermal blanket layers (MLI)', 'Flexible circuit substrates', 'Wire insulation', 'Solar array blankets'],
    properties: 'Density 1.42 g/cm3, tensile strength 231 MPa, dielectric strength 7700 V/mil, continuous use -269 to 400 C. Aromatic polyimide film.',
    advantages: ['Outstanding temperature range for a polymer', 'Excellent electrical insulation', 'Flexible and conformable', 'Radiation tolerant for an organic material'],
    disadvantages: ['Degrades under atomic oxygen in LEO', 'Absorbs moisture', 'Susceptible to hydrolysis', 'Requires protective coatings for long LEO missions'],
    manufacturers: ['DuPont', 'Kaneka', 'UBE Industries', 'Saint-Gobain'],
    tempRange: { min: -269, max: 400 },
    radiationResistance: 'Good',
  },
  {
    name: 'PTFE / Teflon',
    category: 'Polymer',
    applications: ['Wire insulation', 'Thermal blanket layers', 'Bearing surfaces', 'Propellant tank liners'],
    properties: 'Density 2.15 g/cm3, coefficient of friction 0.04, dielectric constant 2.1, continuous use -200 to 260 C. Fully fluorinated polymer with lowest friction of any solid.',
    advantages: ['Chemically inert to nearly all substances', 'Lowest friction coefficient of any polymer', 'Excellent electrical insulator', 'Non-flammable and non-toxic'],
    disadvantages: ['Poor radiation resistance (degrades under high doses)', 'Outgasses under vacuum', 'Low mechanical strength', 'Cold flow under sustained load'],
    manufacturers: ['Chemours (DuPont)', 'Daikin', 'AGC Chemicals', '3M (Dyneon)'],
    tempRange: { min: -200, max: 260 },
    radiationResistance: 'Low',
  },
  {
    name: 'Vectran (LCP Fiber)',
    category: 'Polymer',
    applications: ['Airbag landing systems', 'Tethers and cables', 'Inflatable structures', 'Pressure vessel reinforcement'],
    properties: 'Density 1.40 g/cm3, tensile strength 3200 MPa (fiber), elastic modulus 75 GPa. Thermotropic liquid crystal polymer with zero creep and high cut resistance.',
    advantages: ['Zero creep under sustained load', 'Excellent abrasion and cut resistance', 'High strength retention at elevated temperatures', 'Minimal moisture absorption'],
    disadvantages: ['Degrades under UV radiation', 'Lower modulus than carbon fiber', 'Limited compressive strength', 'Relatively expensive specialty fiber'],
    manufacturers: ['Kuraray'],
    tempRange: { min: -196, max: 230 },
    radiationResistance: 'Moderate',
  },
  {
    name: 'PEEK (Polyether Ether Ketone)',
    category: 'Polymer',
    applications: ['Structural brackets and fittings', 'Electronics enclosures', 'Bearing cages', 'Composite matrix resin'],
    properties: 'Density 1.32 g/cm3, tensile strength 100 MPa, continuous use to 260 C, glass transition 143 C. Semi-crystalline thermoplastic with outstanding chemical resistance.',
    advantages: ['High continuous use temperature for a thermoplastic', 'Excellent chemical resistance', 'Low outgassing in vacuum', 'Good radiation tolerance'],
    disadvantages: ['Expensive (USD 100+/kg)', 'Requires high processing temperatures (380 C+)', 'Lower strength than metals', 'Limited UV resistance'],
    manufacturers: ['Victrex', 'Solvay (KetaSpire)', 'Evonik (VESTAKEEP)', 'Arkema (Kepstan)'],
    tempRange: { min: -65, max: 260 },
    radiationResistance: 'Good',
  },

  // ── Thermal Materials ──
  {
    name: 'Multi-Layer Insulation (MLI) Blankets',
    category: 'Thermal',
    applications: ['Thermal protection on spacecraft exteriors', 'Cryogenic propellant tank insulation', 'Instrument thermal control', 'Space station modules'],
    properties: 'Effective emittance 0.005-0.02, typically 10-30 layers of aluminized Kapton or Mylar separated by Dacron netting. Primary passive thermal control for spacecraft.',
    advantages: ['Extremely effective radiative insulation', 'Lightweight', 'Passive with no power requirements', 'Proven on virtually every spacecraft'],
    disadvantages: ['Performance degrades with compression or puncture', 'Complex installation and inspection', 'Ineffective in atmosphere (convection bypasses)', 'Degraded by atomic oxygen in LEO'],
    manufacturers: ['Dunmore', 'Sheldahl (Multek)', 'MAP (Insulation Technologies)'],
    tempRange: { min: -269, max: 300 },
    radiationResistance: 'Good',
  },
  {
    name: 'Silica Aerogel',
    category: 'Thermal',
    applications: ['Thermal insulation for Mars rovers', 'Cryogenic insulation', 'Cosmic dust capture medium', 'Re-entry thermal protection'],
    properties: 'Density 0.001-0.5 g/cm3, thermal conductivity 0.015 W/mK (at 1 atm), 99.8% air by volume. Nano-porous silica solid with lowest thermal conductivity of any solid.',
    advantages: ['Lowest thermal conductivity of any known solid', 'Extremely lightweight', 'Transparent to visible light', 'Excellent particle capture capability'],
    disadvantages: ['Extremely fragile', 'Hygroscopic', 'Difficult to manufacture in large monoliths', 'Dusty unless treated with hydrophobic coating'],
    manufacturers: ['Aspen Aerogels', 'Cabot Corporation', 'BASF (Slentite)', 'Nano High-Tech'],
    tempRange: { min: -200, max: 650 },
    radiationResistance: 'Moderate',
  },
  {
    name: 'Phase Change Material (PCM) Packs',
    category: 'Thermal',
    applications: ['Electronics thermal buffering', 'Battery thermal management', 'Crew habitat temperature regulation', 'Payload thermal control'],
    properties: 'Latent heat 200-250 kJ/kg (paraffin waxes), melt point selectable from -40 to 120 C. Store and release thermal energy at constant temperature during phase transitions.',
    advantages: ['Absorb heat at constant temperature', 'Passive operation with no moving parts', 'Selectable transition temperature', 'Rechargeable through environment cycling'],
    disadvantages: ['Limited total energy storage capacity', 'Added mass to the system', 'Paraffin waxes are flammable', 'Volume change during phase transition'],
    manufacturers: ['Outlast Technologies', 'Phase Change Energy Solutions', 'Rubitherm', 'Entropy Solutions'],
    tempRange: { min: -40, max: 120 },
    radiationResistance: 'Moderate',
  },

  // ── Shielding ──
  {
    name: 'Tantalum',
    category: 'Shielding',
    applications: ['Radiation spot shielding for electronics', 'Capacitor anodes', 'Chemical processing components', 'X-ray shielding'],
    properties: 'Density 16.69 g/cm3, melting point 3017 C, excellent corrosion resistance. Refractory metal with very high Z for compact radiation shielding.',
    advantages: ['Highly effective gamma and X-ray shielding per volume', 'Outstanding corrosion resistance', 'Biocompatible', 'Very high melting point'],
    disadvantages: ['Extremely heavy', 'Very expensive and rare', 'Difficult to fabricate', 'Activates under neutron radiation'],
    manufacturers: ['H.C. Starck', 'Global Advanced Metals', 'Plansee', 'CBMM'],
    tempRange: { min: -269, max: 2500 },
    radiationResistance: 'Excellent',
  },
  {
    name: 'High-Density Polyethylene (HDPE) Radiation Shield',
    category: 'Shielding',
    applications: ['Radiation storm shelters', 'Crew habitation wall liners', 'Equipment radiation protection', 'EVA suit radiation layers'],
    properties: 'Density 0.95 g/cm3, high hydrogen content (14% by weight). Most effective material per unit mass for galactic cosmic ray (GCR) and solar particle event (SPE) shielding.',
    advantages: ['Best GCR shielding per unit mass', 'Inexpensive and abundant', 'Easy to fabricate and form', 'Non-toxic and crew-safe'],
    disadvantages: ['Low mechanical strength', 'Low melting point (130 C)', 'Flammable', 'Thick layers required for meaningful shielding'],
    manufacturers: ['Various petrochemical companies', 'Braskem', 'LyondellBasell', 'SABIC'],
    tempRange: { min: -100, max: 120 },
    radiationResistance: 'Excellent',
  },
  {
    name: 'Graded-Z Shielding',
    category: 'Shielding',
    applications: ['Electronics box radiation protection', 'Detector background reduction', 'Spacecraft wall composite', 'Particle physics instruments'],
    properties: 'Layered composite of high-Z (tantalum/tungsten), mid-Z (tin/copper), and low-Z (aluminum/polyethylene) materials. Attenuates primary radiation and absorbs secondary Bremsstrahlung.',
    advantages: ['Reduces secondary radiation compared to single-material shields', 'Optimized mass efficiency', 'Customizable to specific radiation environments', 'Well-characterized by NASA for deep-space missions'],
    disadvantages: ['Complex layered manufacturing', 'More expensive than simple shields', 'Requires mission-specific design optimization', 'Heavier than pure polyethylene for GCR-only environments'],
    manufacturers: ['Radiation Shielding Technologies', 'Lockheed Martin (internal)', 'Northrop Grumman (internal)'],
    tempRange: { min: -269, max: 500 },
    radiationResistance: 'Excellent',
  },

  // ── Coatings ──
  {
    name: 'AZ-93 White Thermal Control Paint',
    category: 'Coating',
    applications: ['Spacecraft radiator surfaces', 'External thermal control', 'Antenna dish coatings', 'Module exteriors'],
    properties: 'Solar absorptance 0.14-0.17, thermal emittance 0.91-0.93. Zinc-oxide pigment in potassium silicate binder. Inorganic coating with excellent UV and AO stability.',
    advantages: ['Low solar absorptance for passive cooling', 'High thermal emittance for heat rejection', 'UV-stable inorganic binder', 'Atomic oxygen resistant'],
    disadvantages: ['Brittle coating that can crack under flexing', 'Requires careful surface preparation', 'Not easily repaired in orbit', 'Absorptance degrades slowly with radiation dose'],
    manufacturers: ['AZ Technology', 'MAP Coatings'],
    tempRange: { min: -180, max: 260 },
    radiationResistance: 'Good',
  },
  {
    name: 'Black Chromium Oxide Coating',
    category: 'Coating',
    applications: ['Optical baffles and light traps', 'Stray light suppression', 'Thermal radiator enhancement', 'Instrument interiors'],
    properties: 'Solar absorptance 0.95-0.97, thermal emittance 0.70-0.85. Electroplated chromium oxide with high absorptance across visible and IR bands.',
    advantages: ['Extremely high solar absorptance', 'Durable electroplated surface', 'Excellent stray-light suppression', 'Vacuum stable'],
    disadvantages: ['Not suitable for passive cooling surfaces', 'Can cause overheating if misapplied', 'Requires electroplating facility', 'Surface preparation sensitive'],
    manufacturers: ['Allen Vanguard', 'Acktar (Magic Black alternative)', 'Epner Technology'],
    tempRange: { min: -196, max: 350 },
    radiationResistance: 'Good',
  },
  {
    name: 'Gold Foil / Gold Coating',
    category: 'Coating',
    applications: ['Infrared reflector on thermal blankets', 'Electrical connectors', 'Visor radiation protection (EVA helmets)', 'Sensor thermal shields'],
    properties: 'Infrared reflectance >98%, electrical resistivity 2.44 uOhm-cm, thickness typically 0.05-0.5 um (vapor deposited) or 20-50 um foil. Noble metal with unmatched IR performance.',
    advantages: ['Highest IR reflectance of any element', 'Does not oxidize or tarnish', 'Excellent electrical contact reliability', 'Biocompatible for crew applications'],
    disadvantages: ['Very expensive', 'Soft and easily scratched', 'Poor UV reflectance', 'Requires adhesion layers (Cr or Ti) on most substrates'],
    manufacturers: ['Epner Technology (Laser Gold)', 'Heraeus', 'Leybold', 'Materion'],
    tempRange: { min: -269, max: 500 },
    radiationResistance: 'Excellent',
  },
  {
    name: 'Nomex Honeycomb Core',
    category: 'Composite',
    applications: ['Lightweight sandwich panels', 'Interior cabin structures', 'Fairings', 'Non-structural panels'],
    properties: 'Core density 29-144 kg/m3, continuous use to 180 C. Aramid fiber paper formed into hexagonal cells and coated with phenolic resin. Lighter than aluminum honeycomb.',
    advantages: ['Excellent fire resistance and self-extinguishing', 'Very lightweight', 'Good electrical insulation', 'Radar transparent for radome applications'],
    disadvantages: ['Lower strength than aluminum honeycomb', 'Absorbs moisture over time', 'Cannot be used in high-temperature zones', 'More expensive than aluminum core'],
    manufacturers: ['Hexcel', 'Plascore', 'Euro-Composites', 'Schütz'],
    tempRange: { min: -196, max: 180 },
    radiationResistance: 'Moderate',
  },
];

// ────────────────────────────────────────
// Page Component
// ────────────────────────────────────────

export default function MaterialsDatabasePage() {
  const [categoryFilter, setCategoryFilter] = useState<MaterialCategory | 'All'>('All');
  const [applicationFilter, setApplicationFilter] = useState('All');
  const [tempRangeFilter, setTempRangeFilter] = useState('All');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode] = useState(false);
  const [compareSet, setCompareSet] = useState<Set<string>>(new Set());

  const toggleCard = (name: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleCompare = (name: string) => {
    setCompareSet(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else if (next.size < 4) next.add(name);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let results = MATERIALS;

    if (categoryFilter !== 'All') {
      results = results.filter(m => m.category === categoryFilter);
    }
    if (applicationFilter !== 'All') {
      results = results.filter(m => matchesApplication(m, applicationFilter));
    }
    if (tempRangeFilter !== 'All') {
      results = results.filter(m => matchesTempRange(m, tempRangeFilter));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.properties.toLowerCase().includes(q) ||
        m.applications.some(a => a.toLowerCase().includes(q)) ||
        m.manufacturers.some(mfr => mfr.toLowerCase().includes(q))
      );
    }

    results = [...results].sort((a, b) => {
      switch (sortBy) {
        case 'radiation':
          return radiationRank(b.radiationResistance) - radiationRank(a.radiationResistance);
        case 'tempMax':
          return b.tempRange.max - a.tempRange.max;
        case 'tempMin':
          return a.tempRange.min - b.tempRange.min;
        case 'category':
          return a.category.localeCompare(b.category);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return results;
  }, [categoryFilter, applicationFilter, tempRangeFilter, sortBy, searchQuery]);

  // Comparison materials
  const comparedMaterials = useMemo(() =>
    MATERIALS.filter(m => compareSet.has(m.name)),
    [compareSet]
  );

  // Stats
  const totalMaterials = MATERIALS.length;
  const categoryCount = new Set(MATERIALS.map(m => m.category)).size;
  const excellentRadCount = MATERIALS.filter(m => m.radiationResistance === 'Excellent').length;
  const extremeTempCount = MATERIALS.filter(m => m.tempRange.max > 1000).length;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <AnimatedPageHeader
          title="Space Materials Database"
          subtitle="Comprehensive catalog of materials used in spacecraft construction -- metals, composites, ceramics, polymers, thermal systems, shielding, and coatings for aerospace engineers."
          icon={<span>&#x1F9EA;</span>}
          accentColor="emerald"
        />

        {/* Summary Stats */}
        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Materials', value: totalMaterials, color: 'text-emerald-400' },
              { label: 'Categories', value: categoryCount, color: 'text-blue-400' },
              { label: 'Excellent Rad. Resistance', value: excellentRadCount, color: 'text-purple-400' },
              { label: 'Extreme Temp (>1000 C)', value: extremeTempCount, color: 'text-orange-400' },
            ].map(stat => (
              <div
                key={stat.label}
                className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-4 text-center"
              >
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Filters & Controls */}
        <ScrollReveal delay={0.1}>
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 mb-8 space-y-4">
            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="search"
                placeholder="Search by name, property, application, or manufacturer..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-600/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              />
            </div>

            {/* Filter row */}
            <div className="flex flex-wrap gap-3">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as MaterialCategory | 'All')}
                className="bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {CATEGORY_FILTERS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              <select
                value={applicationFilter}
                onChange={e => setApplicationFilter(e.target.value)}
                className="bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {APPLICATION_FILTERS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              <select
                value={tempRangeFilter}
                onChange={e => setTempRangeFilter(e.target.value)}
                className="bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {TEMP_RANGE_FILTERS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortKey)}
                className="bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {SORT_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>Sort: {s.label}</option>
                ))}
              </select>

              {/* Compare toggle */}
              <button
                onClick={() => { setCompareMode(!compareMode); if (compareMode) setCompareSet(new Set()); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  compareMode
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-600/50 text-slate-300 hover:border-slate-500'
                }`}
              >
                {compareMode ? `Comparing (${compareSet.size}/4)` : 'Compare'}
              </button>

              <span className="ml-auto text-sm text-slate-400 self-center">
                {filtered.length} of {totalMaterials} materials
              </span>
            </div>
          </div>
        </ScrollReveal>

        {/* Comparison Panel */}
        {compareMode && comparedMaterials.length >= 2 && (
          <ScrollReveal>
            <div className="bg-slate-900/60 border border-emerald-500/30 rounded-xl p-5 mb-8 overflow-x-auto">
              <h2 className="text-lg font-semibold text-emerald-300 mb-4">Material Comparison</h2>
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-2 pr-4 text-slate-400 font-medium">Property</th>
                    {comparedMaterials.map(m => (
                      <th key={m.name} className="text-left py-2 px-3 text-slate-200 font-medium">{m.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  <tr>
                    <td className="py-2.5 pr-4 text-slate-400">Category</td>
                    {comparedMaterials.map(m => (
                      <td key={m.name} className="py-2.5 px-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${categoryColor(m.category)}`}>{m.category}</span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-slate-400">Temp Range</td>
                    {comparedMaterials.map(m => {
                      const isWidest = comparedMaterials.every(o => (m.tempRange.max - m.tempRange.min) >= (o.tempRange.max - o.tempRange.min));
                      return (
                        <td key={m.name} className={`py-2.5 px-3 font-mono text-xs ${isWidest ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {m.tempRange.min} C to {m.tempRange.max} C
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-slate-400">Radiation Resistance</td>
                    {comparedMaterials.map(m => {
                      const isBest = comparedMaterials.every(o => radiationRank(m.radiationResistance) >= radiationRank(o.radiationResistance));
                      return (
                        <td key={m.name} className={`py-2.5 px-3 font-medium ${isBest ? 'text-emerald-400' : radiationColor(m.radiationResistance)}`}>
                          {m.radiationResistance}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-slate-400">Advantages</td>
                    {comparedMaterials.map(m => (
                      <td key={m.name} className="py-2.5 px-3 text-xs text-slate-300">{m.advantages.slice(0, 2).join('; ')}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-slate-400">Disadvantages</td>
                    {comparedMaterials.map(m => (
                      <td key={m.name} className="py-2.5 px-3 text-xs text-slate-400">{m.disadvantages.slice(0, 2).join('; ')}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </ScrollReveal>
        )}

        {/* Material Cards */}
        <div className="space-y-4">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <p className="text-lg">No materials match your filters.</p>
              <button
                onClick={() => {
                  setCategoryFilter('All');
                  setApplicationFilter('All');
                  setTempRangeFilter('All');
                  setSearchQuery('');
                }}
                className="mt-3 text-emerald-400 hover:text-emerald-300 underline text-sm"
              >
                Clear all filters
              </button>
            </div>
          )}

          {filtered.map((mat, idx) => {
            const isExpanded = expandedCards.has(mat.name);
            const isCompared = compareSet.has(mat.name);
            return (
              <ScrollReveal key={mat.name} delay={Math.min(idx * 0.04, 0.4)}>
                <div className={`bg-slate-900/60 border rounded-xl overflow-hidden transition-colors ${
                  isCompared ? 'border-emerald-500/50' : 'border-slate-700/50 hover:border-slate-600/70'
                }`}>
                  {/* Card Header */}
                  <div className="flex items-center">
                    {compareMode && (
                      <button
                        onClick={() => toggleCompare(mat.name)}
                        className={`shrink-0 ml-4 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isCompared
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-500 hover:border-emerald-400'
                        }`}
                        aria-label={`Compare ${mat.name}`}
                      >
                        {isCompared && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => toggleCard(mat.name)}
                      className="flex-1 text-left px-5 py-4 flex items-center gap-4"
                    >
                      {/* Category badge */}
                      <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${categoryColor(mat.category)}`}>
                        {mat.category}
                      </span>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-slate-100 truncate">{mat.name}</h3>
                        <p className="text-sm text-slate-400 truncate">{mat.manufacturers.slice(0, 2).join(', ')}{mat.manufacturers.length > 2 ? ` +${mat.manufacturers.length - 2}` : ''}</p>
                      </div>

                      {/* Key specs (desktop) */}
                      <div className="hidden sm:flex items-center gap-6 text-sm shrink-0">
                        <div className="text-right">
                          <div className="text-slate-300 font-mono text-xs">{mat.tempRange.min} to {mat.tempRange.max} C</div>
                          <div className="text-xs text-slate-500">Temp Range</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${radiationBg(mat.radiationResistance)}`} />
                          <span className={`text-xs ${radiationColor(mat.radiationResistance)}`}>{mat.radiationResistance}</span>
                        </div>
                      </div>

                      {/* Expand arrow */}
                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Mobile specs row */}
                  <div className="sm:hidden px-5 pb-3 flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Temp:</span>{' '}
                      <span className="text-slate-200 font-mono text-xs">{mat.tempRange.min} to {mat.tempRange.max} C</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${radiationBg(mat.radiationResistance)}`} />
                      <span className={`text-xs ${radiationColor(mat.radiationResistance)}`}>{mat.radiationResistance}</span>
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="border-t border-slate-700/50 px-5 py-4 bg-slate-800/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {/* Temperature Range */}
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Temperature Range</div>
                          <div className="text-lg font-mono text-amber-400">{mat.tempRange.min} C to {mat.tempRange.max} C</div>
                          <div className="mt-2 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 via-emerald-500 to-orange-500 rounded-full"
                              style={{
                                marginLeft: `${Math.max(0, (mat.tempRange.min + 269) / (2500 + 269) * 100)}%`,
                                width: `${Math.max(5, (mat.tempRange.max - mat.tempRange.min) / (2500 + 269) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Radiation Resistance */}
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Radiation Resistance</div>
                          <div className={`text-lg font-medium flex items-center gap-2 ${radiationColor(mat.radiationResistance)}`}>
                            <span className={`w-2.5 h-2.5 rounded-full ${radiationBg(mat.radiationResistance)}`} />
                            {mat.radiationResistance}
                          </div>
                        </div>

                        {/* Category */}
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Category</div>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${categoryColor(mat.category)}`}>
                            {mat.category}
                          </span>
                        </div>
                      </div>

                      {/* Properties */}
                      <div className="mb-4">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Key Properties</div>
                        <p className="text-sm text-slate-300 leading-relaxed">{mat.properties}</p>
                      </div>

                      {/* Applications */}
                      <div className="mb-4">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Applications</div>
                        <div className="flex flex-wrap gap-2">
                          {mat.applications.map(app => (
                            <span key={app} className="text-xs bg-slate-700/50 text-slate-300 px-2.5 py-1 rounded-full">
                              {app}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Advantages & Disadvantages side by side */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Advantages</div>
                          <ul className="space-y-1">
                            {mat.advantages.map(adv => (
                              <li key={adv} className="text-sm text-emerald-300 flex items-start gap-2">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                {adv}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Disadvantages</div>
                          <ul className="space-y-1">
                            {mat.disadvantages.map(dis => (
                              <li key={dis} className="text-sm text-rose-300 flex items-start gap-2">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                {dis}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Manufacturers */}
                      <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Manufacturers</div>
                        <div className="flex flex-wrap gap-2">
                          {mat.manufacturers.map(mfr => (
                            <span key={mfr} className="text-xs bg-slate-700/30 text-slate-300 px-2.5 py-1 rounded-full border border-slate-600/30">
                              {mfr}
                            </span>
                          ))}
                        </div>

        <RelatedModules modules={PAGE_RELATIONS['materials-database']} />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* Category Legend */}
        <ScrollReveal delay={0.15}>
          <div className="mt-10 bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Material Category Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="flex gap-3">
                <span className="shrink-0 mt-0.5 w-3 h-3 rounded-full bg-sky-500/60" />
                <div>
                  <div className="font-medium text-sky-300">Metals</div>
                  <div className="text-slate-400">Load-bearing structures, fasteners, and propulsion hardware. Flight-proven with extensive databases.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 mt-0.5 w-3 h-3 rounded-full bg-orange-500/60" />
                <div>
                  <div className="font-medium text-orange-300">Composites</div>
                  <div className="text-slate-400">High-performance fiber-reinforced materials for lightweight structures and sandwich panels.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 mt-0.5 w-3 h-3 rounded-full bg-rose-500/60" />
                <div>
                  <div className="font-medium text-rose-300">Ceramics</div>
                  <div className="text-slate-400">Ultra-high-temperature materials for thermal protection, optical systems, and electrical insulation.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 mt-0.5 w-3 h-3 rounded-full bg-violet-500/60" />
                <div>
                  <div className="font-medium text-violet-300">Polymers</div>
                  <div className="text-slate-400">Films, fibers, and engineering plastics for insulation, seals, and flexible components.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 mt-0.5 w-3 h-3 rounded-full bg-amber-500/60" />
                <div>
                  <div className="font-medium text-amber-300">Thermal Materials</div>
                  <div className="text-slate-400">Passive thermal control systems including insulation, aerogels, and phase change materials.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 mt-0.5 w-3 h-3 rounded-full bg-emerald-500/60" />
                <div>
                  <div className="font-medium text-emerald-300">Shielding</div>
                  <div className="text-slate-400">Radiation protection materials for crew safety, electronics, and deep-space missions.</div>
                </div>
              </div>
              <div className="flex gap-3 sm:col-span-2 lg:col-span-1">
                <span className="shrink-0 mt-0.5 w-3 h-3 rounded-full bg-cyan-500/60" />
                <div>
                  <div className="font-medium text-cyan-300">Coatings</div>
                  <div className="text-slate-400">Surface treatments for thermal control, optical performance, and environmental protection.</div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Related Pages */}
        <ScrollReveal delay={0.2}>
          <div className="mt-8 mb-4">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Related Resources</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  href: '/blueprints',
                  title: 'Spacecraft Blueprints',
                  description: 'Technical drawings and system diagrams',
                  icon: '\u{1F4D0}',
                },
                {
                  href: '/tech-readiness',
                  title: 'Tech Readiness',
                  description: 'Technology readiness levels and assessments',
                  icon: '\u{1F52C}',
                },
                {
                  href: '/propulsion-database',
                  title: 'Propulsion Database',
                  description: 'Engines, thrusters, and propulsion systems',
                  icon: '\u{1F525}',
                },
                {
                  href: '/tools',
                  title: 'Engineering Tools',
                  description: 'Calculators, converters, and planning tools',
                  icon: '\u{1F6E0}\u{FE0F}',
                },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 hover:border-emerald-500/40 hover:bg-slate-800/60 transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{link.icon}</span>
                    <h3 className="font-medium text-slate-200 group-hover:text-emerald-300 transition-colors">
                      {link.title}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-400">{link.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Footer note */}
        <div className="text-center text-xs text-slate-500 py-8">
          Data compiled from manufacturer datasheets, NASA MAPTIS database, ESA ECSS standards, and MIL-HDBK-5 / MMPDS.
          Properties are nominal values; consult specifications for mission-critical applications.
        </div>
      </div>
    </main>
  );
}