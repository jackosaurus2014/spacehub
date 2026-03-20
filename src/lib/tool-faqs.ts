// ─── FAQ data for tool pages — used with FAQSchema for Google rich snippets ─

export const TOOL_FAQS: Record<string, { question: string; answer: string }[]> = {
  'orbital-calculator': [
    { question: 'What is an orbital calculator?', answer: 'An orbital calculator computes satellite orbital parameters like period, velocity, altitude, and delta-V requirements from user inputs. It helps engineers plan orbit changes and mission profiles.' },
    { question: 'How do you calculate orbital period?', answer: 'Orbital period T = 2π × √(a³/μ), where a is the semi-major axis and μ is the gravitational parameter (398,600 km³/s² for Earth). A satellite at 400 km altitude has a period of about 92 minutes.' },
    { question: 'What is delta-V?', answer: 'Delta-V (Δv) is the change in velocity needed for an orbital maneuver. It is the fundamental measure of how much propellant a spacecraft needs. More delta-V means more fuel or more efficient engines.' },
    { question: 'Is this orbital calculator free?', answer: 'Yes, SpaceNexus provides this orbital mechanics calculator completely free with no account required. It runs in your browser with no downloads needed.' },
  ],
  'link-budget-calculator': [
    { question: 'What is a link budget?', answer: 'A link budget is an accounting of all gains and losses in a satellite communication path, from transmitter to receiver. It includes transmit power, antenna gains, path loss, atmospheric losses, and noise to determine if the signal can be received.' },
    { question: 'How do you calculate free space path loss?', answer: 'Free space path loss (FSPL) = 20×log10(d) + 20×log10(f) + 20×log10(4π/c), where d is distance in meters and f is frequency in Hz. At Ka-band (30 GHz) and 36,000 km (GEO), FSPL is about 213 dB.' },
    { question: 'What frequency bands do satellites use?', answer: 'Common satellite bands: L-band (1-2 GHz) for GPS, S-band (2-4 GHz) for weather, C-band (4-8 GHz) for TV, Ku-band (12-18 GHz) for broadband, Ka-band (26-40 GHz) for high-throughput.' },
  ],
  'mission-cost': [
    { question: 'How much does it cost to launch a satellite?', answer: 'Launch costs range from $2,700/kg on SpaceX Falcon 9 (rideshare) to $54,000/kg historically on the Space Shuttle. A small satellite mission can cost $5-15M total including the satellite, launch, and operations.' },
    { question: 'What factors affect mission cost?', answer: 'Key cost drivers: orbit altitude and inclination, satellite mass, launch vehicle selection, ground station requirements, mission duration, insurance, and regulatory compliance (spectrum licensing, debris mitigation).' },
    { question: 'Is the mission cost calculator accurate?', answer: 'This calculator provides rough order of magnitude estimates for mission planning. Actual costs depend on many factors including launch vehicle availability, payload integration, and market conditions. Use it for early-stage feasibility analysis.' },
  ],
  'constellation-designer': [
    { question: 'What is a satellite constellation?', answer: 'A satellite constellation is a group of satellites working together to provide global or regional coverage. Examples: GPS (31 satellites in MEO), Starlink (6,000+ in LEO), Iridium (66 in LEO).' },
    { question: 'What is a Walker constellation?', answer: 'A Walker constellation is a specific mathematical pattern for distributing satellites evenly in orbit. Defined by T/P/F notation: T = total satellites, P = number of orbital planes, F = phasing between planes.' },
    { question: 'How many satellites do you need for global coverage?', answer: 'Minimum global coverage depends on altitude. At LEO (550 km), you need 60-100+ satellites. At MEO (20,000 km), 24-30 satellites suffice (like GPS). At GEO (36,000 km), 3 satellites cover most of Earth.' },
  ],
  'thermal-calculator': [
    { question: 'What is spacecraft thermal control?', answer: 'Spacecraft thermal control maintains components within their operating temperature range. In space, satellites face extreme temperatures: +120°C in direct sunlight and -170°C in shadow. Passive (coatings, radiators) and active (heaters, heat pipes) systems are used.' },
    { question: 'What is the thermal environment in orbit?', answer: 'Spacecraft experience three main heat inputs: direct solar flux (~1361 W/m²), Earth albedo (reflected sunlight, ~30% of solar), and Earth infrared emission (~237 W/m²). Eclipse periods reduce solar input to zero.' },
  ],
  'radiation-calculator': [
    { question: 'What is radiation in space?', answer: 'Space radiation includes galactic cosmic rays, solar energetic particles, and trapped radiation in the Van Allen belts. It can cause single-event upsets in electronics, total ionizing dose damage, and crew health risks.' },
    { question: 'What is total ionizing dose (TID)?', answer: 'TID measures cumulative radiation energy absorbed by electronic components over time, measured in rads or Gray. LEO satellites typically experience 5-15 krad/year depending on altitude and shielding.' },
  ],
  'power-budget-calculator': [
    { question: 'How do satellites generate power?', answer: 'Most satellites use solar arrays (photovoltaic cells converting sunlight to electricity) and batteries (for eclipse periods). GEO satellites use triple-junction GaAs cells with 30%+ efficiency. Nuclear power (RTGs) is used for deep space missions.' },
    { question: 'How do you size solar arrays for a satellite?', answer: 'Solar array sizing depends on: power requirement (W), solar cell efficiency, orbit (determines sunlight/eclipse ratio), degradation over mission life, and pointing losses. A typical LEO satellite needs ~5-20 W/kg of solar array.' },
  ],
  'satellites': [
    { question: 'How many satellites are in orbit?', answer: 'As of 2026, over 10,000 active satellites are in orbit. SpaceX Starlink accounts for more than 6,000. The US Space Command tracks 36,000+ total objects including debris.' },
    { question: 'How do you track satellites?', answer: 'Satellites are tracked using ground-based radar (Space Fence, phased array radars) and optical telescopes. Position data is published as Two-Line Element sets (TLEs) by CelesTrak and Space-Track.org.' },
    { question: 'Can I see satellites with the naked eye?', answer: 'Yes! The ISS is easily visible as a bright, steady light moving across the sky. Starlink satellites are visible as a "train" of lights shortly after deployment. Use SpaceNexus satellite tracker to predict visible passes.' },
  ],
  'space-weather': [
    { question: 'What is space weather?', answer: 'Space weather refers to conditions driven by solar activity including solar flares, coronal mass ejections (CMEs), and solar wind. It affects satellites, GPS accuracy, power grids, HF radio, and aurora visibility.' },
    { question: 'What is the Kp index?', answer: 'The Kp index measures geomagnetic activity on a 0-9 scale. Kp 0-3 is quiet. Kp 4 is unsettled. Kp 5+ is a geomagnetic storm. Kp 7+ is a major storm that can degrade GPS and increase satellite drag.' },
    { question: 'How does space weather affect satellites?', answer: 'Space weather causes surface charging, deep dielectric charging, single-event upsets in electronics, increased atmospheric drag (altering orbits), and GPS signal degradation through ionospheric disturbances.' },
  ],
  'mission-simulator': [
    { question: 'What is a mission simulator?', answer: 'A mission simulator models an end-to-end space mission including payload requirements, orbit selection, launch vehicle, ground segment, and operations to estimate total cost and feasibility.' },
    { question: 'How do you plan a space mission?', answer: 'Mission planning involves: defining objectives, selecting orbit, sizing the spacecraft, choosing a launch vehicle, designing ground operations, estimating costs, and obtaining regulatory approvals (FCC, NOAA, FAA).' },
  ],
};
