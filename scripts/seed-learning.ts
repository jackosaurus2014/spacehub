/**
 * Seed script for the Learning Zone + Build Guides.
 *
 * Run:   npx tsx scripts/seed-learning.ts
 *
 * Creates:
 *   - 3 CourseModules with lessons (Orbital Mechanics 101, Intro to Rocket Propulsion,
 *     Space Law for Commercial Operators)
 *   - 3 BuildGuides (CanSat, High-Altitude Balloon Weather Station, Amateur Radio ISS
 *     Pass Receiver)
 *   - At least 2 lessons with interactive calculators and one quiz
 *
 * Idempotent: upserts by slug. Safe to re-run.
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface SeedLesson {
  slug: string;
  title: string;
  bodyMd: string;
  videoUrl?: string;
  interactiveType?: 'calculator' | 'simulator' | 'quiz' | 'none';
  interactiveConfig?: Record<string, unknown>;
  orderIndex: number;
}

interface SeedModule {
  slug: string;
  title: string;
  description: string;
  track: string;
  level: string;
  estimatedMinutes: number;
  published: boolean;
  orderIndex: number;
  lessons: SeedLesson[];
}

const MODULES: SeedModule[] = [
  {
    slug: 'orbital-mechanics-101',
    title: 'Orbital Mechanics 101',
    description:
      'A first course in astrodynamics. Work through Kepler, orbital elements, delta-v budgets, Hohmann transfers, station-keeping and rendezvous with real numbers and built-in calculators.',
    track: 'orbital-mechanics',
    level: 'beginner',
    estimatedMinutes: 180,
    published: true,
    orderIndex: 0,
    lessons: [
      {
        slug: 'keplers-laws',
        title: "Kepler's Laws",
        orderIndex: 0,
        interactiveType: 'quiz',
        bodyMd: `## The three laws

Johannes Kepler's three laws of planetary motion form the foundation of classical orbital mechanics.

1. **Law of Orbits** — Every planet moves on an elliptical path with the Sun at one focus.
2. **Law of Areas** — The line joining a planet and the Sun sweeps out equal areas in equal times.
3. **Law of Periods** — The square of the orbital period is proportional to the cube of the semi-major axis: \`T² = (4π²/μ) · a³\`.

\`μ\` is the gravitational parameter (\`G·M\`). For Earth, \`μ = 398,600.4418 km³/s²\`.

### Why they matter
Kepler's third law lets you predict orbital period from altitude alone. An ISS-altitude orbit (~400 km) has a semi-major axis of ~6,778 km and a period of about 92 minutes. GEO sits at 42,164 km and takes exactly a sidereal day.

### Intuition
- **First law**: orbits are not circles — circles are just a special case where eccentricity e = 0.
- **Second law**: spacecraft move fastest at periapsis and slowest at apoapsis. This is conservation of angular momentum.
- **Third law**: higher orbits are slower. Double the altitude and the period grows faster than linearly.

Test yourself below.`,
        interactiveConfig: {
          kind: 'quiz',
          title: "Check your understanding",
          questions: [
            {
              q: "Which of Kepler's laws implies that spacecraft move faster at periapsis than apoapsis?",
              options: ['First law', 'Second law', 'Third law', 'None of the above'],
              answer: 1,
              explain:
                "The Second Law (equal areas in equal times) forces higher angular velocity near periapsis.",
            },
            {
              q: "If you double the semi-major axis of an orbit, by approximately what factor does the period change?",
              options: ['√2 ≈ 1.41', '2', '2√2 ≈ 2.83', '4'],
              answer: 2,
              explain:
                "From T² ∝ a³: doubling a makes T² grow by 8, so T grows by √8 = 2√2 ≈ 2.83.",
            },
            {
              q: 'What is the gravitational parameter μ of Earth (approximately)?',
              options: [
                '6.67 × 10⁻¹¹ m³/kg·s²',
                '9.81 m/s²',
                '398,600 km³/s²',
                '1.327 × 10¹¹ km³/s²',
              ],
              answer: 2,
              explain: "μ = G·M for Earth ≈ 398,600 km³/s². The last option is μ for the Sun.",
            },
          ],
        },
      },
      {
        slug: 'orbital-elements',
        title: 'The Six Orbital Elements',
        orderIndex: 1,
        interactiveType: 'none',
        bodyMd: `## Six numbers that define an orbit

A Keplerian orbit is fully specified by six classical orbital elements:

| Element | Symbol | Meaning |
| --- | --- | --- |
| Semi-major axis | \`a\` | Size of the orbit |
| Eccentricity | \`e\` | Shape (0 = circular, 1 = parabolic) |
| Inclination | \`i\` | Tilt relative to the reference plane |
| RAAN | \`Ω\` | Longitude of ascending node — orientation |
| Argument of periapsis | \`ω\` | Where periapsis sits in the orbit |
| True anomaly | \`ν\` | Where the spacecraft is right now |

### Working with TLEs
Two-Line Element sets (TLEs) encode these elements in a compact ASCII format. Mean motion (rev/day) is converted to semi-major axis via Kepler's third law.

### Tips
- Inclination controls ground-track coverage. Sun-synchronous orbits hover near 97.4°–98.5° at typical LEO altitudes.
- RAAN precesses due to Earth's oblateness (J2); that is exactly what sun-synchronous orbits exploit.
- Eccentricity 0 makes ω undefined — most circularised LEO sats use "argument of latitude" instead.`,
      },
      {
        slug: 'delta-v-budgets',
        title: 'Delta-v Budgets',
        orderIndex: 2,
        interactiveType: 'none',
        bodyMd: `## Delta-v: the currency of space

Every maneuver in space costs **delta-v** (\`Δv\`) — a change in velocity. Your rocket's propellant reserve sets an upper bound on the total Δv you can ever perform.

### Typical budgets (LEO starting point)
| Maneuver | Δv (m/s) |
| --- | --- |
| LEO → GTO | ~2,440 |
| GTO → GEO (circularise) | ~1,470 |
| LEO → Lunar intercept | ~3,150 |
| LEO → Mars transfer | ~3,600 |
| Earth surface → LEO | ~9,400 (launch) |

### Tsiolkovsky rocket equation
\`\`\`
Δv = Isp · g₀ · ln(m₀ / m_f)
\`\`\`
Where \`Isp\` is specific impulse, \`g₀ = 9.80665 m/s²\`, \`m₀\` is initial (wet) mass and \`m_f\` is final (dry) mass.

In the next lesson you'll use a Hohmann transfer calculator to compute Δv for a real orbit change.`,
      },
      {
        slug: 'hohmann-transfer',
        title: 'Hohmann Transfers',
        orderIndex: 3,
        interactiveType: 'calculator',
        bodyMd: `## The cheapest two-impulse transfer

A **Hohmann transfer** moves a spacecraft between two coplanar circular orbits using exactly two impulses. It is nearly always the lowest-Δv option for moderate altitude changes.

Starting at radius \`r₁\` and ending at radius \`r₂\` (both measured from the central body's centre):

\`\`\`
Δv₁ = sqrt(μ/r₁) · ( sqrt(2r₂ / (r₁+r₂)) − 1 )
Δv₂ = sqrt(μ/r₂) · ( 1 − sqrt(2r₁ / (r₁+r₂)) )
Δv_total = Δv₁ + Δv₂
\`\`\`

Use the calculator below to try it. Earth's \`μ\` is 398,600.4418 km³/s². Earth's radius is ~6378 km, so for a 400 km altitude circular orbit use \`r = 6778 km\`.

### Worked example
LEO (400 km) → GEO (35,786 km):
- \`r₁\` = 6,778 km, \`r₂\` = 42,164 km
- Δv₁ ≈ 2,440 m/s, Δv₂ ≈ 1,470 m/s
- **Total Δv ≈ 3,910 m/s**

Compare with our budgets table in the previous lesson — this is exactly why getting to GEO is expensive.`,
        interactiveConfig: {
          kind: 'calculator',
          title: 'Hohmann Transfer Δv',
          description: 'Circular-to-circular transfer around Earth. r values are from the planet centre, not altitude.',
          constants: { MU: 398600.4418 },
          fields: [
            { key: 'r1', label: 'Starting radius r₁', unit: 'km', default: 6778, step: 1, min: 1 },
            { key: 'r2', label: 'Ending radius r₂', unit: 'km', default: 42164, step: 1, min: 1 },
          ],
          outputs: [
            {
              key: 'dv1',
              label: 'Δv₁ (departure burn)',
              unit: 'km/s',
              formula: 'sqrt(MU/r1) * (sqrt(2*r2 / (r1+r2)) - 1)',
              precision: 4,
            },
            {
              key: 'dv2',
              label: 'Δv₂ (arrival burn)',
              unit: 'km/s',
              formula: 'sqrt(MU/r2) * (1 - sqrt(2*r1 / (r1+r2)))',
              precision: 4,
            },
            {
              key: 'dvtot',
              label: 'Total Δv',
              unit: 'km/s',
              formula:
                'sqrt(MU/r1)*(sqrt(2*r2/(r1+r2))-1) + sqrt(MU/r2)*(1 - sqrt(2*r1/(r1+r2)))',
              precision: 4,
            },
            {
              key: 'ttransfer',
              label: 'Transfer time',
              unit: 'hours',
              formula: 'PI * sqrt( ((r1+r2)/2)^3 / MU ) / 3600',
              precision: 4,
            },
          ],
        },
      },
      {
        slug: 'station-keeping',
        title: 'Station-Keeping',
        orderIndex: 4,
        interactiveType: 'calculator',
        bodyMd: `## Fighting perturbations

A spacecraft in orbit is continuously nudged by:
- Earth oblateness (J2, J3, J4)
- Luni-solar gravity
- Solar radiation pressure
- Atmospheric drag (LEO)
- Third-body perturbations

**Station-keeping** is the regular use of small burns to stay within a tolerance box around the nominal orbit.

### Typical budgets
- GEO east-west: ~2 m/s/year
- GEO north-south (inclination): ~50 m/s/year (dominant cost)
- LEO drag makeup at ~400 km: ~5 to 20 m/s/year depending on solar activity

### Orbital period calculator
Use the third-law calculator below to compute the orbital period of a circular orbit at arbitrary altitude. This directly drives how often you need to revisit a control point.`,
        interactiveConfig: {
          kind: 'calculator',
          title: 'Circular orbit period',
          description: 'Period from semi-major axis using Kepler\'s third law (Earth).',
          constants: { MU: 398600.4418, PI2: Math.PI * 2 },
          fields: [
            { key: 'a', label: 'Semi-major axis a', unit: 'km', default: 6778, step: 1, min: 1 },
          ],
          outputs: [
            {
              key: 'period_s',
              label: 'Period',
              unit: 'seconds',
              formula: '2 * PI * sqrt(a^3 / MU)',
              precision: 5,
            },
            {
              key: 'period_min',
              label: 'Period',
              unit: 'minutes',
              formula: '2 * PI * sqrt(a^3 / MU) / 60',
              precision: 5,
            },
            {
              key: 'n_revday',
              label: 'Mean motion',
              unit: 'rev/day',
              formula: '86400 / (2 * PI * sqrt(a^3 / MU))',
              precision: 5,
            },
            {
              key: 'v_circ',
              label: 'Circular velocity',
              unit: 'km/s',
              formula: 'sqrt(MU / a)',
              precision: 5,
            },
          ],
        },
      },
      {
        slug: 'rendezvous',
        title: 'Rendezvous & Proximity Operations',
        orderIndex: 5,
        interactiveType: 'none',
        bodyMd: `## Getting two spacecraft to meet

Rendezvous uses a sequence of phasing and transfer maneuvers to catch a target. Key concepts:

### Clohessy-Wiltshire (CW) equations
Relative motion of a chaser near a target in a circular reference orbit. Linearised equations describe R-bar, V-bar, and H-bar motion — ideal for the final ~10 km of approach.

### Phasing
If the chaser is behind the target by Δθ in the same orbit, it needs to either drop to a lower (faster) orbit or climb higher (slower) and re-match. Time to close = phase angle ÷ rate difference.

### Final approach
1. **Far field** (100 km → 1 km) — direct transfer on V-bar or R-bar.
2. **Close approach** (1 km → 100 m) — driven by safe abort trajectories (natural motion circle).
3. **Berthing or docking** — free drift plus attitude control.

### Typical Δv costs
- First rendezvous (Gemini-class): ~200 m/s
- Modern autonomous docking: ~50-100 m/s
- ISS soft-capture braking: on the order of metres-per-second

Look up "passive abort" and "AAA — Automated Approach Algorithm" for how modern vehicles make this safe.`,
      },
    ],
  },
  {
    slug: 'intro-rocket-propulsion',
    title: 'Intro to Rocket Propulsion',
    description:
      'The rocket equation, specific impulse, chemical vs electric propulsion, and how engine cycles trade performance for complexity. A first course for engineers and technical PMs.',
    track: 'propulsion',
    level: 'beginner',
    estimatedMinutes: 120,
    published: true,
    orderIndex: 0,
    lessons: [
      {
        slug: 'rocket-equation',
        title: 'The Rocket Equation',
        orderIndex: 0,
        interactiveType: 'calculator',
        bodyMd: `## Tsiolkovsky

\`\`\`
Δv = Isp · g₀ · ln(m₀ / m_f)
\`\`\`

The rocket equation says your delta-v capability is logarithmic in mass ratio. That logarithm is unforgiving — doubling your Δv roughly squares your mass ratio requirement.

### Mass ratio intuition
- 90% propellant → mass ratio 10 → ln(10) ≈ 2.30
- 95% propellant → mass ratio 20 → ln(20) ≈ 3.00
- 99% propellant → mass ratio 100 → ln(100) ≈ 4.60

Use the calculator to see how Isp and mass ratio trade against each other.`,
        interactiveConfig: {
          kind: 'calculator',
          title: 'Rocket equation Δv',
          description: 'Compute Δv from specific impulse and mass ratio.',
          constants: { G0: 9.80665 },
          fields: [
            {
              key: 'Isp',
              label: 'Specific impulse Isp',
              unit: 's',
              default: 320,
              step: 1,
              help: 'Kerolox: 260-340. Hydrolox: 430-465. Hall-effect ion: 1500-3000.',
            },
            { key: 'm0', label: 'Initial (wet) mass m₀', unit: 'kg', default: 50000, step: 1 },
            { key: 'mf', label: 'Final (dry) mass m_f', unit: 'kg', default: 5000, step: 1 },
          ],
          outputs: [
            {
              key: 'dv',
              label: 'Δv',
              unit: 'm/s',
              formula: 'Isp * G0 * log(m0 / mf)',
              precision: 5,
            },
            {
              key: 'dvk',
              label: 'Δv',
              unit: 'km/s',
              formula: 'Isp * G0 * log(m0 / mf) / 1000',
              precision: 4,
            },
            {
              key: 'ratio',
              label: 'Mass ratio m₀ / m_f',
              unit: '',
              formula: 'm0 / mf',
              precision: 4,
            },
          ],
        },
      },
      {
        slug: 'specific-impulse',
        title: 'Specific Impulse',
        orderIndex: 1,
        interactiveType: 'none',
        bodyMd: `## Fuel economy for rockets

**Specific impulse** \`Isp\` (seconds) measures how efficiently a propulsion system uses propellant mass. Higher Isp means more Δv per kilogram of propellant.

### Typical values
| System | Isp (s) | Notes |
| --- | --- | --- |
| Solid (APCP) | 220-280 | Simple, reliable, low Isp |
| Kerolox (RP-1 + LOX) | 260-340 | Dense, storable oxidiser |
| Methalox (CH4 + LOX) | 320-370 | Balanced, reusable-friendly |
| Hydrolox (LH2 + LOX) | 430-465 | Best chemical but low density |
| Monoprop hydrazine | 220 | Simple thrusters |
| Hall-effect thrusters | 1,500-3,000 | Low thrust but very efficient |
| Gridded ion | 2,500-9,000 | Station-keeping, deep space |
| Nuclear thermal | 800-900 | Research, hot H₂ |

### The Isp vs thrust tradeoff
Electric propulsion has incredible Isp but tiny thrust. Chemical has strong thrust but mediocre Isp. Mission profile drives the choice: escape burns need thrust (chemical); long-duration plane changes favour efficiency (electric).`,
      },
      {
        slug: 'chemical-vs-electric',
        title: 'Chemical vs Electric Propulsion',
        orderIndex: 2,
        interactiveType: 'none',
        bodyMd: `## Two families of in-space propulsion

### Chemical
- **How**: combust propellant, expand through a nozzle.
- **Pros**: high thrust (kN to MN), simple plumbing, short burn times.
- **Cons**: Isp capped near ~450 s by chemistry.

### Electric
- **How**: accelerate ionised propellant (usually xenon or krypton) electromagnetically.
- **Pros**: Isp 1,500-9,000 s, great for high-Δv missions.
- **Cons**: thrust measured in mN, so burns last weeks to months.

### When to pick what
- Launch: chemical (thrust dominates).
- LEO constellation station-keeping: electric (propellant mass dominates life).
- Geostationary orbit raising: electric increasingly common, trades launch mass for months of raising.
- Landers / re-entry: chemical.
- Deep space cruise: electric where feasible.`,
      },
      {
        slug: 'engine-cycles',
        title: 'Engine Cycles',
        orderIndex: 3,
        interactiveType: 'quiz',
        bodyMd: `## Four families of chemical engine cycle

1. **Pressure-fed** — Propellant tanks are pressurised; no turbopumps. Simple, low performance, low chamber pressure. Used in spacecraft thrusters (AJ10, Dracos).
2. **Gas-generator** — A small fraction of propellant drives a turbopump; the exhaust is dumped overboard. Loses Isp but simple to engineer. Merlin, RS-27, F-1.
3. **Staged combustion** — Turbopump exhaust is routed back into the main chamber. Higher Isp at the cost of plumbing complexity and extreme pressures. RD-180, SSME, RS-25, Raptor (full-flow staged).
4. **Expander** — Fuel is heated by the nozzle and used to drive the turbopump before injection. Clean but limited in size. RL10, Vinci.

### Full-flow staged combustion
Both fuel-rich and oxidiser-rich preburners drive separate turbines. Nothing is wasted. SpaceX Raptor is the first operational full-flow staged combustion engine in history.

Check your understanding below.`,
        interactiveConfig: {
          kind: 'quiz',
          title: 'Engine cycles quiz',
          questions: [
            {
              q: 'Which cycle dumps preburner exhaust overboard?',
              options: ['Expander', 'Gas-generator', 'Staged combustion', 'Pressure-fed'],
              answer: 1,
              explain:
                'Gas-generator cycles run a small fraction of propellant through a turbine and dump that exhaust, giving up a few percent of Isp for simplicity.',
            },
            {
              q: 'Which engine is the first operational full-flow staged combustion design?',
              options: ['RD-180', 'Merlin 1D', 'Raptor', 'RS-25'],
              answer: 2,
              explain: 'SpaceX Raptor achieved first operational flight of a full-flow staged combustion engine.',
            },
            {
              q: 'What is a principal limitation of expander cycles?',
              options: [
                'They require extremely dense propellants',
                'They do not scale well to large engines',
                'They cannot be restarted in vacuum',
                'They are incompatible with cryogenic propellants',
              ],
              answer: 1,
              explain:
                "Expander cycles rely on nozzle heat to drive turbopumps and hit a size ceiling — hence they are common in upper stages (RL10, Vinci) but not boosters.",
            },
          ],
        },
      },
    ],
  },
  {
    slug: 'space-law-commercial',
    title: 'Space Law for Commercial Operators',
    description:
      'A practical tour of space law for startups and SMEs: the Outer Space Treaty, national licensing, ITU frequency coordination, and export control (ITAR/EAR). No law degree required.',
    track: 'space-law',
    level: 'intermediate',
    estimatedMinutes: 150,
    published: true,
    orderIndex: 0,
    lessons: [
      {
        slug: 'outer-space-treaty',
        title: 'The Outer Space Treaty',
        orderIndex: 0,
        interactiveType: 'none',
        bodyMd: `## The Magna Carta of space

The 1967 Outer Space Treaty (OST) is the foundation of international space law. 112 states are parties.

### Core principles
- **Free use** of outer space by all states, without discrimination.
- **Non-appropriation** — no state may claim sovereignty over the Moon or other celestial bodies.
- **Peaceful purposes** — no weapons of mass destruction in orbit or on celestial bodies.
- **State responsibility** — states bear international responsibility for national activities, *including* those of commercial operators under their jurisdiction.
- **Liability** — a launching state is liable for damage caused by its space objects.

### Why startups care
Article VI makes your government legally on the hook for *your* space activities. That is why national licensing regimes (FCC, FAA/OST, CAA, Arianespace national frame, etc.) exist — they are how the state supervises you to discharge its OST duties.`,
      },
      {
        slug: 'itu-frequency-coordination',
        title: 'ITU Frequency Coordination',
        orderIndex: 1,
        interactiveType: 'none',
        bodyMd: `## How you get spectrum

The International Telecommunication Union (ITU) administers the global radio spectrum. Every commercial satellite system must be **coordinated** through ITU, via the operator's national administration.

### The lifecycle
1. **API (Advance Publication Information)** — the earliest notification; signals your intent.
2. **Coordination Request** — detailed technical filings that start priority running against existing networks.
3. **Notification & BIU (Bringing Into Use)** — within seven years of filing, you must bring your network into use or lose priority.
4. **Registration** in the Master International Frequency Register.

### Practical tips
- File early. The date of your filing sets priority.
- Choose frequency bands that are commercially viable *and* coordinate-able. C, Ku and Ka bands are contested.
- Plan for successive tranches if your constellation is large — milestones in the 2019 US-led approach pushed this globally.
- Many ITU disputes are resolved bilaterally; build relationships with neighbours early.`,
      },
      {
        slug: 'fcc-filings',
        title: 'FCC Filings (US)',
        orderIndex: 2,
        interactiveType: 'none',
        bodyMd: `## If you are a US operator

The Federal Communications Commission (FCC) authorises satellite and earth-station operations for US-jurisdiction networks.

### Common filings
- **Part 25 application** — most commercial satellite systems (GSO or NGSO).
- **Part 5 experimental licence** — for short-duration technology demos.
- **Earth station licence** — any gateway or user terminal operating above low-power thresholds.

### Recent updates
- **Streamlined small-satellite authorisation** (<180 kg, <6 years) — faster processing for NGSO cubesats that meet hardware safety criteria.
- **5-year post-mission disposal rule** — FCC-licenced LEO satellites must de-orbit within 5 years of end-of-mission (tightened from the older 25-year guideline).
- **Space innovation agenda** — the Space Bureau stood up in 2023 consolidates satellite regulation.

### Timing
Plan ~6-12 months for a Part 25 application, longer for complex NGSO constellations. Debris-mitigation plans and link budgets are scrutinised closely.`,
      },
      {
        slug: 'export-control',
        title: 'Export Control: ITAR & EAR',
        orderIndex: 3,
        interactiveType: 'quiz',
        bodyMd: `## Two US regimes you cannot ignore

### ITAR — International Traffic in Arms Regulations
Administered by the US **State Department** (DDTC). Governs defence articles and services on the United States Munitions List (USML). Historically many satellites were USML-controlled.

### EAR — Export Administration Regulations
Administered by the US **Commerce Department** (BIS). Governs dual-use goods on the Commerce Control List (CCL), including most commercial satellites and components after the 2014 satellite export reform.

### Key concepts
- **Deemed exports** — disclosing controlled tech to a foreign national *inside* the US counts as an export.
- **Re-transfers** — moving items between foreign parties can require licenses even post-shipment.
- **Jurisdiction disputes** — if ITAR and EAR both seem to apply, file a Commodity Jurisdiction request with DDTC.

### Pragmatic advice
- Build export classifications into component selection early. A single USML part can "taint" an entire assembly.
- Document the manufacturer's classification (ECCN for EAR, USML category for ITAR).
- For non-US founders working in the US, deemed-export compliance is existential.`,
        interactiveConfig: {
          kind: 'quiz',
          title: 'Export control basics',
          questions: [
            {
              q: 'Which US agency administers ITAR?',
              options: [
                'Department of Commerce (BIS)',
                'Department of State (DDTC)',
                'Department of Defense (DoD)',
                'FCC',
              ],
              answer: 1,
              explain:
                'ITAR is administered by the State Department\'s Directorate of Defense Trade Controls (DDTC).',
            },
            {
              q: 'What is a "deemed export"?',
              options: [
                'A physical shipment across a border',
                'An export declared on a customs form',
                'Disclosing controlled tech or data to a foreign national in the US',
                'An export that has been waived by Treasury',
              ],
              answer: 2,
              explain:
                "Deemed exports occur when controlled technology is released to a foreign national in the US — for example, by email, meeting, or documentation.",
            },
            {
              q: 'Since 2014 satellite export reform, most commercial satellites are controlled under:',
              options: [
                'ITAR only',
                'EAR (with some specific items still on the USML)',
                'No export control',
                'WASSENAAR directly',
              ],
              answer: 1,
              explain:
                'The 2014 reform moved most commercial satellites to EAR jurisdiction (under ECCN 9A515), while sensitive items remain on the USML.',
            },
          ],
        },
      },
    ],
  },
];

// ---------- Build Guides ----------

interface Material {
  name: string;
  qty?: string;
  url?: string;
  notes?: string;
}

interface Step {
  title: string;
  body: string;
  imageUrl?: string;
}

interface SeedGuide {
  slug: string;
  title: string;
  description: string;
  track: string;
  difficulty: string;
  estimatedHours: number;
  published: boolean;
  materialsList: Material[];
  steps: Step[];
}

const GUIDES: SeedGuide[] = [
  {
    slug: 'build-a-cansat',
    title: 'Build a CanSat',
    description:
      'A beginner-friendly project: design, build and launch a soda-can-sized satellite on a hobby rocket or weather balloon. Log pressure, temperature and GPS to an SD card.',
    track: 'cansat',
    difficulty: 'beginner',
    estimatedHours: 20,
    published: true,
    materialsList: [
      { name: 'Empty soda can (330 ml)', qty: '1', notes: 'Wash and dry thoroughly.' },
      { name: 'Arduino Nano or Pico', qty: '1' },
      { name: 'BMP280 pressure/temperature sensor', qty: '1' },
      { name: 'u-blox NEO-6M GPS module', qty: '1' },
      { name: 'Micro SD card breakout + 8 GB card', qty: '1' },
      { name: 'LiPo 3.7 V 500 mAh', qty: '1', notes: 'Tape well; keep away from sharp edges.' },
      { name: '433 MHz LoRa radio module', qty: '1', notes: 'Optional telemetry downlink.' },
      { name: 'Parachute (~25 cm dia.)', qty: '1' },
      { name: 'Prototype PCB or perfboard', qty: '1' },
      { name: 'Jumper wires, solder, heat-shrink', qty: 'set' },
    ],
    steps: [
      {
        title: 'Plan your mission',
        body:
          'Define the objective: maximum altitude, sample rate, payload mass, recovery method. Keep the wet mass under ~350 g for safe recovery on a small parachute. Sketch the stack so everything fits inside the can with the battery at the bottom.',
      },
      {
        title: 'Wire up and bench-test the sensors',
        body:
          'On a breadboard, connect the Arduino to the BMP280 (I2C), GPS (UART) and SD card (SPI). Print one reading per second over serial for an hour to check for lockups. Verify GPS fix outdoors.',
      },
      {
        title: 'Build the flight software',
        body:
          'Write a single loop: sample → timestamp → write to SD → optional LoRa packet. Use a monotonic millis timer rather than delays to avoid drift. Store failures into a separate log file.',
      },
      {
        title: 'Transfer to a perfboard',
        body:
          'Lay out the perfboard compactly. Use wire-wrap or careful soldering; every gram counts. Secure the battery with Kapton tape and add a slide switch on the outside of the can.',
      },
      {
        title: 'Mechanical integration',
        body:
          'Drill or cut an access port in the can for the switch and serial/download. Pack foam to damp vibration. Attach a parachute via a swivel so it does not spin-lock the lines.',
      },
      {
        title: 'Range day',
        body:
          'Launch on a D- or E-class hobby rocket (or a weather balloon). Inspect the CanSat pre-flight, arm the switch at pad, log the serial output on recovery. Record ambient temperature for post-processing.',
      },
      {
        title: 'Post-flight analysis',
        body:
          'Plot altitude vs time and compare to your predicted profile. Look for dropouts in GPS (common under high-g) and fix the software or mounting for the next flight.',
      },
    ],
  },
  {
    slug: 'high-altitude-balloon-weather-station',
    title: 'High-Altitude Balloon Weather Station',
    description:
      'Fly a DIY weather station to 30 km+ on a latex weather balloon. Capture pressure, temperature, humidity, GPS track, and live video while complying with local aviation rules.',
    track: 'high-altitude-balloon',
    difficulty: 'intermediate',
    estimatedHours: 40,
    published: true,
    materialsList: [
      { name: 'Latex weather balloon (1200 g-1600 g)', qty: '1' },
      { name: 'Helium (or hydrogen) fill — ~3-5 m³', qty: '1' },
      { name: 'Nylon shroud line', qty: '10 m' },
      { name: 'Parachute (1 m dia., rated >1 kg)', qty: '1' },
      { name: 'Insulated foam payload box', qty: '1', notes: 'At -60 °C insulation matters.' },
      { name: 'Raspberry Pi Zero 2 W + camera', qty: '1' },
      { name: 'APRS tracker (LightAPRS or pico-tracker)', qty: '1', notes: 'Requires an amateur license to transmit.' },
      { name: 'BME280 temperature/pressure/humidity', qty: '1' },
      { name: 'Lithium primary batteries (e.g. L91)', qty: '6', notes: 'Li-primary outperforms Li-ion at -60 °C.' },
      { name: 'Hand warmer sachets', qty: '2', notes: 'Optional thermal buffer.' },
      { name: 'Cable ties and tape', qty: 'set' },
    ],
    steps: [
      {
        title: 'Check aviation regulations',
        body:
          'In the US, unmanned free balloons are regulated under FAR Part 101. In the UK, CAA-mandated NOTAMs may apply. File a NOTAM request with your aviation authority and plan launch/landing zones away from controlled airspace.',
      },
      {
        title: 'Predict the flight path',
        body:
          'Use a balloon trajectory predictor (e.g. habhub, CUSF) with your expected ascent rate (~5 m/s), burst altitude (30-35 km with 1600 g latex) and descent rate (~5 m/s on parachute). Rerun daily for 48 hours before launch.',
      },
      {
        title: 'Build the tracker',
        body:
          'Assemble an APRS (or LoRa) tracker with GPS. Test beacon rates — 1 per 60 s is usually enough. Set aprsfi or RadioLabs to push to your phone. For ground redundancy, also carry a cellphone GPS reporter that starts reporting below ~3 km on descent.',
      },
      {
        title: 'Sensor + camera payload',
        body:
          'Mount the BME280 outside the payload box (sensor in free airflow); keep the Pi inside the insulation. Configure the camera for 1080p video + a timelapse still every 15 seconds. Write timestamps to SD so you can align with ascent data.',
      },
      {
        title: 'Thermal and mechanical pack',
        body:
          'Use foam at least 25 mm thick on all sides. Tape handwarmers beside the GPS (it can cold-lock). Pad sharp edges so nothing cuts the shroud lines on descent. Weigh the fully-loaded payload and record it.',
      },
      {
        title: 'Fill and launch',
        body:
          'Fill the balloon to the neck-lift required for the chosen ascent rate (tables available online). Attach parachute *above* the payload so the balloon remnant cannot snag on descent. Release upwind of any obstacles.',
      },
      {
        title: 'Chase and recover',
        body:
          'Drive towards the predicted landing zone but keep at least 15-30 km behind during ascent (safety from burst debris). Listen/track live. After landing, approach carefully — payloads may end up in trees or water.',
      },
      {
        title: 'Process the data',
        body:
          'Plot altitude vs temperature — you should clearly see the tropopause inversion and warming into the stratosphere. Stitch the timelapse into a 60 s video.',
      },
    ],
  },
  {
    slug: 'amateur-radio-iss-pass-receiver',
    title: 'Amateur Radio ISS Pass Receiver',
    description:
      'Receive voice, SSTV and APRS from the International Space Station using an RTL-SDR and a simple Yagi antenna. Capture an SSTV image during a crew activation event.',
    track: 'amateur-radio',
    difficulty: 'beginner',
    estimatedHours: 8,
    published: true,
    materialsList: [
      { name: 'RTL-SDR Blog v4 dongle', qty: '1' },
      { name: '2m 3-element Yagi (handheld)', qty: '1', notes: 'Can be built from ribbon cable + wooden boom.' },
      { name: 'Coax cable (RG-58, <3 m)', qty: '1' },
      { name: 'SMA-to-MCX adapter', qty: '1', notes: 'Check your SDR connector.' },
      { name: 'Laptop running SDR# or Gqrx', qty: '1' },
      { name: 'MMSSTV or Robot36 app', qty: '1' },
      { name: 'Gpredict or heavens-above.com pass predictor', qty: '1' },
    ],
    steps: [
      {
        title: 'Predict an ISS pass',
        body:
          'Use Gpredict or heavens-above.com to find ISS passes above 30° maximum elevation in the next 48 hours. Note the AOS (acquisition of signal) time and azimuth.',
      },
      {
        title: 'Check ISS mode',
        body:
          'Look at ariss.org or amsat.org for currently active frequencies: voice downlink 145.800 MHz (FM, Doppler), APRS 145.825 MHz, or SSTV events on 145.800 MHz. Activations vary; SSTV campaigns happen a few times per year.',
      },
      {
        title: 'Build or mount the Yagi',
        body:
          'A 3-element 2 m Yagi can be built from scrap aluminium tube or even measured ribbon cable. Connect to the RTL-SDR through the shortest possible coax. Aim horizontally at AOS azimuth.',
      },
      {
        title: 'Configure the SDR',
        body:
          'Tune to 145.800 MHz, bandwidth 15 kHz FM, enable squelch ~20 dB SNR. Route audio through VB-Cable (Windows) or PulseAudio (Linux) to your SSTV decoder.',
      },
      {
        title: 'Compensate Doppler shift',
        body:
          'At AOS the ISS appears ~3.5 kHz high of rest frequency; at LOS it is ~3.5 kHz low. Either run SDR console in "Doppler track" mode via hamlib, or adjust tuning every 30 s manually.',
      },
      {
        title: 'Record the pass',
        body:
          'Start recording audio at AOS and keep tracking until LOS (~10 minutes max). If voice is active, you should hear clearly over the noise at max elevation. If SSTV, feed audio to MMSSTV/Robot36.',
      },
      {
        title: 'Decode SSTV',
        body:
          'MMSSTV will auto-detect the encoding (usually PD-120 or Robot 36). An image builds over ~3 minutes. Save the decoded image and submit to ariss-sstv.blogspot.com for your entry into the gallery.',
      },
      {
        title: 'Iterate',
        body:
          'Next pass, try pointing and tracking with elevation too (handheld Yagi is surprisingly effective). Listen for other satellites: NOAA APT on 137 MHz, weather birds, or SO-50 transponder passes with a FM rig.',
      },
    ],
  },
];

async function main() {
  console.log('[seed-learning] Starting...');

  for (const mod of MODULES) {
    console.log(`  Upserting module: ${mod.slug}`);
    const upserted = await prisma.courseModule.upsert({
      where: { slug: mod.slug },
      update: {
        title: mod.title,
        description: mod.description,
        track: mod.track,
        level: mod.level,
        estimatedMinutes: mod.estimatedMinutes,
        published: mod.published,
        orderIndex: mod.orderIndex,
      },
      create: {
        slug: mod.slug,
        title: mod.title,
        description: mod.description,
        track: mod.track,
        level: mod.level,
        estimatedMinutes: mod.estimatedMinutes,
        published: mod.published,
        orderIndex: mod.orderIndex,
      },
    });

    for (const lesson of mod.lessons) {
      await prisma.lesson.upsert({
        where: {
          moduleId_slug: { moduleId: upserted.id, slug: lesson.slug },
        },
        update: {
          title: lesson.title,
          bodyMd: lesson.bodyMd,
          videoUrl: lesson.videoUrl ?? null,
          interactiveType: lesson.interactiveType ?? 'none',
          interactiveConfig: lesson.interactiveConfig
            ? (lesson.interactiveConfig as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          orderIndex: lesson.orderIndex,
        },
        create: {
          moduleId: upserted.id,
          slug: lesson.slug,
          title: lesson.title,
          bodyMd: lesson.bodyMd,
          videoUrl: lesson.videoUrl ?? null,
          interactiveType: lesson.interactiveType ?? 'none',
          interactiveConfig: lesson.interactiveConfig
            ? (lesson.interactiveConfig as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          orderIndex: lesson.orderIndex,
        },
      });
    }
  }

  for (const guide of GUIDES) {
    console.log(`  Upserting build guide: ${guide.slug}`);
    await prisma.buildGuide.upsert({
      where: { slug: guide.slug },
      update: {
        title: guide.title,
        description: guide.description,
        track: guide.track,
        difficulty: guide.difficulty,
        estimatedHours: guide.estimatedHours,
        materialsList: guide.materialsList as unknown as Prisma.InputJsonValue,
        steps: guide.steps as unknown as Prisma.InputJsonValue,
        published: guide.published,
      },
      create: {
        slug: guide.slug,
        title: guide.title,
        description: guide.description,
        track: guide.track,
        difficulty: guide.difficulty,
        estimatedHours: guide.estimatedHours,
        materialsList: guide.materialsList as unknown as Prisma.InputJsonValue,
        steps: guide.steps as unknown as Prisma.InputJsonValue,
        published: guide.published,
      },
    });
  }

  const moduleCount = await prisma.courseModule.count();
  const lessonCount = await prisma.lesson.count();
  const guideCount = await prisma.buildGuide.count();
  console.log(
    `[seed-learning] Done. Modules: ${moduleCount}, Lessons: ${lessonCount}, Guides: ${guideCount}`,
  );
}

main()
  .catch((err) => {
    console.error('[seed-learning] Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
