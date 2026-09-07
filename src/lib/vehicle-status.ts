// ─── Vehicle status fact sheet ───────────────────────────────────────────────
// One sourced, dated statement of where each notable launch vehicle stands,
// read by every page that talks about it — the rocket page, the scorecard,
// the compare pages and the guides. It exists because on 2026-09-06 three of
// our own pages disagreed about New Glenn (a guide said the vehicle was lost
// in April; a compare said the pad was lost in May; another dated its first
// flight to the wrong year). Facts that live in one place cannot disagree.
//
// Rules: every entry carries `asOf` and `sources`; nothing here is derived
// from the tracker (the tracker owns counts and dates — see rockets.ts and
// rocket-scorecard.ts); an entry is edited by hand when the world changes
// and the `asOf` moves with it. Keys are launch-vehicles-data.ts ids, plus a
// few vehicles the registry does not carry (suborbital, in-development).

export type VehicleStanding = 'flying' | 'grounded' | 'paused' | 'development' | 'retired';

export interface VehicleStatus {
  slug: string;
  name: string;
  standing: VehicleStanding;
  /** One sentence, present tense, the thing a reader most needs to know. */
  headline: string;
  /** What happened, in order, most recent last. Each item dated. */
  events: { date: string; text: string }[];
  /** The next thing that would change `standing`. */
  nextMilestone: string | null;
  asOf: string; // YYYY-MM-DD
  sources: string[];
}

export const VEHICLE_STATUS: Record<string, VehicleStatus> = {
  'new-glenn': {
    slug: 'new-glenn',
    name: 'New Glenn',
    standing: 'grounded',
    headline: 'Grounded while Launch Complex 36 is rebuilt after the May 28, 2026 static-fire explosion; return to flight targeted before the end of 2026.',
    events: [
      { date: '2025-01-16', text: 'NG-1: reached orbit on the first attempt; booster lost on the landing attempt.' },
      { date: '2025-11', text: 'NG-2: booster landed on the ship Jacklyn — the first heavy-lift booster landing outside SpaceX.' },
      { date: '2026-04-19', text: 'NG-3: first booster reflight, landed again; the upper stage\'s thrust anomaly on its second burn left the payload in the wrong orbit. FAA grounded the vehicle.' },
      { date: '2026-05-28', text: 'A booster and its fueled upper stage exploded during a static fire on LC-36; Blue Origin traced it to a BE-4 main oxygen valve. The pad was badly damaged but repairable; no injuries.' },
      { date: '2026-08-05', text: 'Blue Origin named the cause and said it expects to fly again before the end of 2026.' },
    ],
    nextMilestone: 'Return to flight from a rebuilt LC-36; the next tracked launch is what moves this to flying.',
    asOf: '2026-09-06',
    sources: ['Spaceflight Now, 2026-04-20', 'Space.com (FAA grounding)', 'Blue Origin statement, 2026-08-05', 'Wikipedia: 2026 New Glenn rocket explosion'],
  },
  'starship': {
    slug: 'starship',
    name: 'Starship',
    standing: 'flying',
    headline: 'Flying operational Starlink V3 missions since Flight 13 in July 2026; routine full reuse — catching the ship at the tower — is still being worked out.',
    events: [
      { date: '2023-04-20', text: 'IFT-1: first integrated flight; vehicle lost during ascent.' },
      { date: '2026-07-24', text: 'Flight 13: first operational payloads, 20 Starlink V3 satellites deployed; ship expended by design, booster destroyed during its landing burn.' },
    ],
    nextMilestone: 'First tower catch of the ship; in-orbit propellant transfer for Artemis.',
    asOf: '2026-09-06',
    sources: ['SpaceX mission updates', 'SpaceNexus launch tracker'],
  },
  'new-shepard': {
    slug: 'new-shepard',
    name: 'New Shepard',
    standing: 'paused',
    headline: 'Paused since January 30, 2026 for at least two years while Blue Origin puts its people on the Blue Moon lunar lander; not selling seats.',
    events: [
      { date: '2021-07-20', text: 'First crewed flight.' },
      { date: '2022-09-12', text: 'Uncrewed booster failure; the capsule escape system worked as designed. Flights resumed May 2024.' },
      { date: '2026-01', text: 'NS-38 flew six customers above the Kármán line — the last flight before the pause.' },
      { date: '2026-01-30', text: 'Blue Origin announced a pause of at least two years, citing the Artemis lander schedule and a multi-year customer backlog.' },
    ],
    nextMilestone: 'A resumption date from Blue Origin; none announced.',
    asOf: '2026-09-06',
    sources: ['Blue Origin release, 2026-01-30', 'SpaceNews', 'CNN'],
  },
  'neutron': {
    slug: 'neutron',
    name: 'Neutron',
    standing: 'development',
    headline: 'Rocket Lab\'s reusable medium-lift rocket, ~13,000 kg to LEO; first flight targeted late 2026.',
    events: [],
    nextMilestone: 'First flight. A manifest date on the tracker moves this to flying.',
    asOf: '2026-09-06',
    sources: ['Rocket Lab investor updates'],
  },
  'terran-r': {
    slug: 'terran-r',
    name: 'Terran R',
    standing: 'development',
    headline: 'Relativity Space\'s reusable medium-lift rocket, in development; no first flight on the manifest.',
    events: [],
    nextMilestone: 'First flight.',
    asOf: '2026-09-06',
    sources: ['Relativity Space'],
  },
  'vss-unity': {
    slug: 'vss-unity',
    name: 'SpaceShipTwo (VSS Unity)',
    standing: 'retired',
    headline: 'Retired after Galactic 06 in January 2024; Virgin Galactic\'s Delta-class successors are targeted for commercial service from Q4 2026, with seats on sale at $750,000 since April 2026.',
    events: [
      { date: '2024-01', text: 'Galactic 06, the sixth and final commercial flight of VSS Unity.' },
      { date: '2026-04-01', text: 'Virgin Galactic reopened ticket sales at $750,000 a seat for Delta-class flights.' },
    ],
    nextMilestone: 'Delta-class flight testing, then commercial service targeted Q4 2026.',
    asOf: '2026-09-06',
    sources: ['The Register, 2026-04-01', 'SpaceNews', 'Fox Business'],
  },
};

export function getVehicleStatus(slug: string): VehicleStatus | null {
  return VEHICLE_STATUS[slug] ?? null;
}

/** Days since the entry was last checked — pages show this so a stale sheet
 *  is visible rather than silently trusted. */
export function statusAgeDays(status: VehicleStatus, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(`${status.asOf}T00:00:00Z`).getTime()) / 86_400_000));
}
