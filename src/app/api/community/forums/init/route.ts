import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireCronSecret, internalError, createSuccessResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const FORUM_CATEGORIES = [
  { slug: 'launch-tech', name: 'Launch Technology', description: 'Discuss propulsion systems, launch vehicles, reusability, and next-gen launch platforms.', icon: '🚀', sortOrder: 1 },
  { slug: 'satellite-ops', name: 'Satellite Operations', description: 'Orbital mechanics, satellite design, constellation management, and ground systems.', icon: '🛰️', sortOrder: 2 },
  { slug: 'space-policy', name: 'Space Policy & Regulation', description: 'Government policy, spectrum allocation, licensing, and international space law.', icon: '⚖️', sortOrder: 3 },
  { slug: 'business-funding', name: 'Business & Funding', description: 'Space industry investment, startup funding, business models, and market analysis.', icon: '💰', sortOrder: 4 },
  { slug: 'deep-space', name: 'Deep Space Exploration', description: 'Lunar missions, Mars colonization, asteroid mining, and interplanetary travel.', icon: '🌌', sortOrder: 5 },
  { slug: 'careers', name: 'Careers & Education', description: 'Career advice, job opportunities, academic programs, and professional development.', icon: '🎓', sortOrder: 6 },
  { slug: 'general', name: 'General Discussion', description: "Open forum for space industry topics that don't fit neatly into other categories.", icon: '💬', sortOrder: 7 },
  { slug: 'announcements', name: 'Announcements', description: 'Official SpaceNexus announcements, platform updates, and community news.', icon: '📢', sortOrder: 8 },
];

interface SeedThread {
  title: string;
  content: string;
  isPinned?: boolean;
  tags: string[];
}

const SEED_THREADS: Record<string, SeedThread[]> = {
  'launch-tech': [
    {
      title: 'Methane vs RP-1: The Great Propellant Debate',
      content: `The space launch industry is undergoing a fundamental propellant transition. SpaceX's Raptor engine runs on liquid methane/LOX, Blue Origin's BE-4 powers both New Glenn and ULA's Vulcan Centaur with methane, and Relativity Space chose methane for Terran R. Meanwhile, SpaceX's workhorse Merlin engine on Falcon 9 still uses RP-1, and it has arguably the best flight heritage of any engine currently flying.

Methane advocates point to several key advantages: it burns cleaner, reducing coking and enabling faster engine reuse turnaround. It has a higher specific impulse than RP-1 (roughly 363s vs 311s at sea level for Raptor vs Merlin). And critically for Mars missions, methane can theoretically be produced in-situ on Mars via the Sabatier reaction using atmospheric CO2 and water ice.

But RP-1 has its own strengths that shouldn't be dismissed. It's denser than methane, meaning smaller (and lighter) tanks for a given mass of propellant. It's storable at room temperature, simplifying ground operations. The supply chain is mature and well-understood. And Falcon 9 has demonstrated that RP-1 engines can absolutely be reused — SpaceX has reflown Merlin engines dozens of times.

So what's your take? Is the industry-wide shift to methane justified on technical merits alone, or is it primarily driven by the Mars ISRU narrative? Could a next-generation RP-1 engine with modern manufacturing techniques (3D-printed injectors, full-flow staged combustion) compete with Raptor-class performance? And for purely Earth-orbit commercial launch, does the propellant choice even matter that much compared to manufacturing cost and cadence?`,
      tags: ['propulsion', 'methane', 'rp-1', 'raptor', 'merlin', 'engine-design'],
    },
    {
      title: 'Reusability Economics: When Does Recovery Actually Save Money?',
      content: `SpaceX has proven that rocket reusability works technically — Falcon 9 boosters have flown 20+ times each, and the drone ship landing sequence is practically routine. But the economic picture is more nuanced than "reusability = cheaper launches." Let's dig into the actual cost structure.

A new Falcon 9 booster reportedly costs around $30-35M to manufacture. Refurbishment between flights is rumored to cost $1-2M for inspections, minor repairs, and integration. If a booster flies 15 times, the per-flight hardware cost drops from $35M to roughly $3.3M — a 10x reduction. But you also need recovery infrastructure: drone ships ($30M+ each), recovery crews, port operations, transportation back to the factory, and the engineering team maintaining the refurbishment line. SpaceX operates two drone ships on the East Coast and one on the West Coast.

The real question for the broader industry is: what's the minimum flight rate to justify the investment in reusability infrastructure? Rocket Lab is pursuing Electron recovery via helicopter catch, but with a much smaller vehicle. ULA chose a partial reuse approach with Vulcan's SMART engine pod recovery (though this hasn't been demonstrated yet). And some operators like Arianespace with Ariane 6 decided reusability doesn't close for their flight rate.

What flight cadence do you think makes reusability economically viable? Is there a minimum vehicle size below which expendable is actually more cost-effective? And how do we factor in the opportunity cost — does the engineering effort spent on reusability delay improvements in manufacturing automation that could make expendable vehicles cheap enough to not need reuse?`,
      tags: ['reusability', 'economics', 'falcon-9', 'cost-analysis', 'launch-economics'],
    },
    {
      title: 'Small Launch Vehicles: Oversaturated Market or Room to Grow?',
      content: `The small launch vehicle (SLV) market has seen an extraordinary number of entrants over the past decade, and the winnowing has already begun. Virgin Orbit went bankrupt. Astra pivoted away from launch. ABL Space Systems has struggled with RS1 development. Meanwhile, Rocket Lab has established itself as the clear leader in the dedicated small launch segment with Electron, and is scaling up with Neutron to compete in the medium-lift category.

Firefly Aerospace successfully reached orbit with Alpha and is building toward a regular cadence. Relativity Space abandoned Terran 1 after a single test flight to focus entirely on the larger Terran R. In China, companies like Galactic Energy (Ceres-1), LandSpace (Zhuque-2, the first methane rocket to orbit), and iSpace are competing intensely. Europe has several SLV programs in various stages of development.

The fundamental challenge is market size. Dedicated small launch demand is estimated at perhaps 30-50 flights per year globally at current prices. But prices are partly a function of availability — if launches were cheaper and more frequent, would demand grow? The rideshare revolution led by SpaceX's Transporter missions has complicated the picture by offering extremely low per-kg prices to SSO, even if you sacrifice control over timing and orbital parameters.

Is there a sustainable market for more than 2-3 dedicated small launch providers globally? Or will rideshare and medium-lift vehicles with multi-manifest capabilities absorb most of the demand? What niches (responsive launch, specific orbits, national security, unique inclinations) could sustain dedicated SLV operators?`,
      tags: ['small-launch', 'rocket-lab', 'firefly', 'market-analysis', 'rideshare'],
    },
    {
      title: "Nuclear Thermal Propulsion: Is NASA's DRACO Program Realistic?",
      content: `NASA and DARPA's Demonstration Rocket for Agile Cislunar Operations (DRACO) program aims to flight-test a nuclear thermal propulsion (NTP) system by the late 2020s, with Lockheed Martin as the prime contractor and BWX Technologies building the nuclear reactor. NTP promises roughly twice the specific impulse of chemical rockets (around 900s vs 450s for LH2/LOX), which could dramatically reduce transit times to Mars — potentially cutting the trip from 7-9 months to 3-4 months.

The physics are well-understood. The US actually tested NTP engines in the 1960s-70s under Project NERVA, achieving over 800 seconds of Isp with the XE engine. The core concept is straightforward: pump liquid hydrogen through a nuclear reactor core, heat it to extreme temperatures, and expel it through a nozzle. No combustion required — it's pure thermal energy conversion.

But the engineering and political challenges are formidable. Modern nuclear fuel elements need to withstand temperatures above 2,500K while maintaining structural integrity through multiple thermal cycles. The regulatory framework for launching nuclear material is complex and politically sensitive. Ground testing is complicated by the need to capture and filter radioactive exhaust — the NERVA tests simply vented to atmosphere, which wouldn't be acceptable today. And the cost of developing, testing, and certifying a nuclear propulsion system is enormous.

Do you think DRACO's timeline is achievable, or is this another program that will stretch well into the 2030s? Is NTP the right nuclear propulsion approach, or should we be investing more in nuclear electric propulsion (NEP) which offers even higher Isp at the cost of lower thrust? And what about public perception — can the space industry effectively communicate the safety case for launching nuclear reactors?`,
      tags: ['nuclear-propulsion', 'ntp', 'draco', 'nasa', 'mars-transit', 'advanced-propulsion'],
    },
    {
      title: "Launch Cadence Records: SpaceX at 100+ per Year — What's Next?",
      content: `SpaceX shattered launch records in 2024 with over 130 orbital launches, and the pace has only accelerated in 2025. To put this in perspective, the entire world launched approximately 90 orbital missions in 2020. One company now exceeds the total global launch rate from just a few years ago. The Falcon 9 production line at Hawthorne is turning out boosters and upper stages at an unprecedented rate, while the launch operations teams at Cape Canaveral and Vandenberg have reduced turnaround times to under a week.

This cadence is driven primarily by Starlink deployments, which account for roughly 60-70% of SpaceX's manifest. But the sheer volume creates a virtuous cycle: more flights mean more data, faster iteration, better reliability statistics, and lower insurance costs. Commercial and government customers benefit from the schedule flexibility that only comes with a deep manifest.

The question is whether this production-line approach to rocket manufacturing and launch operations can be replicated. China's commercial launch sector is explicitly trying to build their own "SpaceX-like" capabilities. Rocket Lab is scaling Electron production and building Neutron for higher cadence. Jeff Bezos has said New Glenn will eventually target a Falcon 9-like flight rate. But SpaceX had over a decade to iterate on processes, tooling, and organizational culture to reach this point.

What are the practical limits to launch cadence from a single provider? Range capacity, airspace restrictions, weather days, and booster turnaround all constrain the upper bound. Could SpaceX realistically reach 200 launches per year? And what does a world look like where total global launch cadence exceeds 300-400 per year — how does that change the economics of everything from satellite broadband to in-space manufacturing?`,
      tags: ['launch-cadence', 'spacex', 'falcon-9', 'production', 'scaling', 'starlink'],
    },
  ],
  'satellite-ops': [
    {
      title: 'V-band and Q-band: Spectrum Challenges for Next-Gen Constellations',
      content: `As Ka-band spectrum becomes increasingly congested with proliferating LEO constellations, operators are looking higher in the electromagnetic spectrum. V-band (40-75 GHz) and Q-band (33-50 GHz) offer enormous bandwidth potential — SpaceX has filed for V-band spectrum for future Starlink generations, and the ITU is fielding an increasing number of coordination requests in these frequency ranges.

The physics of higher frequencies create both opportunities and challenges. The available bandwidth in V-band is roughly 10x what's available in Ka-band, which could support dramatically higher throughput per satellite. Antenna apertures can be smaller for a given gain, enabling more compact terminal designs. But atmospheric attenuation increases significantly — rain fade at V-band can cause 20+ dB of signal loss in heavy precipitation, compared to 5-10 dB at Ka-band.

Adaptive coding and modulation (ACM) can compensate for some of this variability, but the link budgets need to be designed with significant margin, which reduces the average throughput advantage. Site diversity (using multiple ground stations to route around weather) helps for gateway links but doesn't solve the user terminal problem. Some operators are exploring hybrid approaches with Ka-band for guaranteed baseline connectivity and V-band for high-throughput burst capacity.

What's your assessment of V-band viability for direct-to-user services? Is it primarily useful for high-capacity gateway feeder links? And how will the spectrum coordination process handle the inevitable interference issues when multiple mega-constellations operate in the same bands? The ITU's traditional coordination framework wasn't designed for constellations of thousands of satellites.`,
      tags: ['spectrum', 'v-band', 'q-band', 'ka-band', 'mega-constellation', 'rf-engineering'],
    },
    {
      title: 'Electric Propulsion for Station-Keeping: Hall vs Ion Thrusters',
      content: `Electric propulsion has revolutionized satellite station-keeping and orbit raising, but the choice between Hall-effect thrusters and gridded ion engines involves real engineering trade-offs that depend heavily on the mission profile. Let's break down the current state of the art.

Hall-effect thrusters (like the SPT-100 family, Busek BHT series, or Safran PPS-1350) offer moderate specific impulse (1,500-2,000s) with relatively high thrust density. They're mechanically simpler, with fewer components and proven flight heritage spanning decades. For LEO constellation satellites that need to reach operational altitude quickly after deployment, Hall thrusters are often preferred because they can raise orbit in weeks rather than months. Starlink satellites use krypton-fueled Hall thrusters, trading some Isp for much cheaper propellant.

Gridded ion engines (like the NSTAR on Dawn, the T5/T7 family, or QinetiQ's RIT series) achieve higher specific impulse (2,500-3,500s) but at lower thrust levels. They're more complex, requiring separate ionization and acceleration stages, and the grid electrodes erode over time limiting lifetime. However, for GEO satellites where station-keeping budgets are measured in decades and total delta-V requirements are modest but sustained, the higher Isp translates to significant propellant mass savings.

Newer technologies are blurring the lines. Electrospray thrusters from companies like Accion (now part of Benchmark Space Systems) offer very high Isp in tiny form factors suitable for CubeSats. Magnetoplasmadynamic (MPD) thrusters promise much higher power and thrust levels. And field-reversed configuration plasma thrusters are being developed for in-space transportation applications. What propulsion technology do you think will dominate the next generation of satellite platforms?`,
      tags: ['electric-propulsion', 'hall-thruster', 'ion-engine', 'station-keeping', 'satellite-design'],
    },
    {
      title: 'Mega-Constellation Collision Avoidance: Are Current Systems Adequate?',
      content: `With Starlink approaching 7,000 satellites, OneWeb at 600+, and Amazon's Project Kuiper beginning deployment, the orbital environment is changing faster than the space situational awareness (SSA) infrastructure can adapt. The 18th Space Defense Squadron tracks roughly 30,000 objects larger than 10cm, but the mega-constellation era is forcing a fundamental rethinking of how we manage collision avoidance.

SpaceX has stated that Starlink satellites perform thousands of collision avoidance maneuvers per year, using an autonomous system that ingests conjunction data messages (CDMs) and commands maneuvers without human-in-the-loop approval for most cases. This is necessary at scale — you simply cannot have human operators reviewing every conjunction for thousands of satellites. But autonomous maneuvering creates its own risks: if two autonomous systems both maneuver in response to the same conjunction, they could actually create a collision (the "dual maneuver" problem).

The Space Data Association and various national agencies are working on better data sharing, but the system remains fragmented. Commercial SSA providers like LeoLabs, ExoAnalytic, and Slingshot Aerospace offer higher-fidelity tracking than the public catalog, but their data isn't universally shared. There's no standardized protocol for communicating planned maneuvers between operators, though efforts like the Space Safety Coalition's best practices are a start.

Should there be a mandatory "air traffic control" equivalent for space? The technology for real-time conjunction assessment and coordinated maneuvering exists, but the governance framework doesn't. Who should operate it — a national agency, an international body, or a commercial entity? And how do we handle operators who don't participate or whose satellites can't maneuver?`,
      tags: ['collision-avoidance', 'ssa', 'space-debris', 'mega-constellation', 'space-traffic-management'],
    },
    {
      title: "Optical Inter-Satellite Links: Starlink's Secret Weapon?",
      content: `SpaceX began deploying laser inter-satellite links (ISLs) on Starlink satellites in late 2021, and by now the majority of the constellation is laser-equipped. These optical links allow data to route between satellites in orbit at the speed of light through vacuum — which is roughly 47% faster than light through fiber optic cable. For long-distance routes (e.g., London to Tokyo), a space-based laser mesh network can actually deliver lower latency than the best submarine fiber cables.

The technical implementation is remarkable. Each Starlink satellite can establish laser links with up to four neighboring satellites, creating a dynamic mesh network that can route traffic across the constellation without touching the ground until it reaches the destination region. Throughput per link is reportedly in the 100+ Gbps range, with acquisition and tracking systems that can maintain lock despite the relative motion of satellites in adjacent orbital planes.

The strategic implications are significant. Laser ISLs reduce dependence on ground stations — you no longer need a gateway in every region you want to serve. This is critical for oceanic coverage and service in countries where building ground infrastructure is politically or logistically difficult. For government and military customers, the ability to route traffic entirely through space (never touching a ground segment in a potentially hostile country) is a compelling security feature.

Other constellation operators are following suit — Telesat Lightspeed plans laser ISLs, and SDA's proliferated LEO architecture requires them. But the technology is challenging: maintaining a laser link between satellites moving at 7.5 km/s relative to each other requires extremely precise pointing, and atmospheric effects can disrupt links on the space-to-ground segment. What role do you think optical ISLs will play in the broader telecommunications landscape? Could they eventually compete with submarine cables for intercontinental backbone traffic?`,
      tags: ['optical-links', 'isl', 'laser-communication', 'starlink', 'satellite-networking', 'latency'],
    },
  ],
  'space-policy': [
    {
      title: 'FCC\'s New Debris Mitigation Rules: Impact on Small Satellite Operators',
      content: `In September 2022, the FCC adopted a rule requiring all LEO satellite operators licensed in the US to deorbit their satellites within 5 years of end-of-mission, dramatically shortening the previous 25-year guideline. This rule went into effect in 2024 and is already reshaping how small satellite operators design their missions and business cases.

For CubeSat and small satellite operators below about 400km altitude, atmospheric drag often handles deorbit naturally within 5 years. But for the increasingly popular 500-600km orbits that offer a balance between coverage and link budget, passive deorbit can take 10-25 years depending on solar activity and ballistic coefficient. This means operators at these altitudes now need active deorbit capability — a propulsion system, drag device, or other mechanism — adding mass, cost, and complexity to platforms that were previously kept deliberately simple.

The cost impact is non-trivial for university and small commercial operators. A basic propulsion module for a 3U CubeSat costs $50,000-150,000 and adds 0.5-1U of volume. Drag sails are cheaper but add deployment risk. And the FCC rule applies to all licensed spacecraft regardless of size, meaning even a 1U educational CubeSat technically needs a compliance strategy. Some operators are choosing lower orbits with higher drag to avoid the issue, but this reduces mission lifetime and increases station-keeping requirements.

Is the 5-year rule the right balance between sustainability and accessibility? Should there be exemptions or alternative compliance paths for educational and research missions? And how does this interact with other nations' debris mitigation frameworks — satellites licensed outside the US aren't subject to FCC rules, potentially creating a competitive disadvantage for US operators.`,
      tags: ['fcc', 'debris-mitigation', 'regulation', 'small-satellites', 'deorbit', 'cubesat'],
    },
    {
      title: 'Artemis Accords: Building International Space Law for the Moon',
      content: `The Artemis Accords, first signed in 2020 by eight nations, have now grown to include over 40 signatories. These bilateral agreements establish principles for civil space exploration including transparency, interoperability, emergency assistance, registration, scientific data sharing, protecting heritage sites, extracting and utilizing space resources, deconflicting activities, and managing orbital debris. But they exist outside the formal UN treaty framework, and their long-term legal significance is still debated.

Supporters argue the Accords are a practical, bottom-up approach to building norms for lunar and deep space activities. The Outer Space Treaty of 1967 establishes broad principles (space is the "province of all mankind," no national appropriation, etc.) but doesn't address the practical realities of resource extraction, safety zones around operations, or coordination between multiple operators on the lunar surface. The Accords fill this gap with specific, actionable principles while remaining consistent with OST obligations.

Critics — including Russia and China, who have not signed — argue that the Accords are a US-led attempt to establish norms favorable to American commercial interests outside the multilateral COPUOS framework. The resource extraction provisions, in particular, are seen by some as conflicting with the Moon Agreement's "common heritage of mankind" principle (though the Moon Agreement was never ratified by any major spacefaring nation). China and Russia are pursuing their own International Lunar Research Station (ILRS) with a separate set of partner nations.

Are we heading toward two competing frameworks for lunar governance — an Artemis bloc and an ILRS bloc? How do we handle situations where operators under different frameworks want to work in the same lunar region? And is the Accords model (voluntary, bilateral) actually more effective than trying to negotiate a comprehensive multilateral treaty, which history suggests would take decades?`,
      tags: ['artemis-accords', 'space-law', 'lunar-governance', 'ost', 'international-cooperation'],
    },
    {
      title: 'Space Sustainability Rating: Should the Industry Self-Regulate?',
      content: `ESA and the World Economic Forum launched the Space Sustainability Rating (SSR) system to provide a standardized assessment of how responsibly satellite operators conduct their missions. The rating evaluates factors like collision avoidance capability, post-mission disposal plans, trackability, data sharing practices, and overall mission design. The idea is to create market incentives for responsible behavior — insurers, investors, and customers could favor operators with higher sustainability ratings.

Self-regulation has obvious appeal. The space industry moves faster than government regulation, and operators understand the technical nuances better than most regulators. Industry-led standards can be more flexible and responsive to changing technology. The SSR is voluntary, which means operators adopt it because they see value, not because they're compelled. And it avoids the jurisdictional nightmare of trying to enforce a single regulatory framework across dozens of spacefaring nations.

But the counterarguments are compelling too. Voluntary standards have a free-rider problem — operators who cut corners on sustainability can undercut responsible operators on cost. The worst actors, who create the most risk, are precisely the ones least likely to participate in a voluntary rating system. And without enforcement mechanisms, even operators who sign up may not follow through on commitments. The history of environmental self-regulation in other industries is mixed at best.

Some argue we need a hybrid approach: industry-led standards development with government-backed enforcement. The FAA, FCC, and NOAA each regulate aspects of space activity, but there's no single US agency with comprehensive authority over space sustainability. Should there be? Or is the multi-agency approach, combined with industry self-regulation like the SSR, actually more resilient and adaptive? What's worked in other domains (aviation safety, nuclear regulation, maritime law) that we could apply to space?`,
      tags: ['sustainability', 'ssr', 'self-regulation', 'esa', 'wef', 'space-debris', 'governance'],
    },
    {
      title: 'ITAR Reform: When Will Space Tech Export Controls Modernize?',
      content: `The International Traffic in Arms Regulations (ITAR) have been a persistent friction point for the global space industry. Originally designed to prevent the proliferation of missile technology, ITAR controls the export of defense-related items and services — and because launch vehicles are fundamentally the same technology as ballistic missiles, a vast swath of space technology falls under these controls. The result is that US companies face significant restrictions on international collaboration, component sourcing, and even hiring non-US persons for certain roles.

The Obama administration's export control reform (ECR) initiative in 2013 moved some satellite and spacecraft components from the restrictive USML (United States Munitions List) to the more permissive Commerce Control List (CCL/EAR). This helped, but many core technologies — propulsion systems, certain sensors, radiation-hardened electronics, and anything related to reentry — remain ITAR-controlled. The compliance burden for small companies is substantial: ITAR registration costs, technology control plans, export licenses, and the ever-present risk of violation penalties.

The competitive impact is real. European, Japanese, and increasingly Chinese and Indian suppliers can offer satellite components and subsystems without ITAR restrictions, making them more attractive for international programs. Several non-US satellite manufacturers explicitly market "ITAR-free" platforms as a competitive advantage. And the restrictions on international hiring limit the US space industry's access to global talent at a time when the workforce shortage is acute.

Is meaningful ITAR reform politically feasible in the current environment? What specific categories of space technology could be moved to the CCL without genuinely compromising national security? And how do we balance the legitimate need to control missile-relevant technology with the economic and innovation costs of over-classification?`,
      tags: ['itar', 'export-controls', 'regulation', 'international-trade', 'compliance', 'ecr'],
    },
  ],
  'business-funding': [
    {
      title: 'Space SPAC Failures: Lessons Learned from 2021-2023',
      content: `The 2020-2021 SPAC boom brought several space companies to public markets with minimal revenue and ambitious projections. The aftermath has been sobering. Virgin Orbit went bankrupt in 2023 after a failed launch from the UK. Astra's stock fell over 95% from its peak before pivoting away from launch entirely. Momentus struggled with both technical and governance issues. AST SpaceMobile, Spire Global, and BlackSky have seen share prices drop dramatically from their SPAC merger valuations.

The common pattern is instructive: pre-revenue or early-revenue companies presented investor decks with hockey-stick revenue projections that assumed rapid technical maturation, aggressive launch schedules, and fast market capture. The SPAC structure, which allowed companies to present forward-looking projections that would be prohibited in a traditional IPO, contributed to inflated expectations. Retail investors, attracted by the "space" narrative, didn't always have the technical background to assess execution risk.

But it's not all doom and gloom. Rocket Lab, which went public via SPAC in 2021, has executed consistently and its stock has recovered significantly as Electron launch cadence increased and the Neutron program progressed. Planet Labs has built a sustainable business in Earth observation. The lesson seems to be that companies with actual hardware, real customers, and credible near-term revenue paths can use public markets effectively — the problem was companies that were still in the R&D phase going public too early.

What lessons should investors draw from this era? Is the SPAC path permanently tainted for space companies, or will it recover as the successful examples demonstrate results? And what does the post-SPAC shakeout mean for the next generation of space startups — are later-stage venture investors more cautious now, or has the appetite for space deals remained strong?`,
      tags: ['spac', 'investment', 'public-markets', 'virgin-orbit', 'astra', 'rocket-lab', 'valuation'],
    },
    {
      title: 'The $1T Space Economy by 2040: Hype or Inevitable?',
      content: `Multiple investment banks and consulting firms have projected that the global space economy will reach $1 trillion or more by 2040, up from roughly $460 billion today. Morgan Stanley, Goldman Sachs, and McKinsey have all published variations of this forecast. But the assumptions underlying these projections deserve scrutiny.

The current space economy is dominated by satellite services (especially satellite TV) and ground equipment manufacturing, which together account for over 70% of revenue. Launch revenue, while attention-grabbing, represents only about 5-6% of the total. For the market to more than double in 15 years, you need to believe in significant growth vectors: satellite broadband (Starlink, Kuiper, OneWeb), Earth observation and geospatial analytics, in-orbit servicing and manufacturing, space tourism, lunar and asteroid resource extraction, and space-based solar power.

Satellite broadband is the most credible near-term growth driver. Starlink alone could plausibly generate $10-30 billion in annual revenue at scale, and the total addressable market for global connectivity is enormous. Earth observation is growing rapidly, driven by commercial, government, and climate monitoring demand. These two segments could add $50-100 billion to the space economy over the next decade.

The more speculative segments — space tourism, manufacturing, and resource extraction — are where the projections diverge. Space tourism exists (Blue Origin, Virgin Galactic, SpaceX Polaris/Inspiration missions) but it's unclear if it scales beyond a niche market for the ultra-wealthy. In-space manufacturing has intriguing physics advantages (microgravity crystal growth, fiber optic production) but has yet to demonstrate commercial viability. Do you think the trillion-dollar projections are achievable, and which segments will drive the growth?`,
      tags: ['space-economy', 'market-sizing', 'investment', 'growth', 'satellite-broadband', 'forecast'],
    },
    {
      title: 'Government vs Commercial Revenue: Finding the Right Mix',
      content: `One of the most important strategic decisions any space company makes is the balance between government and commercial revenue. Government contracts (NASA, DoD, ESA, JAXA) offer large deal values, multi-year commitments, and often fund technology development. But they come with compliance overhead, ITAR restrictions, slow procurement cycles, and the ever-present risk of program cancellation due to political shifts. Commercial revenue offers faster sales cycles and more market-driven pricing, but can be volatile and competitive.

The most successful space companies seem to find a productive balance. SpaceX built its early business on NASA contracts (Commercial Cargo, Commercial Crew) while simultaneously developing the commercial launch market — and now Starlink is becoming a massive commercial revenue engine. Rocket Lab derives roughly half its revenue from government missions and half from commercial customers. Planet Labs sells Earth observation data to both intelligence agencies and commercial agriculture, insurance, and finance customers.

Pure-play government contractors face concentration risk. Companies like Northrop Grumman and L3Harris have deep government relationships but are exposed to budget cycles and political priorities. Pure-play commercial companies face market risk — if your commercial thesis doesn't materialize, there's no government backstop. The hybrid model provides resilience but requires maintaining two different sales motions, compliance frameworks, and often product architectures.

For early-stage space companies, the advice often given is to secure government anchor customers to fund development while building commercial capabilities for scale. But is this actually good advice in 2026? The commercial space market is maturing, and some investors explicitly prefer pure-commercial business models. What's the optimal revenue mix, and does it depend on the segment (launch vs. satellite services vs. data analytics)?`,
      tags: ['business-model', 'government-contracts', 'commercial-revenue', 'strategy', 'procurement'],
    },
    {
      title: 'Space Insurance Market Tightening: Impact on New Entrants',
      content: `The space insurance market has been contracting and hardening over the past several years. After a period of relatively soft pricing driven by excess underwriting capacity, a series of high-profile losses — including the Viasat-3 anomaly, various launch failures, and several satellite manufacturing defects — has led insurers to increase premiums, reduce capacity, and tighten terms. For new entrants to the space industry, this presents a significant financial challenge.

Launch insurance premiums now typically range from 5-15% of the insured value for established vehicles with strong track records, but can be 15-25% or higher for newer rockets with limited flight history. For a satellite valued at $200M launching on a new vehicle, that's potentially $30-50M in insurance costs — a meaningful portion of the total mission budget. Some new launch providers have struggled to secure insurance at any price for their first few flights.

The in-orbit insurance market is evolving too. Traditional annual in-orbit policies are being supplemented by parametric and usage-based insurance products. Some satellite operators, particularly those operating large constellations, are choosing to self-insure rather than pay premiums that exceed their expected loss rates. SpaceX reportedly does not carry insurance on individual Starlink satellites, relying on the law of large numbers across the constellation.

How should new space companies approach the insurance challenge? Is self-insurance viable for anyone other than mega-constellation operators? Should governments play a role — perhaps through risk-sharing mechanisms similar to TRIA for terrorism insurance or the nuclear liability regime? And for new launch providers, is there an alternative to the catch-22 of needing flight history to get affordable insurance but needing affordable insurance to attract commercial payloads?`,
      tags: ['insurance', 'risk-management', 'underwriting', 'new-entrants', 'market-trends', 'finance'],
    },
  ],
  'deep-space': [
    {
      title: "Starship to Mars: Technical Challenges Nobody Talks About",
      content: `SpaceX's Starship is designed from the ground up for Mars missions, and much of the public discussion focuses on the dramatic challenges of landing a 50-meter-tall stainless steel vehicle on the Martian surface. But the Mars mission architecture involves several other equally challenging problems that receive less attention.

Radiation exposure during the 6-9 month transit is a serious concern. Outside Earth's magnetosphere, the crew would be exposed to both galactic cosmic rays (GCRs) and the risk of solar particle events (SPEs). Starship's stainless steel hull provides some shielding, but a major SPE could deliver a dangerous dose without additional protection. NASA's current permissible exposure limits would likely need to be revised for Mars missions, and the long-term cancer risk from GCR exposure remains poorly quantified. Water walls, polyethylene shielding, or even magnetic field generators have been proposed, but each adds mass.

Entry, descent, and landing (EDL) at Mars is sometimes called "seven minutes of terror" for a reason. Mars has enough atmosphere to generate dangerous heating but not enough for traditional parachute-based deceleration of a vehicle as massive as Starship. SpaceX's approach appears to involve a combination of aerodynamic braking, a heat shield, and propulsive landing — but the Martian atmosphere is variable and unpredictable, with dust storms that can alter density profiles significantly. Testing EDL at Mars-scale on Earth is essentially impossible.

Surface operations present perhaps the greatest long-term challenge. Mars dust (regolith) is extremely fine, electrostatically charged, and contains perchlorates that are toxic to humans. Maintaining seals, airlocks, and life support systems in this environment is an unsolved engineering problem. And the return journey requires manufacturing propellant from Martian resources (ISRU) — something that has never been demonstrated at scale. What's your assessment of the most under-discussed technical risk for Mars missions?`,
      tags: ['mars', 'starship', 'radiation', 'edl', 'isru', 'spacex', 'deep-space-exploration'],
    },
    {
      title: 'Lunar ISRU: How Close Are We to Making Fuel on the Moon?',
      content: `In-situ resource utilization (ISRU) on the Moon — specifically extracting water ice from permanently shadowed regions (PSRs) at the lunar poles and converting it to hydrogen and oxygen for rocket propellant — is a cornerstone of NASA's long-term Artemis architecture and virtually every credible lunar base concept. But how close are we really to demonstrating this capability at useful scales?

The evidence for water ice in lunar PSRs is strong but indirect. NASA's LCROSS mission in 2009 confirmed water ice in the Cabeus crater, and multiple orbital instruments (including NASA's LRO and India's Chandrayaan missions) have detected hydrogen signatures consistent with water ice in PSRs. But we don't have detailed ground-truth data on the concentration, distribution, depth, or accessibility of these ice deposits. Is it a thin frost mixed with regolith? Thick ice lenses? Something in between? The answer dramatically affects the engineering approach and economics.

NASA's VIPER rover was designed to directly characterize polar ice deposits, but the mission was cancelled in 2024 due to cost overruns and schedule delays, leaving a critical data gap. Intuitive Machines' polar lander missions and other commercial lunar payload services (CLPS) may provide some of this information, but in a piecemeal fashion. Meanwhile, companies like Lunar Outpost, ispace, and Astrobotic are developing surface mobility platforms that could support ISRU prospecting.

Even if we confirm accessible ice deposits, the engineering challenge of extraction and processing is substantial. Operating in permanently shadowed regions means no solar power — you need nuclear or beamed power. Temperatures in PSRs are below 40K (-233C), creating extreme thermal management challenges. And the mass of an operational ISRU plant capable of producing meaningful quantities of propellant (say, enough to fuel a lunar ascent vehicle — roughly 10-30 tonnes of LOX/LH2) is estimated at several tonnes itself, requiring multiple heavy landing missions. Is lunar ISRU a 2030s reality or a 2040s aspiration?`,
      tags: ['isru', 'lunar-water', 'moon', 'artemis', 'propellant', 'polar-ice', 'viper'],
    },
    {
      title: 'Asteroid Mining Economics: Is Platinum Worth the Trip?',
      content: `The asteroid mining concept has captivated space enthusiasts and investors for decades. A single 500-meter metallic asteroid could theoretically contain more platinum-group metals (PGMs) than have ever been mined on Earth. Companies like Planetary Resources and Deep Space Industries raised significant venture capital in the 2010s on this premise — but both effectively ceased operations, acquired for their technology rather than their mining business plans. AstroForge is the most prominent current venture, but even they have pivoted to initially demonstrating refining technology before attempting extraction.

The fundamental economic challenge is stark. Current launch costs mean that every kilogram returned from an asteroid mission costs tens of thousands of dollars at minimum. Platinum trades at roughly $30,000/kg. So you need the returned material value to exceed the fully-loaded mission cost, including spacecraft development, launch, transit propulsion, extraction equipment, and Earth return. Even with dramatic reductions in launch cost (Starship could potentially bring costs down to $200-500/kg to orbit), the asteroid mission profile adds enormous complexity and risk.

The more credible near-term economic case for asteroid resources is using them in space rather than returning them to Earth. Water extracted from carbonaceous asteroids could be electrolyzed into hydrogen and oxygen propellant, sold at space depots for a premium over Earth-launched propellant. Iron and nickel could be used for in-space construction via 3D printing. These applications avoid the "tyranny of the return trip" and the market-crashing problem (flooding Earth's platinum market would collapse prices).

But even the in-space utilization case requires a space economy large enough to create demand for asteroid-derived resources. Is this a chicken-and-egg problem? Do we need asteroid mining to enable a large space economy, or do we need a large space economy to justify asteroid mining? What's the minimum viable mission profile that could demonstrate economic viability?`,
      tags: ['asteroid-mining', 'pgm', 'platinum', 'in-space-resources', 'astroforge', 'economics'],
    },
    {
      title: 'Gateway Station: Essential Waypoint or Expensive Detour?',
      content: `NASA's Lunar Gateway — a small space station in a near-rectilinear halo orbit (NRHO) around the Moon — is a central element of the Artemis architecture. Northrop Grumman is building the HALO (Habitation and Logistics Outpost) module, Maxar is providing the PPE (Power and Propulsion Element), and international partners ESA, JAXA, and CSA are contributing modules and capabilities. But the station has been a lightning rod for debate about whether it's an essential infrastructure investment or an expensive detour that adds complexity to lunar surface missions.

Proponents argue that Gateway serves multiple critical functions. It provides a staging point for lunar surface missions, allowing the Orion crew vehicle to remain in orbit while astronauts descend in the Human Landing System (HLS). This enables reusable lunar landers — they can shuttle between Gateway and the surface without needing to return to Earth. Gateway also serves as a communications relay for far-side lunar operations, a platform for deep space science and technology demonstration, and a testbed for the systems needed for future Mars transit habitats.

Critics counter that Gateway adds an unnecessary stop on the way to the Moon. Apollo went directly from Earth orbit to lunar orbit to the surface and back. Adding Gateway to the architecture means Orion must first rendezvous with Gateway in NRHO, then the crew transfers to the lander, descends to the surface, ascends back to Gateway, transfers back to Orion, and then returns to Earth. Each rendezvous and transfer adds operational complexity, risk, and mission duration. The NRHO orbit, while energy-efficient to reach, means Gateway is quite far from the lunar surface — lander delta-V requirements are higher than from a low lunar orbit.

Where do you stand? Is Gateway a forward-looking investment in deep space infrastructure, or a jobs program that adds cost and complexity to near-term lunar surface access? Could the resources spent on Gateway be better invested in larger lunar landers, surface habitats, or direct-to-surface mission architectures?`,
      tags: ['gateway', 'artemis', 'lunar-orbit', 'nrho', 'nasa', 'lunar-architecture'],
    },
  ],
  'careers': [
    {
      title: 'Breaking Into Space: Non-Traditional Paths That Actually Work',
      content: `The space industry has a reputation for being accessible only to aerospace engineering PhDs with security clearances, but that's increasingly outdated. The commercialization of space has created demand for a much broader range of skills, and some of the most interesting career paths into the industry come from unexpected directions.

Software engineers are perhaps the most obvious non-traditional hires. SpaceX, Planet Labs, and Capella Space hire extensively from the broader tech industry — their satellite operations, data processing, and customer platforms require the same engineering skills as any tech company. Machine learning engineers are in high demand for Earth observation analytics, autonomous operations, and mission planning optimization. Full-stack web developers build the ground segment interfaces and customer portals. You don't need to know orbital mechanics on day one (though you'll learn it).

Manufacturing and operations roles translate directly from other industries. SpaceX's production philosophy draws heavily from automotive manufacturing (Tesla's influence is obvious). Supply chain managers from aerospace, defense, or even consumer electronics find their skills directly applicable. Quality engineers, test engineers, and technicians with experience in any precision manufacturing environment are valued. Welders, machinists, and composite fabricators are the backbone of any rocket factory.

Less obvious paths include regulatory affairs (space law is booming as the industry grows), finance and business development (space companies need people who understand both technology and capital markets), and communications/marketing (the industry is increasingly consumer-facing). Several successful space professionals I know started in adjacent fields — aviation, maritime, energy, telecom — and transitioned by identifying where their domain expertise overlapped with space applications. What's your non-traditional path into the space industry, or what path would you recommend?`,
      tags: ['career-change', 'non-traditional', 'software', 'manufacturing', 'career-advice', 'hiring'],
    },
    {
      title: 'Remote Work in Space Industry: Which Companies Offer It?',
      content: `The space industry historically required physical presence — you can't build rockets from home, and many programs involve classified work that requires secure facilities. But the post-COVID work landscape has shifted significantly, and the space industry's approach to remote work varies enormously by company and role.

For hardware-focused roles (manufacturing, integration, testing, launch operations), on-site presence remains essential. You can't torque bolts, run vibration tests, or stack a rocket remotely. But even hardware companies have significant portions of their workforce in roles that can be done remotely: mission analysis, systems engineering (design phase), software development, business operations, finance, HR, and marketing. The question is whether companies choose to offer flexibility for these roles.

SpaceX is famously on-site-focused, with Elon Musk's well-publicized opposition to remote work. Most SpaceX roles require presence in Hawthorne, McGregor, Cape Canaveral, or Starbase. At the other end of the spectrum, companies like Spire Global and Umbra (SAR satellite operator) have embraced distributed teams. Planet Labs, Rocket Lab, L3Harris, and many others fall somewhere in between, offering hybrid arrangements for eligible roles. Many of the newer, software-heavy space companies (orbital analytics, space domain awareness, data platforms) operate more like traditional tech companies with flexible remote policies.

For job seekers prioritizing location flexibility, the growth in space software and analytics is good news — these roles are most amenable to remote work and represent a growing share of the space workforce. The commercial space industry's expansion beyond the traditional aerospace hubs (LA, Houston, DC/Virginia, Denver) is also creating opportunities in places like Seattle, Austin, and even smaller cities where new space facilities are being built. What's been your experience with remote work policies in the space industry?`,
      tags: ['remote-work', 'hybrid', 'work-from-home', 'space-jobs', 'company-culture', 'hiring-trends'],
    },
    {
      title: 'Most Valuable Skills for Space Careers in 2026',
      content: `The space industry's skill demands are evolving rapidly as the sector matures and commercializes. While the traditional aerospace engineering skillset remains foundational, the fastest-growing demand areas in 2026 reflect the industry's transformation from a government-dominated R&D sector into a commercial technology ecosystem.

Data science and machine learning are arguably the hottest skill area across the space industry. Earth observation companies need ML engineers to extract insights from petabytes of satellite imagery. Constellation operators need data scientists for network optimization, traffic management, and predictive maintenance. Even traditional defense contractors are hiring AI/ML talent for autonomous systems and intelligence analysis. Python, TensorFlow/PyTorch, computer vision, and geospatial data processing (GIS, GDAL, rasterio) are all high-demand skills.

Systems engineering remains the connective tissue of any space program, but the nature of the role is changing. Model-Based Systems Engineering (MBSE) tools like CAMEO, Capella, and SysML are increasingly expected rather than optional. The ability to work across hardware-software boundaries is critical as satellites become more software-defined. And the pace of commercial development means systems engineers need to be comfortable with iterative, agile-influenced development processes rather than traditional waterfall approaches.

RF and communications engineering has surged in demand as satellite broadband, direct-to-cell, and IoT connectivity drive massive investment. Understanding antenna design, link budgets, signal processing, and spectrum management is valuable across multiple segments. Similarly, cybersecurity skills are increasingly critical — connected satellites represent an expanding attack surface, and both commercial operators and government customers are prioritizing space system security.

What skills have you found most valuable in your space career? And for students or early-career professionals, what would you recommend investing in learning right now?`,
      tags: ['skills', 'data-science', 'machine-learning', 'systems-engineering', 'rf-engineering', 'career-development'],
    },
  ],
  'general': [
    {
      title: 'Welcome to SpaceNexus Forums! Introduce Yourself',
      content: `Welcome to the SpaceNexus community forums! This is a space for professionals, enthusiasts, students, and anyone passionate about the space industry to connect, share knowledge, and discuss the topics that matter most.

Whether you're a seasoned aerospace engineer with decades of experience, a student exploring career options, a startup founder building the next breakthrough technology, or simply someone fascinated by what's happening beyond our atmosphere — you belong here. The space industry benefits from diverse perspectives, and we're excited to hear yours.

To get us started, tell us a bit about yourself! What's your connection to the space industry? What are you most excited about in space right now? What topics are you hoping to explore in these forums? There are no wrong answers — we're building this community together.

A few tips for getting the most out of SpaceNexus forums: explore the different categories to find topics that match your interests, don't hesitate to start new threads if you have a question or topic that hasn't been covered, and engage constructively with others — the best discussions happen when people bring different viewpoints and experiences to the table. Welcome aboard!`,
      isPinned: true,
      tags: ['welcome', 'introductions', 'community'],
    },
    {
      title: 'Weekly Space News Discussion Thread',
      content: `This is our weekly open thread for discussing the latest space news, launches, announcements, and developments. Every week brings new stories from across the industry, and this is the place to share what caught your attention, ask questions, and get the community's take on breaking developments.

Some ground rules for the weekly discussion: stay on topic (space and adjacent industries), be respectful of differing opinions, cite sources when making specific claims, and remember that speculation is fine as long as it's clearly labeled as such. We encourage sharing links to articles, reports, and primary sources.

Feel free to discuss anything space-related that happened this week — launches, satellite deployments, policy decisions, company announcements, scientific discoveries, or even interesting job postings you've come across. The more diverse the discussion, the more valuable it is for everyone.

This thread refreshes weekly, so jump in whenever you have something to share or discuss. And if a topic generates enough interest, consider spinning it off into its own dedicated thread in the appropriate category. Let's get the conversation started!`,
      isPinned: true,
      tags: ['weekly', 'news', 'discussion', 'current-events'],
    },
    {
      title: 'What Got You Interested in the Space Industry?',
      content: `Everyone in the space industry has an origin story — that moment or experience that sparked a lifelong fascination with space. For some, it was watching a shuttle launch as a kid. For others, it was a science fiction book, a planetarium visit, or a college course that changed their trajectory. And for many newer entrants to the industry, it might have been watching a Falcon 9 booster land for the first time or seeing the James Webb Space Telescope's first images.

The space industry is uniquely motivating because it connects deeply personal inspiration with some of humanity's biggest challenges and opportunities. People don't just work in space for the paycheck (there are easier ways to make money) — they work in space because something about exploring, understanding, and utilizing the cosmos resonates with them on a fundamental level.

I'd love to hear your stories. What first got you interested in space? How has that initial spark evolved as you've learned more about the industry? And for those who came to space later in their careers — what made you make the leap from whatever you were doing before?

Share your story, and let's celebrate the diversity of paths that bring people into this incredible industry. Your origin story might just inspire someone else who's considering whether the space industry is right for them.`,
      tags: ['personal-stories', 'inspiration', 'community-building', 'origin-story'],
    },
  ],
  'announcements': [
    {
      title: 'Welcome to SpaceNexus Community Forums',
      content: `We're thrilled to announce the launch of SpaceNexus Community Forums — a dedicated space for the space industry community to connect, discuss, and collaborate. After months of development and feedback from our early users, we're opening the doors to what we hope will become the premier online forum for space industry professionals and enthusiasts.

SpaceNexus started as a platform for space industry intelligence — tracking launches, monitoring companies, analyzing markets, and providing the data and tools that space professionals need. But we've always believed that the real value of any industry platform comes from the community it serves. These forums are the next step in that vision: a place where the people who are building, investing in, and thinking about the future of space can come together.

We've created eight initial categories covering the major topics of discussion in the space industry, from launch technology to policy to careers. But this is your community, and it will evolve based on how you use it. If you think we're missing a category, have ideas for features, or want to volunteer as a moderator, let us know. We're committed to building this together.

A few things to note as we launch: please review our Community Guidelines thread in this category for the rules of engagement. Be respectful, be constructive, and remember that everyone — from interns to executives, from students to professors — has something valuable to contribute. Welcome to the SpaceNexus community!`,
      isPinned: true,
      tags: ['launch', 'welcome', 'community', 'platform-update'],
    },
    {
      title: 'Community Guidelines and Code of Conduct',
      content: `Every great community needs clear expectations. These guidelines exist to ensure SpaceNexus forums remain a productive, respectful, and valuable space for everyone. By participating in these forums, you agree to follow these principles.

**Be Respectful and Professional.** The space industry is diverse — it includes military and civilian, government and commercial, established and startup, technical and business perspectives. Disagreement is welcome and healthy; personal attacks, harassment, and disrespectful behavior are not. Critique ideas, not people. Assume good faith. Remember that the person on the other side of the screen is a real human being with their own experiences and expertise.

**Be Substantive and Constructive.** We aim for thoughtful discussion, not hot takes. When you post, try to add value — share knowledge, ask genuine questions, provide constructive feedback, or offer a perspective that enriches the conversation. Low-effort posts, spam, and off-topic content will be moderated. If you're making factual claims, cite your sources when possible. It's okay to say "I don't know" or "I'm not sure about this."

**Respect Confidentiality and Intellectual Property.** Many forum members work under NDA, deal with export-controlled technology, or handle proprietary information. Never pressure anyone to share confidential information. Don't post proprietary documents, ITAR-controlled technical data, or material you don't have the right to share. When in doubt, don't post it. Violation of export control regulations is not just a forum rule — it's a serious legal matter.

**Moderation.** Our moderators are volunteers from the community. They have the authority to remove content, issue warnings, and suspend accounts for violations of these guidelines. If you disagree with a moderation decision, contact the moderation team privately — don't argue about it in the forums. We'll always try to be fair and transparent about our decisions.`,
      isPinned: true,
      tags: ['guidelines', 'code-of-conduct', 'rules', 'moderation', 'community'],
    },
    {
      title: 'SpaceNexus v1.2: Community Forums, Company Profiles, and More',
      content: `We're excited to share the latest SpaceNexus platform update, version 1.2, which brings several major new features and improvements to the platform. Here's a summary of what's new.

**Community Forums** are the headline feature of this release. We've built a full-featured discussion platform with eight topic categories, threaded discussions, voting, tagging, and user profiles. Forums are designed for substantive, long-form discussion that goes deeper than what's possible on social media or chat platforms. We believe the space industry needs a dedicated community space, and we're committed to making this the best one available.

**Company Profiles** have been significantly expanded. We now have detailed profiles for over 100 space industry companies, including financial data, satellite assets, facility locations, key events, and news coverage. Company profiles are integrated with our news feed, so you can see which companies are being mentioned in industry coverage and click through to their full profiles. We've also added company scoring across multiple dimensions (financial health, innovation, market position, ESG) to help with competitive analysis.

**Marketplace Enhancements** include improved search and filtering, a new AI copilot for procurement assistance, and teaming opportunity matching for companies looking to partner on government contracts. The marketplace now includes over 80 service listings across all major space industry categories.

We'd love your feedback on these new features. Drop your thoughts in the forums, use the contact form on the platform, or reach out directly. Every piece of feedback helps us build a better product for the space industry community. Thank you for being part of SpaceNexus!`,
      tags: ['release-notes', 'v1.2', 'platform-update', 'forums', 'company-profiles', 'marketplace'],
    },
  ],
};

export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    let categoriesCreated = 0;
    let threadsCreated = 0;

    // Step 1: Upsert forum categories
    const categoryMap: Record<string, string> = {};

    for (const cat of FORUM_CATEGORIES) {
      const result = await prisma.forumCategory.upsert({
        where: { slug: cat.slug },
        update: {
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          sortOrder: cat.sortOrder,
        },
        create: {
          slug: cat.slug,
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          sortOrder: cat.sortOrder,
        },
      });
      categoryMap[cat.slug] = result.id;
      categoriesCreated++;
    }

    logger.info(`Upserted ${categoriesCreated} forum categories`);

    // Step 2: Find or create system user
    let author = await prisma.user.findUnique({
      where: { email: 'system@spacenexus.io' },
    });

    if (!author) {
      author = await prisma.user.findFirst({
        where: { isAdmin: true },
      });
    }

    if (!author) {
      author = await prisma.user.create({
        data: {
          name: 'SpaceNexus Team',
          email: 'system@spacenexus.io',
          password: '',
        },
      });
      logger.info('Created system user for forum seeding');
    }

    const authorId = author.id;

    // Step 3: Seed threads per category (only if category has 0 threads)
    for (const [categorySlug, threads] of Object.entries(SEED_THREADS)) {
      const categoryId = categoryMap[categorySlug];
      if (!categoryId) {
        logger.warn(`Category not found for slug: ${categorySlug}`);
        continue;
      }

      // Check if category already has threads
      const existingCount = await prisma.forumThread.count({
        where: { categoryId },
      });

      if (existingCount > 0) {
        logger.info(`Category ${categorySlug} already has ${existingCount} threads, skipping`);
        continue;
      }

      for (const thread of threads) {
        try {
          // Check for duplicate by title
          const existing = await prisma.forumThread.findFirst({
            where: { title: thread.title },
          });

          if (existing) {
            logger.info(`Thread already exists: "${thread.title}", skipping`);
            continue;
          }

          await prisma.forumThread.create({
            data: {
              categoryId,
              authorId,
              title: thread.title,
              content: thread.content,
              isPinned: thread.isPinned || false,
              tags: thread.tags,
            },
          });

          threadsCreated++;
        } catch (err) {
          logger.warn(`Failed to create thread "${thread.title}": ${err}`);
        }
      }

      logger.info(`Seeded ${threads.length} threads in category ${categorySlug}`);
    }

    // Step 4: Return stats
    return createSuccessResponse({
      categoriesCreated,
      threadsCreated,
      authorId,
    });
  } catch (error) {
    logger.error('Forum init failed', { error });
    return internalError('Failed to initialize forum data');
  }
}
