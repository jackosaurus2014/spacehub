/**
 * Learning Zone — wave 2 (2026-08-26, consolidation Phase 3).
 *
 * Run:   npx tsx scripts/seed-learning-wave2.ts
 *
 * Evidence: /learn drew 25 users in 28 days on just 14 lessons, while half of
 * its six tracks (supply-chain, communications, kids) had NO modules at all.
 * This wave fills those three tracks with one full module each — 15 lessons,
 * five calculators, five quizzes — and cross-links to the live tools
 * (/link-budget-calculator, /satellite-tracker, /whats-overhead, /space-tycoon).
 *
 * Idempotent: upserts by slug. Safe to re-run. Same shapes as seed-learning.ts.
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

export const MODULES: SeedModule[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // SPACE COMMUNICATIONS 101
  // ═══════════════════════════════════════════════════════════════════════
  {
    slug: 'space-communications-101',
    title: 'Space Communications 101',
    description:
      'How a satellite talks to the ground. Frequency bands, antenna gain, the link budget, modulation and coding, and what ground stations and orbit altitude do to latency — with calculators you can trust.',
    track: 'communications',
    level: 'beginner',
    estimatedMinutes: 150,
    published: true,
    orderIndex: 0,
    lessons: [
      {
        slug: 'frequency-bands',
        title: 'Frequency Bands: Why S, X, Ku and Ka Exist',
        orderIndex: 0,
        interactiveType: 'quiz',
        bodyMd: `## Radio is the only option

Nothing physical moves between a spacecraft and Earth except electromagnetic waves, so every command, every image and every byte of telemetry rides on radio (or, increasingly, laser). Which *frequency* you use is the first decision in any communications design, and it is rarely free: bands are allocated internationally by the ITU and licensed nationally (the FCC in the US), so you get what you can coordinate, not what you want.

## The bands you will actually meet

| Band | Range (approx.) | Typical use in space | Character |
|---|---|---|---|
| UHF | 300 MHz – 1 GHz | CubeSat telemetry, amateur, some military | Cheap omni antennas; very low data rates; crowded |
| S | 2 – 4 GHz | TT&C (tracking, telemetry & command) for most satellites; NASA Near Space Network | Robust, forgiving of pointing, modest rates |
| X | 8 – 12 GHz | Earth-observation downlinks, deep space, government | Good rates, mature ground networks, little rain fade |
| Ku | 12 – 18 GHz | Broadcast TV, VSAT, Starlink user links | High rates; some rain fade |
| Ka | 26 – 40 GHz | High-throughput GEO, Starlink gateways, EO downlinks (hundreds of Mbps–Gbps) | Very high rates; serious rain fade; tight pointing |
| Optical | ~200 THz (1550 nm) | Inter-satellite links, NASA LCRD/DSOC, commercial terminals | Gbps+, no spectrum licensing; clouds kill ground links |

## Three things change as frequency goes up

1. **Bandwidth grows.** A 1 % fractional bandwidth is 20 MHz at S-band but 300 MHz at Ka. More bandwidth is more bits per second — that is the whole reason to climb.
2. **Antennas focus better.** For a fixed dish size, gain rises with the *square* of frequency (next lesson). A 1 m dish at Ka has about 16 dB more gain than at S-band.
3. **The atmosphere fights back.** Above ~10 GHz, rain, clouds and water vapour absorb signal. Ka-band links routinely carry 5–10 dB of rain margin or accept outages; X-band barely notices weather.

## The trade in one sentence

Low bands are robust and easy to point but slow; high bands are fast but demand precise pointing, bigger link margins, and more careful licensing. Most missions use **two**: a low-band TT&C link that always works, and a high-band payload downlink for the data that pays the bills.

## Where the rules come from

The ITU Radio Regulations divide spectrum by *service* (Fixed-Satellite, Mobile-Satellite, Earth Exploration-Satellite, Space Research…) and by region. An operator files through its national administration, coordinates with anyone already using the band, and then licences the ground stations too. Skipping this step is how you get a cease-and-desist instead of a downlink — the Space Law track covers the process in detail.`,
        interactiveConfig: {
          kind: 'quiz',
          title: 'Check your understanding',
          questions: [
            {
              q: 'Which band is most affected by rain fade?',
              options: ['S-band', 'X-band', 'Ku-band', 'Ka-band'],
              answer: 3,
              explain: 'Atmospheric attenuation rises steeply above ~10 GHz; Ka (26–40 GHz) needs the largest rain margin.',
            },
            {
              q: 'Why do most satellites carry a low-band TT&C link in addition to a high-band payload link?',
              options: [
                'Low bands are faster',
                'Low bands are robust and tolerant of poor pointing, so commands get through even when the spacecraft is tumbling',
                'High bands are illegal for commands',
                'It is required by the Outer Space Treaty',
              ],
              answer: 1,
              explain: 'TT&C must work in every attitude and every weather — that is exactly the strength of S-band and UHF.',
            },
            {
              q: 'For a fixed dish diameter, how does antenna gain change when frequency doubles?',
              options: ['It halves', 'It stays the same', 'It doubles (+3 dB)', 'It quadruples (+6 dB)'],
              answer: 3,
              explain: 'Gain scales with (D·f)², so doubling f multiplies gain by 4, i.e. +6 dB.',
            },
            {
              q: 'Who allocates frequency bands to services internationally?',
              options: ['NASA', 'The FCC', 'The ITU', 'The UN Security Council'],
              answer: 2,
              explain: 'The ITU Radio Regulations set the international table; national regulators like the FCC license within it.',
            },
          ],
        },
      },
      {
        slug: 'antenna-gain-and-eirp',
        title: 'Antenna Gain and EIRP',
        orderIndex: 1,
        interactiveType: 'calculator',
        bodyMd: `## An antenna does not amplify — it focuses

A transmitter puts out a fixed number of watts. An antenna cannot add power; it can only decide *where* the power goes. **Gain** is how much stronger the signal is in the antenna's favourite direction compared with an imaginary antenna that radiates equally in all directions (an *isotropic* radiator). It is quoted in **dBi** — decibels relative to isotropic.

For a parabolic dish of diameter \`D\` at wavelength \`λ\`:

\`\`\`
G = η · (π · D / λ)²          (as a ratio)
G_dBi = 10 · log10(G)
\`\`\`

\`η\` is the aperture efficiency — how much of the dish actually contributes — typically 0.5–0.7. Because \`λ = c / f\`, gain rises with the square of both diameter **and** frequency.

### Feel for the numbers (η = 0.6)

| Dish | S-band (2.2 GHz) | X-band (8.4 GHz) | Ka-band (26 GHz) |
|---|---|---|---|
| 0.3 m (CubeSat-class) | ~14 dBi | ~26 dBi | ~36 dBi |
| 1.2 m (small ground station) | ~26 dBi | ~38 dBi | ~48 dBi |
| 13 m (commercial teleport) | ~47 dBi | ~59 dBi | ~69 dBi |

## The price of gain: beamwidth

Focusing power means narrowing the beam. The half-power beamwidth of a dish is roughly:

\`\`\`
θ₃dB ≈ 70° · λ / D
\`\`\`

A 13 m dish at Ka-band has a beam about 0.06° wide — narrower than the Moon as seen from Earth. Point it 0.1° off and the link is gone. That is why high-gain, high-frequency systems need tracking mounts, star trackers on the spacecraft, and money.

## EIRP: what the far end actually sees

**Equivalent Isotropically Radiated Power** combines transmitter power and antenna gain into one number — the power an isotropic antenna would need to produce the same signal in the beam direction:

\`\`\`
EIRP (dBW) = P_tx (dBW) + G_tx (dBi) − line losses (dB)
\`\`\`

Decibels turn multiplication into addition, which is why every link engineer thinks in dB. 20 W is 13 dBW; add a 38 dBi dish and you have an EIRP of 51 dBW — the equivalent of a 126 kW isotropic transmitter.

## Design intuition

- Doubling transmitter power buys you **3 dB**. Doubling dish diameter buys you **6 dB**. Antennas are usually the cheaper decibel.
- On a small satellite, mass and pointing limit the antenna, so power and ground-station size do the work.
- On a ground station, the dish is cheap relative to a spacecraft — which is why 13 m teleport dishes exist.

Try the numbers below, then carry your EIRP into the next lesson.`,
        interactiveConfig: {
          kind: 'calculator',
          title: 'Dish Gain, Beamwidth and EIRP',
          description: 'Parabolic antenna. Frequency in GHz, diameter in metres, transmitter power in watts.',
          constants: { C: 0.299792458 },
          fields: [
            { key: 'D', label: 'Dish diameter D', unit: 'm', default: 1.2, step: 0.1, min: 0.05 },
            { key: 'f', label: 'Frequency f', unit: 'GHz', default: 8.4, step: 0.1, min: 0.1 },
            { key: 'eta', label: 'Aperture efficiency η', unit: '', default: 0.6, step: 0.05, min: 0.1, max: 1 },
            { key: 'P', label: 'Transmitter power', unit: 'W', default: 20, step: 1, min: 0.01 },
            { key: 'L', label: 'Line losses', unit: 'dB', default: 1, step: 0.1, min: 0 },
          ],
          outputs: [
            { key: 'gain', label: 'Antenna gain', unit: 'dBi', formula: '10*log10(eta * (PI*D*f/C)^2)', precision: 1 },
            { key: 'bw', label: 'Half-power beamwidth', unit: 'deg', formula: '70 * (C/f) / D', precision: 2 },
            { key: 'ptx', label: 'Transmitter power', unit: 'dBW', formula: '10*log10(P)', precision: 1 },
            { key: 'eirp', label: 'EIRP', unit: 'dBW', formula: '10*log10(P) + 10*log10(eta * (PI*D*f/C)^2) - L', precision: 1 },
          ],
        },
      },
      {
        slug: 'the-link-budget',
        title: 'The Link Budget',
        orderIndex: 2,
        interactiveType: 'calculator',
        bodyMd: `## The one calculation every comms engineer does

A link budget is an accounting sheet in decibels. You start with what the transmitter radiates, subtract everything the universe takes away, add what the receiver contributes, and see whether enough is left to decode bits at the rate you want. If the answer is "yes, with margin", the link works. If not, you change something — a bigger dish, more power, a lower data rate, a better code.

## Free-space path loss

Signal spreads out as it travels; power density falls with the square of distance. Expressed in dB, with distance in km and frequency in GHz:

\`\`\`
FSPL (dB) = 20·log10(d_km) + 20·log10(f_GHz) + 92.45
\`\`\`

Some anchors: a LEO satellite at 1,000 km slant range on X-band loses ~171 dB. A GEO satellite at 38,000 km on Ku-band loses ~206 dB. Mars at 2.5 AU on X-band loses ~282 dB — and yet Deep Space Network links close, because the other terms are enormous.

## Noise: the floor you are shouting over

The receiver's ability to hear is captured by **G/T** — antenna gain divided by system noise temperature, in dB/K. A hot, noisy receiver behind a huge dish and a cold, quiet receiver behind a small one can have the same G/T. Boltzmann's constant \`k\` sets the noise power per hertz: \`10·log10(k) = −228.6 dBW/K/Hz\`.

## Putting it together

\`\`\`
C/N₀ (dB-Hz) = EIRP − FSPL − other losses + G/T + 228.6
\`\`\`

\`C/N₀\` is carrier power over noise density — how much signal you have per hertz of noise. To decode bits you need energy *per bit* over noise:

\`\`\`
Eb/N₀ (dB) = C/N₀ − 10·log10(R_bits/s)
Margin (dB) = Eb/N₀ − Eb/N₀ required by your modulation & code
\`\`\`

The "required Eb/N₀" comes from the next lesson; QPSK with a decent forward-error-correction code needs around 2–5 dB for a 10⁻⁶ bit error rate. Engineers usually want **at least 3 dB of margin** after rain and pointing losses.

## The levers, ranked by cost

| Lever | Gain | What it costs |
|---|---|---|
| Halve the data rate | +3 dB | Half the data per pass |
| Double transmitter power | +3 dB | Mass, heat, solar array |
| Double ground dish diameter | +6 dB | Money on the ground (cheap) |
| Better coding (e.g. LDPC vs. convolutional) | 2–4 dB | Processing, licensing |
| Move from X to Ka | +10 dB antenna gain both ends | Rain margin, pointing |

## Worked example

EIRP 51 dBW (last lesson), 2,000 km slant range at 8.4 GHz, 3 dB of pointing and atmospheric losses, a 1.2 m ground station with G/T 20 dB/K, 100 Mbps:

- FSPL = 20·log10(2000) + 20·log10(8.4) + 92.45 = 66.0 + 18.5 + 92.45 = **176.9 dB**
- C/N₀ = 51 − 176.9 − 3 + 20 + 228.6 = **119.7 dB-Hz**
- Eb/N₀ = 119.7 − 10·log10(10⁸) = 119.7 − 80 = **39.7 dB**

Against a 4.5 dB requirement that is a luxurious 35 dB of margin — the point at which a designer starts trading the excess for a smaller antenna or a higher rate. Change the numbers below and watch which terms move the answer. The site's full tool at [/link-budget-calculator](/link-budget-calculator) adds rain models and antenna noise temperature.`,
        interactiveConfig: {
          kind: 'calculator',
          title: 'Link Budget',
          description: 'Single-hop link. Distance in km, frequency in GHz, data rate in Mbps. Boltzmann term is −228.6 dBW/K/Hz.',
          constants: { KB: 228.6 },
          fields: [
            { key: 'eirp', label: 'EIRP', unit: 'dBW', default: 51, step: 0.5 },
            { key: 'd', label: 'Slant range d', unit: 'km', default: 2000, step: 10, min: 1 },
            { key: 'f', label: 'Frequency f', unit: 'GHz', default: 8.4, step: 0.1, min: 0.1 },
            { key: 'loss', label: 'Other losses (pointing, atmosphere, rain)', unit: 'dB', default: 3, step: 0.5, min: 0 },
            { key: 'gt', label: 'Receiver G/T', unit: 'dB/K', default: 20, step: 0.5 },
            { key: 'rate', label: 'Data rate', unit: 'Mbps', default: 100, step: 1, min: 0.001 },
            { key: 'req', label: 'Required Eb/N₀', unit: 'dB', default: 4.5, step: 0.1 },
          ],
          outputs: [
            { key: 'fspl', label: 'Free-space path loss', unit: 'dB', formula: '20*log10(d) + 20*log10(f) + 92.45', precision: 1 },
            { key: 'cn0', label: 'C/N₀', unit: 'dB-Hz', formula: 'eirp - (20*log10(d) + 20*log10(f) + 92.45) - loss + gt + KB', precision: 1 },
            { key: 'ebn0', label: 'Eb/N₀', unit: 'dB', formula: 'eirp - (20*log10(d) + 20*log10(f) + 92.45) - loss + gt + KB - 10*log10(rate*1000000)', precision: 1 },
            { key: 'margin', label: 'Link margin', unit: 'dB', formula: 'eirp - (20*log10(d) + 20*log10(f) + 92.45) - loss + gt + KB - 10*log10(rate*1000000) - req', precision: 1 },
          ],
        },
      },
      {
        slug: 'modulation-and-coding',
        title: 'Modulation and Coding',
        orderIndex: 3,
        interactiveType: 'quiz',
        bodyMd: `## Turning bits into waves

A radio carrier is a sine wave. To carry information you change — *modulate* — something about it: its phase, its amplitude, or both. The scheme you choose sets two things at once: how many bits each symbol carries (spectral efficiency, in bits/s/Hz) and how much Eb/N₀ you need to tell the symbols apart (robustness).

| Scheme | Bits per symbol | Required Eb/N₀ for BER 10⁻⁶ (uncoded) | Used for |
|---|---|---|---|
| BPSK | 1 | ~10.5 dB | TT&C, deep space, CubeSats |
| QPSK | 2 | ~10.5 dB | The workhorse: EO downlinks, DVB-S2, most everything |
| 8PSK | 3 | ~14 dB | High-rate downlinks with margin to spare |
| 16APSK / 16QAM | 4 | ~14.5 dB | GEO broadband, high-throughput links |
| 32APSK | 5 | ~18 dB | Best case, clear sky, big dishes |

QPSK is the sweet spot because it carries two bits per symbol for the *same* Eb/N₀ as BPSK — a free doubling of rate. Beyond QPSK, every extra bit per symbol costs several dB.

## Coding: spend bandwidth, save power

**Forward error correction (FEC)** adds structured redundancy so the receiver can repair errors without asking for retransmission — essential when the round trip is 8 minutes to Mars or the pass ends in 40 seconds. The code *rate* is the fraction of transmitted bits that are real data: rate 1/2 sends two bits for every one of yours.

| Code family | Typical coding gain | Notes |
|---|---|---|
| Convolutional (Viterbi), r=1/2 | ~5 dB | 1970s–2000s standard; simple |
| Reed–Solomon + convolutional | ~7 dB | Voyager, early CCSDS |
| Turbo codes | ~8–9 dB | Deep space from the 2000s |
| LDPC (DVB-S2, CCSDS) | ~9–10 dB, within ~1 dB of the Shannon limit | Today's default for everything serious |

With LDPC rate 1/2, QPSK closes at roughly **1.5–2 dB** Eb/N₀ instead of 10.5. That 8+ dB is worth more than a 2.5× bigger dish — which is why nobody flies uncoded links anymore.

## Adaptive coding and modulation (ACM)

Weather and elevation angle change the link minute by minute. Modern standards (DVB-S2/S2X, and the CCSDS equivalents) let the transmitter switch MODCOD on the fly: 32APSK in clear sky at high elevation, dropping to QPSK 1/2 when rain arrives. Throughput rises and falls, but the link never breaks. Starlink, Ka-band GEO broadband and modern EO downlinks all do this.

## Shannon's ceiling

There is a hard limit: \`C = B · log2(1 + S/N)\`. No modulation or code can carry more than the channel capacity. LDPC codes get within a decibel of it, so remaining gains come from more **bandwidth** (higher bands, optical) or more **S/N** (bigger antennas, more power) — not cleverer coding.`,
        interactiveConfig: {
          kind: 'quiz',
          title: 'Check your understanding',
          questions: [
            {
              q: 'Why is QPSK preferred over BPSK on most links?',
              options: [
                'It needs less bandwidth per symbol',
                'It carries 2 bits per symbol at the same required Eb/N₀ as BPSK',
                'It does not need coding',
                'It is immune to rain fade',
              ],
              answer: 1,
              explain: 'QPSK doubles the bit rate for the same energy per bit — effectively free.',
            },
            {
              q: 'A rate-1/2 code means:',
              options: [
                'Half of the transmitted bits are your data; the rest is redundancy',
                'The data rate is doubled',
                'Only half the packets are corrected',
                'The carrier frequency is halved',
              ],
              answer: 0,
              explain: 'Code rate = data bits / transmitted bits. Rate 1/2 sends two bits for every information bit.',
            },
            {
              q: 'Roughly how close do modern LDPC codes get to the Shannon limit?',
              options: ['About 10 dB', 'About 5 dB', 'Within ~1 dB', 'They exceed it'],
              answer: 2,
              explain: 'LDPC and turbo codes operate within about a decibel of capacity; nothing can exceed it.',
            },
            {
              q: 'What does adaptive coding and modulation (ACM) do when rain fade hits?',
              options: [
                'Increases transmitter power automatically',
                'Switches to a more robust MODCOD, trading throughput for link survival',
                'Retransmits every packet',
                'Switches to a lower frequency band',
              ],
              answer: 1,
              explain: 'ACM steps down (e.g., 16APSK → QPSK 1/2) so the link stays up at a lower rate.',
            },
          ],
        },
      },
      {
        slug: 'ground-stations-and-latency',
        title: 'Ground Stations, Passes and Latency',
        orderIndex: 4,
        interactiveType: 'calculator',
        bodyMd: `## A satellite is only useful when someone is listening

A LEO satellite sees any given ground station for a few minutes at a time, a few times a day. The rest of the orbit it is storing data and waiting. How much data you get down per day is therefore a *scheduling* problem as much as a link-budget one, and it drives the choice of ground network.

### How long is a pass?

At 500 km altitude the orbital period is about 94.6 minutes and a pass directly overhead lasts roughly 8–10 minutes horizon-to-horizon; most passes are lower in the sky and shorter, and usable time above a 10° elevation mask is often 5–7 minutes. A single mid-latitude station sees a polar-orbiting satellite on roughly 4–6 passes per day, clustered into two groups. Polar stations (Svalbard, Inuvik, Troll) see almost every orbit — which is why every Earth-observation operator wants time on them.

### Ground Station as a Service (GSaaS)

Ten years ago you built or leased dishes. Today you rent antenna minutes from networks — AWS Ground Station, KSAT, SSC, Leaf Space, Viasat RTE, ATLAS — and pay per pass or per minute. The trades: coverage (how many sites, how polar), supported bands (X and Ka downlink are the differentiators), scheduling flexibility, and whether your data lands in your cloud account or on a disk in Norway.

### Data relay: skip the ground

If passes are the bottleneck, talk to a satellite that is always in view instead. NASA's TDRSS relays did this for the Shuttle and ISS; commercial LEO relay constellations and optical inter-satellite links do it now. Starlink's laser mesh means a Starlink-equipped satellite is *always* connected. The cost is a second radio, and being a customer of another constellation.

## Latency: the speed of light is a hard constraint

Radio travels at 299,792 km/s. One-way time to a satellite directly overhead is just altitude ÷ c:

| Orbit | Altitude | One-way (zenith) | Round trip (bent pipe, user→sat→gateway→sat→user) |
|---|---|---|---|
| LEO (Starlink) | ~550 km | ~1.8 ms | ~7–8 ms + processing; real-world 25–50 ms |
| MEO (O3b) | ~8,000 km | ~27 ms | ~110 ms; real-world ~150 ms |
| GEO | 35,786 km | ~119 ms | ~480 ms; real-world 550–650 ms |
| Moon | ~384,400 km | ~1.3 s | ~2.6 s |
| Mars (closest) | ~55 million km | ~3 min | ~6 min |
| Mars (farthest) | ~400 million km | ~22 min | ~44 min |

The GEO number is why voice calls over old satellite phones felt awkward and why video-game latency from GEO broadband is unfixable. LEO constellations exist largely to delete those 500 ms. For the Moon, 2.6 seconds means rovers can be teleoperated — carefully. For Mars, they cannot; every rover is autonomous by necessity.

## Try it

Enter an altitude and see the orbital period, how many times a day it circles Earth, and the light-time. Then go watch the real thing: [/satellite-tracker](/satellite-tracker) shows live positions, and [/whats-overhead](/whats-overhead) tells you when the ISS passes your house. In Space Tycoon, the same physics sets how long your ships take to reach the Belt — see [/space-tycoon](/space-tycoon).`,
        interactiveConfig: {
          kind: 'calculator',
          title: 'Orbit Period and Light-Time',
          description: 'Circular orbit around Earth. Altitude in km above the mean surface (Earth radius 6,371 km).',
          constants: { MU: 398600.4418, RE: 6371, C: 299792.458 },
          fields: [
            { key: 'h', label: 'Altitude h', unit: 'km', default: 550, step: 10, min: 100 },
          ],
          outputs: [
            { key: 'period', label: 'Orbital period', unit: 'min', formula: '2*PI*sqrt((RE+h)^3/MU)/60', precision: 1 },
            { key: 'laps', label: 'Orbits per day', unit: '', formula: '1440 / (2*PI*sqrt((RE+h)^3/MU)/60)', precision: 2 },
            { key: 'speed', label: 'Orbital speed', unit: 'km/s', formula: 'sqrt(MU/(RE+h))', precision: 3 },
            { key: 'oneway', label: 'One-way light-time (zenith)', unit: 'ms', formula: 'h / C * 1000', precision: 2 },
            { key: 'rtt', label: 'Bent-pipe round trip (4 hops, zenith)', unit: 'ms', formula: '4 * h / C * 1000', precision: 1 },
          ],
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SPACE SUPPLY CHAIN FUNDAMENTALS
  // ═══════════════════════════════════════════════════════════════════════
  {
    slug: 'space-supply-chain-fundamentals',
    title: 'Space Supply Chain Fundamentals',
    description:
      'Why flight hardware takes a year to buy, what "space-qualified" actually means, how to read a bill of materials for risk, where export control bites, and what it really costs to get a kilogram to orbit.',
    track: 'supply-chain',
    level: 'intermediate',
    estimatedMinutes: 120,
    published: true,
    orderIndex: 0,
    lessons: [
      {
        slug: 'what-space-qualified-means',
        title: 'What "Space-Qualified" Actually Means',
        orderIndex: 0,
        interactiveType: 'quiz',
        bodyMd: `## Space is not just far away — it is hostile in specific ways

A part that works flawlessly on a lab bench can fail in orbit for reasons that have nothing to do with its electrical design:

- **Vacuum.** Plastics outgas; volatile compounds condense on cold optics. Lubricants evaporate. Anything with trapped air can burst.
- **Thermal cycling.** A LEO satellite swings between roughly −150 °C and +120 °C every 90 minutes, tens of thousands of times. Solder joints crack; mismatched materials pull apart.
- **Radiation.** Total ionising dose degrades transistors slowly; single-event effects — a single heavy ion flipping a bit or latching up a chip — happen instantly and randomly. GEO and polar orbits are much worse than the ISS's sheltered inclination.
- **Launch.** Ten minutes of violent vibration and acoustic load, then the shock of stage separation.
- **No repair.** Whatever fails, stays failed.

"Space-qualified" means a part has been shown — by test, by analysis, or by flight heritage — to survive the specific version of that environment your mission will see.

## The vocabulary

| Term | Meaning |
|---|---|
| **Rad-hard** | Designed and processed to tolerate radiation (typically ≥100 krad TID, latch-up immune). Expensive, slow, often a generation behind commercially. |
| **Rad-tolerant** | Commercial design, characterised and screened to a lower dose (say 20–50 krad). The NewSpace middle ground. |
| **COTS** | Commercial off-the-shelf. Not qualified by the vendor; qualified — if at all — by you, through your own testing. |
| **Screening** | Testing every part of a lot (burn-in, thermal cycling, X-ray) to weed out infant failures. |
| **Lot traceability** | Knowing which wafer, which date code, which factory. Without it, a qualification test on one batch proves nothing about the next. |
| **TRL** | Technology Readiness Level 1–9. TRL 9 = flown and proven in the actual environment. Investors and NASA both ask for it. |
| **Flight heritage** | "This exact part flew on these missions and worked." The most persuasive qualification there is — and unavailable to anything new. |

## The NewSpace bet

Traditional programmes buy rad-hard everything and take five years. Constellation builders do something different: use rad-tolerant or screened COTS parts, design so a single-event upset reboots a board rather than killing a satellite, and accept some attrition across hundreds of spacecraft. A 3-year design life at a tenth of the part cost, replenished by continuous launches, beats a 15-year design life for many businesses. The trade only works if you actually fly enough units to average the risk — a one-off deep-space probe cannot make it.

## What this means for procurement

Every part on a flight BOM needs a qualification *story*: vendor qualification data, your own test campaign, or heritage. Writing that story is often longer than the lead time — and the lead times, as the next lesson shows, are long.`,
        interactiveConfig: {
          kind: 'quiz',
          title: 'Check your understanding',
          questions: [
            {
              q: 'Which environment causes solder-joint fatigue in LEO?',
              options: ['Vacuum', 'Repeated thermal cycling every orbit', 'Micrometeoroids', 'Magnetic fields'],
              answer: 1,
              explain: 'Roughly 16 hot/cold swings a day for years fatigues joints between materials that expand differently.',
            },
            {
              q: 'What distinguishes rad-tolerant from rad-hard?',
              options: [
                'Rad-tolerant parts are always faster',
                'Rad-tolerant parts are commercial designs characterised to a lower dose; rad-hard parts are designed and processed for radiation',
                'They are the same thing',
                'Rad-hard parts are only used on the ISS',
              ],
              answer: 1,
              explain: 'Rad-hard is a design/process choice; rad-tolerant is a screening/characterisation choice on commercial silicon.',
            },
            {
              q: 'Why does lot traceability matter?',
              options: [
                'It is required for customs',
                'A qualification test on one batch says little about a different wafer or date code',
                'It reduces shipping costs',
                'It is only relevant for software',
              ],
              answer: 1,
              explain: 'Radiation and reliability behaviour vary lot to lot; you must know which lot you tested and which you flew.',
            },
            {
              q: 'For which mission does the "screened COTS, accept attrition" strategy work worst?',
              options: ['A 500-satellite LEO constellation', 'A one-off outer-planet probe', 'A cubesat swarm', 'A short-lived tech demo'],
              answer: 1,
              explain: 'Attrition only averages out across many units; a single irreplaceable spacecraft cannot afford the gamble.',
            },
          ],
        },
      },
      {
        slug: 'lead-times-and-the-long-pole',
        title: 'Lead Times and the Long Pole',
        orderIndex: 1,
        interactiveType: 'calculator',
        bodyMd: `## The schedule is set by the slowest part

Ask any programme manager what killed their launch date and the answer is rarely the design. It is the reaction wheel that quoted 30 weeks and shipped at 52, or the rad-hard FPGA that went on allocation. In a supply chain, the **long pole** — the single longest lead-time item plus everything that must happen after it arrives — sets the earliest possible ship date, and no amount of parallel work elsewhere shortens it.

## Typical flight-hardware lead times (2025–26, order-of-magnitude)

| Item | Typical lead | Why so long |
|---|---|---|
| Rad-hard FPGAs / processors | 40–70 weeks | Few fabs, small volumes, government priority allocation |
| Triple-junction solar cells / panels | 30–52 weeks | Two or three suppliers worldwide; capacity booked by constellations |
| Reaction wheels, star trackers | 26–52 weeks | Precision mechanisms, per-unit acceptance testing |
| Propulsion (thrusters, tanks, valves) | 26–60 weeks | Pressure-vessel certification, hot-fire acceptance |
| Space-grade connectors, harness | 12–30 weeks | Commodity parts with non-commodity screening |
| Batteries (space cells) | 20–40 weeks | Cell-lot matching, safety certification |
| Custom structures / machined parts | 8–20 weeks | Fast once the drawing is frozen — but the drawing rarely is |
| Launch slot (rideshare) | 6–18 months | Manifests fill a year ahead |

Two structural facts sit under those numbers. **The supplier base is thin** — many critical components have two or three vendors on Earth, and some have one. And **big buyers crowd out small ones**: a mega-constellation ordering 10,000 star trackers gets the line; your two units wait.

## Tactics that actually work

1. **Order long-lead items before the design is finished.** Freeze the interface, buy the part, design around it. Buying a reaction wheel you might not use is cheaper than a nine-month slip.
2. **Put lead time in the trade study.** A 20 % better part with 30 extra weeks of lead is usually the worse part.
3. **Buy spares in the same lot.** A replacement from a different lot may need re-qualification; a spare bought with the flight unit doesn't.
4. **Hold a schedule margin on the long pole specifically**, not spread evenly. Vendors slip in proportion to how exotic they are.
5. **Know your second source before you need it.** Next lesson.

## The critical path in one formula

\`\`\`
Earliest ship = max(lead times) + integration & test + margin
\`\`\`

Use the calculator to see how the long pole dominates. Notice that shaving ten weeks off any item other than the longest changes *nothing*.`,
        interactiveConfig: {
          kind: 'calculator',
          title: 'Critical Path: Long Pole + Integration',
          description: 'Lead times in weeks from purchase order to delivery. Integration & test starts when the last part arrives.',
          constants: {},
          fields: [
            { key: 'fpga', label: 'Rad-hard FPGA lead', unit: 'wk', default: 52, step: 1, min: 0 },
            { key: 'solar', label: 'Solar array lead', unit: 'wk', default: 40, step: 1, min: 0 },
            { key: 'wheels', label: 'Reaction wheels lead', unit: 'wk', default: 36, step: 1, min: 0 },
            { key: 'prop', label: 'Propulsion lead', unit: 'wk', default: 30, step: 1, min: 0 },
            { key: 'ait', label: 'Integration & test', unit: 'wk', default: 20, step: 1, min: 0 },
            { key: 'margin', label: 'Schedule margin on the long pole', unit: '%', default: 20, step: 5, min: 0 },
          ],
          outputs: [
            { key: 'pole', label: 'Long pole (longest lead)', unit: 'wk', formula: 'max(fpga, solar, wheels, prop)', precision: 0 },
            { key: 'ship', label: 'Earliest ship-ready', unit: 'wk', formula: 'max(fpga, solar, wheels, prop) * (1 + margin/100) + ait', precision: 1 },
            { key: 'months', label: 'Earliest ship-ready', unit: 'months', formula: '(max(fpga, solar, wheels, prop) * (1 + margin/100) + ait) / 4.345', precision: 1 },
          ],
        },
      },
      {
        slug: 'bom-risk-and-second-sources',
        title: 'BOM Risk and Second Sources',
        orderIndex: 2,
        interactiveType: 'calculator',
        bodyMd: `## Read the bill of materials like an underwriter

A flight BOM for a small satellite runs to a few thousand line items. Most are boring. A handful can end the programme. Risk-reading a BOM means finding those lines *before* the purchase orders go out.

## The four questions per line

1. **How many qualified sources exist?** One is a risk. One that is also a competitor's subsidiary is a bigger risk. One in a country that could restrict export tomorrow is the biggest.
2. **What is the lead time, and what is its variance?** A 40-week part that always ships at 40 is manageable. A 20-week part that sometimes ships at 60 is not.
3. **What happens if it doesn't come?** Is there a form-fit-function substitute? Would substituting force a re-qualification, a redesign of a board, or a redesign of the spacecraft?
4. **Is it obsolete or going obsolete?** Commercial silicon has a 3–5 year life; spacecraft programmes last longer. Last-time-buy notices arrive at the worst moment.

## Single-source exposure

The useful number is not "how many single-sourced parts" but **how much of the programme is sitting behind them**. Weight each single-sourced line by its replacement lead time and the cost of a redesign if it vanishes. A single-sourced $5 connector with a 6-week second-source qualification is noise. A single-sourced star tracker with no substitute and a 52-week lead is a programme-level risk that belongs on the risk register with a named owner.

## Second sources are a design decision, not a purchasing one

You cannot second-source a part after the board is laid out around its footprint and its quirks. Second sourcing has to be engineered in:

- **Design to the interface, not the part.** Pick a standard footprint, voltage, and protocol that two vendors satisfy.
- **Qualify both.** A second source you have never tested is a hope, not a plan.
- **Split the buy** — even 80/20 — so the second vendor's line stays warm and the first vendor knows they are not the only option.
- **Build vs. buy.** For some subsystems (structures, harness, simple electronics) the most reliable second source is your own shop.

## Obsolescence management

- Subscribe to vendor product-change notices (PCNs) for every active line.
- Keep a **lifetime buy** budget for parts with fewer than five years of expected availability.
- For processors and FPGAs, prefer families with a public long-term-supply commitment (the space vendors publish these; commercial ones rarely do).

## Score your BOM

The calculator below produces a simple exposure index: single-sourced lines weighted by lead time and redesign cost, relative to the whole programme. It is crude by design — the value is in arguing about the inputs with your engineers.`,
        interactiveConfig: {
          kind: 'calculator',
          title: 'Single-Source Exposure Index',
          description: 'Rough programme-level exposure. Redesign cost is what it would take to engineer around a vanished part.',
          constants: {},
          fields: [
            { key: 'lines', label: 'Critical BOM lines', unit: '', default: 40, step: 1, min: 1 },
            { key: 'single', label: 'Single-sourced critical lines', unit: '', default: 9, step: 1, min: 0 },
            { key: 'lead', label: 'Avg lead time of single-sourced lines', unit: 'wk', default: 38, step: 1, min: 0 },
            { key: 'redesign', label: 'Avg redesign cost if a part vanishes', unit: '$k', default: 250, step: 10, min: 0 },
            { key: 'budget', label: 'Programme budget', unit: '$M', default: 12, step: 0.5, min: 0.1 },
            { key: 'pfail', label: 'Annual chance a single source fails to deliver', unit: '%', default: 10, step: 1, min: 0, max: 100 },
          ],
          outputs: [
            { key: 'share', label: 'Share of critical lines single-sourced', unit: '%', formula: '100 * single / lines', precision: 1 },
            { key: 'expected', label: 'Expected annual redesign cost', unit: '$k', formula: 'single * (pfail/100) * redesign', precision: 0 },
            { key: 'expshare', label: 'Expected annual loss vs budget', unit: '%', formula: '100 * single * (pfail/100) * redesign / (budget*1000)', precision: 2 },
            { key: 'index', label: 'Exposure index (0 = none, 100 = severe)', unit: '', formula: 'min(100, (100 * single / lines) * (lead / 52) * (1 + (single * (pfail/100) * redesign) / (budget*1000)))', precision: 0 },
          ],
        },
      },
      {
        slug: 'export-control-in-the-supply-chain',
        title: 'Export Control in the Supply Chain',
        orderIndex: 3,
        interactiveType: 'quiz',
        bodyMd: `## The rule that follows the part

The Space Law track explains ITAR and the EAR from the operator's side. This lesson is about what they do to your *suppliers, engineers, and purchase orders* — because export control attaches to the hardware and the technical data, and it flows down the chain with them.

## The two US regimes in one paragraph each

**ITAR** (International Traffic in Arms Regulations, State Department/DDTC) covers items on the US Munitions List. Category XV is spacecraft and related articles: many satellite buses, certain components, and — critically — the *technical data* about them. An ITAR item cannot be exported, and its technical data cannot be shared with a foreign person, without a licence or agreement.

**EAR** (Export Administration Regulations, Commerce/BIS) covers dual-use items, with the "500-series" ECCNs (9A515, 9E515…) created in 2014 when most commercial satellites moved off the USML. Licences are often easier and many exports to allied countries are permitted under licence exceptions — but "easier" is not "none", and China, Russia and embargoed destinations are effectively closed.

Other countries have their own regimes (the EU dual-use regulation, the UK Export Control Order, Japan's FEFTA); a European supplier's part may carry *their* restrictions into your spacecraft.

## Where it bites in procurement

- **Deemed exports.** Showing a controlled drawing to a foreign-national engineer *inside the US* is an export. Hiring, subcontracting and even vendor site visits need clearance.
- **Flow-down.** When you buy a controlled part, you inherit its restrictions and must impose them on anyone downstream — integrators, test houses, launch providers.
- **Launch abroad.** Putting a US-built satellite on a non-US launcher is an export of the satellite. Technical Assistance Agreements for launch integration take months.
- **Data rooms and cloud.** Controlled technical data on a server accessible from abroad can be an export. Cloud regions and access controls are compliance decisions.
- **Marking and records.** Every controlled document must be marked; every export authorised and recorded, for five years.

## Practical programme hygiene

1. **Classify early.** Determine the jurisdiction (ITAR vs. EAR) and classification (USML category or ECCN) of every major subsystem before you buy it. Ask the vendor — they are obliged to know.
2. **Track nationality of everyone who touches controlled data**, including contractors and interns.
3. **Assume a launch or customer abroad** and start the licence clock when the design freezes, not when the ship date approaches.
4. **Design for exportability where you can**: choosing an EAR-controlled bus over an ITAR one can open markets and shorten every licence you ever file.

The penalties are real — fines in the millions, debarment, and, for wilful violations, prison. But most trouble comes from ignorance rather than malice: a drawing emailed to the wrong subcontractor, a demo to a visiting delegation. Process prevents it. SpaceNexus keeps an [Export Compliance Q&A](/export-compliance-qa) and an [Export Control Watch](/compliance) for the current state of the rules.`,
        interactiveConfig: {
          kind: 'quiz',
          title: 'Check your understanding',
          questions: [
            {
              q: 'A US engineer shows an ITAR-controlled drawing to a visiting non-US engineer at your facility in Colorado. Is this an export?',
              options: ['No — it never left the country', 'Yes — it is a deemed export and needs authorisation', 'Only if the drawing is printed', 'Only if money changes hands'],
              answer: 1,
              explain: 'Releasing controlled technical data to a foreign person, anywhere, is a deemed export.',
            },
            {
              q: 'Which regime covers most commercial satellites since the 2014 reform?',
              options: ['ITAR, USML Category XV', 'EAR, ECCN 9x515 series', 'The Outer Space Treaty', 'The ITU Radio Regulations'],
              answer: 1,
              explain: 'Most commercial satellites moved to the EAR "500-series" in 2014; certain capabilities remain on the USML.',
            },
            {
              q: 'What does "flow-down" mean?',
              options: [
                'Selling parts at a discount',
                'Restrictions on a controlled part must be imposed on everyone downstream who handles it',
                'Water-cooling in test chambers',
                'A launch-window term',
              ],
              answer: 1,
              explain: 'Buying a controlled part makes you responsible for controlling it through integrators, test houses and launchers.',
            },
            {
              q: 'When should the licence process for a foreign launch begin?',
              options: ['At shipment', 'When the design freezes', 'After the launch contract is signed', 'It is not needed for allies'],
              answer: 1,
              explain: 'Technical Assistance Agreements take months; start at design freeze so integration work can proceed legally.',
            },
          ],
        },
      },
      {
        slug: 'getting-a-kilogram-to-orbit',
        title: 'Getting a Kilogram to Orbit: Manifesting, Logistics and Insurance',
        orderIndex: 4,
        interactiveType: 'calculator',
        bodyMd: `## The last supplier is the launch provider

Everything upstream — the parts, the integration, the tests — ends in a shipping container going to a launch site. Launch is the largest single line in most small-satellite budgets and the least flexible: you buy a slot months or years ahead, on a vehicle whose schedule you do not control, to an orbit you can only partly choose.

## Dedicated vs. rideshare

| | Dedicated launch | Rideshare |
|---|---|---|
| Who | Electron, Firefly Alpha, Falcon 9 (for large payloads) | SpaceX Transporter/Bandwagon, aggregators (Exolaunch, ISILaunch, D-Orbit) |
| Cost (2025–26) | ~$7–10M for a 200–300 kg-class small launcher; ~$70M for a Falcon 9 | Roughly $6,000–6,500 per kg on Transporter (minimum ~50 kg), more via aggregators for small sats |
| Orbit | Yours: altitude, inclination, LTAN | Theirs: usually ~500–550 km SSO; adjust with your own propulsion or an orbital transfer vehicle |
| Schedule | Yours, within reason | Fixed; you miss it, you wait for the next |
| Risk | Single-point: your satellite is the mission | Shared: a stuck deployer or a neighbour's failure can affect you |

Rideshare made a 100 kg satellite launchable for under a million dollars — the single biggest reason NewSpace exists. But it moved the orbit problem onto the customer, which is why electric propulsion and orbital transfer vehicles (Impulse, Momentus, D-Orbit ION) became businesses.

## The costs that are not the $/kg

- **Integration and deployer fees.** The separation system, the fit checks, the adapter.
- **Transport.** A satellite travels in a conditioned container with shock loggers, often with a chaperone. Air freight of a Class-100 cleanroom in a box is not cheap.
- **Range and campaign.** Weeks at the launch site with a team, hotel bills, and a cleanroom rental.
- **Propellant loading**, if you ship dry (you usually must for hazardous propellants).
- **Insurance.**

## Insurance in three lines

*Pre-launch* covers the hardware from factory to ignition. *Launch* covers the ride — typically priced at 5–10 % of insured value for proven vehicles, more for new ones. *In-orbit* covers the first year(s) of operation and is where premiums have spiked after a run of GEO failures. Many small-sat operators self-insure launch: with ten satellites in a constellation, losing one is a budget line, not a catastrophe.

## Model it

The calculator adds up the true delivered cost of a rideshare satellite. Notice how insurance and integration together rival the headline $/kg. In **Space Tycoon** this exact trade — pay for the fast lane or accept the rideshare schedule, insure or self-insure — is a daily decision; the logistics costs on your cargo manifests follow the same shape. See [/space-tycoon](/space-tycoon) and, for the real thing, the [Launch Cost Calculator](/launch-cost-calculator).`,
        interactiveConfig: {
          kind: 'calculator',
          title: 'Delivered-to-Orbit Cost',
          description: 'Rideshare-style pricing. Hardware value is what you would insure.',
          constants: {},
          fields: [
            { key: 'mass', label: 'Satellite wet mass', unit: 'kg', default: 150, step: 5, min: 1 },
            { key: 'rate', label: 'Launch price', unit: '$/kg', default: 6500, step: 100, min: 0 },
            { key: 'integ', label: 'Integration, deployer & campaign', unit: '$k', default: 180, step: 10, min: 0 },
            { key: 'ship', label: 'Transport & handling', unit: '$k', default: 60, step: 5, min: 0 },
            { key: 'hw', label: 'Hardware value (insured)', unit: '$M', default: 4, step: 0.25, min: 0 },
            { key: 'prem', label: 'Launch insurance rate', unit: '%', default: 7, step: 0.5, min: 0 },
          ],
          outputs: [
            { key: 'launch', label: 'Launch (mass × rate)', unit: '$k', formula: 'mass * rate / 1000', precision: 0 },
            { key: 'ins', label: 'Launch insurance premium', unit: '$k', formula: '(hw*1000 + mass*rate/1000) * prem / 100', precision: 0 },
            { key: 'total', label: 'Total delivered cost', unit: '$k', formula: 'mass*rate/1000 + integ + ship + (hw*1000 + mass*rate/1000) * prem / 100', precision: 0 },
            { key: 'perkg', label: 'True cost per kg delivered', unit: '$/kg', formula: '1000 * (mass*rate/1000 + integ + ship + (hw*1000 + mass*rate/1000) * prem / 100) / mass', precision: 0 },
          ],
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SPACE FOR KIDS
  // ═══════════════════════════════════════════════════════════════════════
  {
    slug: 'rockets-orbits-and-astronauts',
    title: 'Rockets, Orbits and Astronauts',
    description:
      'A friendly first tour of space for curious kids (and grown-ups who want the simple version). Why rockets work, what an orbit really is, a trip past the planets, a day on the space station, and how to spot it from your garden.',
    track: 'kids',
    level: 'beginner',
    estimatedMinutes: 60,
    published: true,
    orderIndex: 0,
    lessons: [
      {
        slug: 'why-rockets-work',
        title: 'Why Rockets Work',
        orderIndex: 0,
        interactiveType: 'quiz',
        bodyMd: `## Try this with a balloon

Blow up a balloon and let it go without tying it. It zooms around the room! The air rushes out of the back, and the balloon shoots forward. That is *exactly* how a rocket works — just with a lot more push.

## Pushing and being pushed

A long time ago, a scientist called Isaac Newton noticed a rule that is always true: **every push has an equal push back the other way.** When you jump off a skateboard, the skateboard rolls backwards. When a rocket throws hot gas out of its bottom really, really fast, the gas pushes the rocket up.

The rocket does **not** push against the air. That is a common mix-up! Rockets work best in space, where there is no air at all, because there is nothing in the way.

## Why rockets are so big

A rocket has to carry everything it will ever throw out of the back — all its fuel — from the very start. Most of a rocket is a giant fuel tank. When the Saturn V rocket took astronauts to the Moon, it was as tall as a 36-storey building, and almost all of it was fuel. The bit with the astronauts in was about the size of a small car.

## Stages: throwing away the empty bits

Carrying empty tanks is a waste, so rockets are built in **stages**. When the first stage runs out of fuel, it falls away, and the next stage lights up. The rocket gets lighter and lighter and goes faster and faster.

Some rockets today, like SpaceX's Falcon 9, fly their first stage back and land it on its legs so it can be used again. That was science fiction when your parents were kids.

## How fast?

To get into orbit (the next lesson explains what that is), a rocket needs to reach about **28,000 kilometres an hour** — around 25 times faster than a jet airliner. It gets there in less than ten minutes. The astronauts feel about three times their normal weight pressing them into their seats.

## Words to remember

- **Thrust** — the push a rocket engine makes.
- **Stage** — one section of a rocket with its own engines and fuel.
- **Payload** — the useful thing the rocket is carrying: a satellite, a probe, or people.`,
        interactiveConfig: {
          kind: 'quiz',
          title: 'Rocket quiz',
          questions: [
            {
              q: 'What does a rocket push against to go up?',
              options: ['The air', 'The launch pad', 'Nothing — the gas it throws out pushes the rocket the other way', 'The Moon'],
              answer: 2,
              explain: 'Every push has an equal push back. Throwing gas out of the back pushes the rocket forward — even in empty space.',
            },
            {
              q: 'Why are rockets built in stages?',
              options: ['To look cool', 'So empty fuel tanks can be dropped and the rocket gets lighter', 'So more astronauts can fit', 'Because of the weather'],
              answer: 1,
              explain: 'Dropping the empty bits means the engines only have to push what is still useful.',
            },
            {
              q: 'About how fast does a rocket need to go to reach orbit?',
              options: ['280 km/h', '2,800 km/h', '28,000 km/h', '280,000 km/h'],
              answer: 2,
              explain: 'Around 28,000 km/h (about 7.8 km every second) — and it gets there in under ten minutes.',
            },
          ],
        },
      },
      {
        slug: 'what-is-an-orbit',
        title: 'What Is an Orbit?',
        orderIndex: 1,
        interactiveType: 'calculator',
        bodyMd: `## Falling and missing

Here is the strangest true thing in this whole course: **astronauts on the space station are falling.** All the time. They just keep missing the ground.

Imagine standing on a very tall mountain and throwing a ball. It curves down and lands. Throw it harder, and it lands farther away. Now imagine throwing it *so* hard that as it falls, the Earth curves away underneath it just as fast as it drops. The ball never lands. It goes all the way around and comes back to you. **That is an orbit.**

Isaac Newton drew this picture with a cannon on a mountain nearly 350 years ago, long before anyone could try it. He was right.

## Why astronauts float

Because they are falling! When you fall, you feel weightless — think of the tummy-drop moment on a rollercoaster. On the space station, that moment lasts for months. Gravity is still there — it is almost as strong as on the ground — but everything is falling together, so nothing presses on anything.

## Fast means low, slow means high

- The space station is about **400 km** up and goes around the Earth every **90 minutes** — 16 times a day. The astronauts see 16 sunrises every day!
- Weather and TV satellites sit much higher, at **36,000 km**. Up there an orbit takes exactly one day, so the satellite stays over the same spot on Earth. We call that *geostationary*.
- The Moon is 384,000 km away and takes about **27 days** to go around.

The higher you are, the slower you can go and still miss the ground.

## Try it

Pick a height and see how fast a satellite has to go, and how many laps of the Earth it does each day. Try 400 (the space station) and 36,000 (a TV satellite).`,
        interactiveConfig: {
          kind: 'calculator',
          title: 'How Fast to Stay in Orbit?',
          description: 'Type a height above the ground in kilometres.',
          constants: { MU: 398600.4418, RE: 6371 },
          fields: [
            { key: 'h', label: 'Height above the ground', unit: 'km', default: 400, step: 50, min: 150 },
          ],
          outputs: [
            { key: 'kmh', label: 'Speed needed', unit: 'km/h', formula: 'sqrt(MU/(RE+h)) * 3600', precision: 0 },
            { key: 'mph', label: 'Speed needed', unit: 'mph', formula: 'sqrt(MU/(RE+h)) * 3600 / 1.609344', precision: 0 },
            { key: 'lap', label: 'One lap of the Earth takes', unit: 'minutes', formula: '2*PI*sqrt((RE+h)^3/MU)/60', precision: 0 },
            { key: 'perday', label: 'Laps per day', unit: '', formula: '1440 / (2*PI*sqrt((RE+h)^3/MU)/60)', precision: 1 },
          ],
        },
      },
      {
        slug: 'a-tour-of-the-planets',
        title: 'A Tour of the Planets',
        orderIndex: 2,
        interactiveType: 'calculator',
        bodyMd: `## Eight planets, one Sun

Our Sun has eight planets going around it. Starting from the Sun and heading out, here is what you would find — and how long a spacecraft would take to get there.

**Mercury** — Tiny, grey and covered in craters like the Moon. Baking hot on the sunny side, freezing on the dark side. A year here is just 88 days. *Spacecraft trip: about 7 years, because you have to slow down a lot to get caught by such a small planet.*

**Venus** — Almost the same size as Earth, but wrapped in thick clouds of acid, with air so heavy it would crush a submarine. The hottest planet of all — hotter than an oven. *Trip: about 4 months.*

**Earth** — Home. The only place we know with oceans, air you can breathe, and living things. Look after it.

**Mars** — The red planet. Rusty deserts, the tallest volcano in the solar system (Olympus Mons, three times as high as Everest), and ice at the poles. Robot rovers are driving around on it right now. *Trip: 7 to 9 months, and you can only leave every 26 months when Earth and Mars line up.*

**Jupiter** — The giant. Over 1,300 Earths would fit inside it. It has a storm called the Great Red Spot that is bigger than our whole planet and has been blowing for hundreds of years. It has more than 90 moons. *Trip: about 5 years.*

**Saturn** — The one with the rings. The rings are made of billions of pieces of ice, from dust-sized to house-sized. Saturn is so light for its size it would float in a bathtub — if you could find one big enough. *Trip: about 7 years.*

**Uranus** — A blue-green ice giant that spins on its side, like a rolling ball instead of a spinning top. *Trip: 9 years or more.*

**Neptune** — The farthest planet, deep blue, with the fastest winds anywhere: over 2,000 km/h. Only one spacecraft has ever visited — Voyager 2, in 1989. *Trip: 12 years.*

Beyond Neptune are the dwarf planets, like **Pluto**, and then the Kuiper Belt — a ring of icy leftovers from when the planets were made.

## How much would you weigh?

Bigger planets pull harder. On Jupiter you would weigh more than twice as much as on Earth — you could barely stand up. On the Moon you would weigh only one-sixth as much, which is why the Apollo astronauts bounced around like kangaroos. Type your weight in and see.`,
        interactiveConfig: {
          kind: 'calculator',
          title: 'Your Weight Across the Solar System',
          description: 'Type your weight on Earth. Use kilograms or pounds — the answers come out in the same unit.',
          constants: {},
          fields: [
            { key: 'w', label: 'Your weight on Earth', unit: 'kg or lb', default: 35, step: 1, min: 1 },
          ],
          outputs: [
            { key: 'moon', label: 'On the Moon', unit: '', formula: 'w * 0.166', precision: 1 },
            { key: 'mars', label: 'On Mars', unit: '', formula: 'w * 0.379', precision: 1 },
            { key: 'venus', label: 'On Venus', unit: '', formula: 'w * 0.907', precision: 1 },
            { key: 'jupiter', label: 'On Jupiter', unit: '', formula: 'w * 2.53', precision: 1 },
            { key: 'saturn', label: 'On Saturn', unit: '', formula: 'w * 1.07', precision: 1 },
            { key: 'neptune', label: 'On Neptune', unit: '', formula: 'w * 1.14', precision: 1 },
          ],
        },
      },
      {
        slug: 'a-day-on-the-space-station',
        title: 'A Day on the Space Station',
        orderIndex: 3,
        interactiveType: 'quiz',
        bodyMd: `## The biggest thing humans have ever built in space

The International Space Station — the ISS — is as long as a football field and has been lived in, without a single break, since the year 2000. Usually seven astronauts from different countries live there at once, for about six months each. It zooms around the Earth 16 times a day, 400 km up.

## Waking up

There is no up or down, so astronauts sleep in sleeping bags strapped to the wall, so they don't drift off and bump into things. An alarm clock wakes them — there is no morning, because the Sun rises every 90 minutes.

## Breakfast

Food comes in pouches and tins. You can't have crumbs — they float everywhere and get into the machines — so bread is out and tortillas are in. Drinks come in bags with straws. Salt and pepper are liquids, because grains would float up your nose. Astronauts say food tastes bland in space because their heads feel stuffy, like a cold, so they love hot sauce.

## Work

Most of the day is science: growing plants, studying how their own bodies change, testing materials, watching the Earth. Sometimes they put on a spacesuit and go outside for a **spacewalk** to fix something — that can take seven hours, and the suit is its own little spaceship.

## Exercise — two hours, every day

In space your muscles and bones don't have to hold you up, so they start to get weak. Astronauts run on a treadmill (held down with bungee cords), ride an exercise bike, and lift weights on a special machine, for two hours every single day. Otherwise they could not stand up when they came home.

## Washing

No showers! Water floats in blobs. Astronauts wash with wet cloths and rinse-free shampoo. The toilet uses air suction instead of water. And yes — the water they drink is recycled. From everything. It is cleaner than most tap water.

## Bedtime

Before bed, many astronauts float to the **Cupola** — a room with seven windows — and watch the Earth go by. Cities glow, lightning storms flicker, and the northern lights ripple below them. Most say it is the best part of the day.

## Coming home

After six months, astronauts come back in a small capsule that blasts through the air like a shooting star and lands under parachutes. They are carried out because their legs have forgotten how to walk. It takes a few weeks to feel normal again — and most of them can't wait to go back.`,
        interactiveConfig: {
          kind: 'quiz',
          title: 'Space station quiz',
          questions: [
            {
              q: 'Why do astronauts sleep in sleeping bags strapped to the wall?',
              options: ['It is cold', 'So they do not float away and bump into things', 'There are no beds on Earth-style ships', 'To hide from the Sun'],
              answer: 1,
              explain: 'With no up or down, anything not strapped down drifts — including sleeping astronauts.',
            },
            {
              q: 'How many sunrises does an astronaut on the ISS see in one day?',
              options: ['1', '2', '16', '100'],
              answer: 2,
              explain: 'The station goes around the Earth 16 times a day, so the Sun rises 16 times.',
            },
            {
              q: 'Why do astronauts exercise for two hours every day?',
              options: ['To pass the time', 'Because muscles and bones get weak without gravity to work against', 'It is a rule from the Outer Space Treaty', 'To stay warm'],
              answer: 1,
              explain: 'In weightlessness, bones and muscles are not used to hold you up, so they weaken unless exercised.',
            },
            {
              q: 'Why is bread not allowed on the space station?',
              options: ['It goes stale', 'Crumbs float everywhere and get into equipment', 'It is too heavy', 'Astronauts do not like it'],
              answer: 1,
              explain: 'Floating crumbs are a hazard for eyes and machines; tortillas make no crumbs.',
            },
          ],
        },
      },
      {
        slug: 'how-to-watch-space-from-your-garden',
        title: 'How to Watch Space From Your Garden',
        orderIndex: 4,
        interactiveType: 'none',
        bodyMd: `## You can see the space station — tonight, maybe

The ISS is the third-brightest thing in the sky after the Sun and the Moon. It looks like a very bright star that moves steadily across the sky without blinking, taking about five minutes to cross. Aeroplanes blink and have coloured lights; the station does not.

**When?** Just after sunset or just before sunrise. That is when it is dark where you are but the station, high up, is still lit by the Sun. In the middle of the night it is in Earth's shadow and invisible.

**Where?** Use our [What's Overhead](/whats-overhead) page — it tells you exactly when the station will pass over your town, which direction to look, and how bright it will be. No telescope needed.

## Starlink trains

Sometimes, a day or two after a Starlink launch, you can see a line of 20 or more little lights following each other across the sky like a string of pearls. They are brand-new satellites still close together. They spread out over a few weeks.

## Watching a real rocket launch

Every few days, somewhere in the world, a rocket launches — and almost all of them are shown live on the internet. Our [Mission Control](/mission-control) page shows what is launching next and where to watch. The best moment is about a minute before lift-off, when the countdown gets to "T-minus 10". If you are lucky enough to live near a launch site — Florida, California, Texas, French Guiana, New Zealand — you can see and *feel* it for real.

## Meteors — shooting stars

Shooting stars are not stars. They are bits of dust, often smaller than a grain of rice, hitting the air at 50 km a second and burning up in a flash. A few times a year Earth passes through a cloud of dust left by a comet and you get a **meteor shower** — the Perseids in August and the Geminids in December are the best. Lie on a blanket, let your eyes get used to the dark for 20 minutes, and you might see one every minute.

## Things to look for with just your eyes

- **The Moon** — the craters along the line between light and dark are sharpest. Binoculars make it amazing.
- **Venus** — the brightest "star" in the evening or morning sky. It is a planet.
- **Jupiter** — bright and steady. With binoculars held very still you can see its four biggest moons as tiny dots in a line. Galileo saw them in 1610 and it changed everything.
- **The Milky Way** — from a really dark place, far from towns, on a moonless night: a hazy river of light across the sky. That is our own galaxy, seen from the inside.
- **The northern (or southern) lights** — our [Aurora Forecast](/aurora-forecast) says when they might come your way.

## Keep going

You have finished the first course. If you want more: the grown-up courses on this site start with **Orbital Mechanics 101**, which is the maths version of everything you just learned. Or try [Space Tycoon](/space-tycoon), where you run your own space company. And keep looking up.`,
      },
    ],
  },
];

async function main() {
  console.log('[seed-learning-wave2] Seeding Learning Zone wave 2…');

  for (const mod of MODULES) {
    console.log(`  Upserting module: ${mod.slug} (${mod.lessons.length} lessons)`);
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
      const data = {
        title: lesson.title,
        bodyMd: lesson.bodyMd,
        videoUrl: lesson.videoUrl ?? null,
        interactiveType: lesson.interactiveType ?? 'none',
        interactiveConfig: lesson.interactiveConfig
          ? (lesson.interactiveConfig as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        orderIndex: lesson.orderIndex,
      };
      await prisma.lesson.upsert({
        where: { moduleId_slug: { moduleId: upserted.id, slug: lesson.slug } },
        update: data,
        create: { moduleId: upserted.id, slug: lesson.slug, ...data },
      });
    }
  }

  const moduleCount = await prisma.courseModule.count({ where: { published: true } });
  const lessonCount = await prisma.lesson.count();
  console.log(`[seed-learning-wave2] Done. Published modules: ${moduleCount}, lessons: ${lessonCount}`);
}

// Only run when executed directly (validators import MODULES without seeding).
const invokedDirectly = /seed-learning-wave2/.test(process.argv[1] ?? '');
if (invokedDirectly) main()
  .catch((err) => {
    console.error('[seed-learning-wave2] Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
