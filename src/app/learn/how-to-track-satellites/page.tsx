import type { Metadata } from 'next';
import Link from 'next/link';
import FAQSchema from '@/components/seo/FAQSchema';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'How to Track Satellites in Real Time — Complete Guide | SpaceNexus',
  description:
    'Learn how to track satellites in real time including the ISS, Starlink, GPS, and 30,000+ objects. Understand TLE data, orbital mechanics, LEO/MEO/GEO orbits, and use free satellite tracking tools.',
  keywords: [
    'satellite tracker',
    'track satellites',
    'ISS tracker',
    'how to track satellites',
    'satellite tracking app',
    'Starlink tracker',
    'real time satellite tracking',
    'TLE data',
    'orbital tracking',
    'satellite position',
    'space station tracker',
    'satellite finder',
    'track satellites live',
    'satellite orbit tracker',
  ],
  openGraph: {
    title: 'How to Track Satellites in Real Time — Complete Guide',
    description:
      'Everything you need to know about satellite tracking: TLE data, orbit types, popular satellites to follow, and how to use SpaceNexus satellite tracker.',
    type: 'article',
    url: 'https://spacenexus.us/learn/how-to-track-satellites',
    siteName: 'SpaceNexus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Track Satellites in Real Time — Complete Guide',
    description:
      'Track the ISS, Starlink, GPS, and 30,000+ objects. Learn TLE data, orbit types, and use free tracking tools.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/learn/how-to-track-satellites',
  },
};

const orbitTypes = [
  {
    name: 'Low Earth Orbit (LEO)',
    altitude: '160 - 2,000 km',
    period: '88 - 127 minutes',
    speed: '7.8 km/s (28,000 km/h)',
    objectCount: '~25,000+',
    examples: 'ISS, Starlink, Hubble, Planet Labs, OneWeb',
    description:
      'The most populated orbit. Objects in LEO complete one revolution every 90-120 minutes and are visible to the naked eye during twilight. The ISS orbits at approximately 420 km, while Starlink satellites are at 550 km. Most Earth observation, communications constellations, and crewed missions operate in LEO.',
    visibility: 'Visible to naked eye at dawn/dusk when sunlit. Appears as a moving star. Best visibility within 1-2 hours of sunset or before sunrise.',
  },
  {
    name: 'Medium Earth Orbit (MEO)',
    altitude: '2,000 - 35,786 km',
    period: '2 - 24 hours',
    speed: '3.1 - 6.9 km/s',
    objectCount: '~200',
    examples: 'GPS (20,200 km), Galileo (23,222 km), GLONASS (19,100 km), O3b mPOWER',
    description:
      'Home to navigation constellations. GPS satellites orbit at 20,200 km with a 12-hour period, meaning each satellite passes over the same ground track twice per day. MEO satellites are generally too faint for naked-eye observation but are easily tracked by ground stations and radar.',
    visibility: 'Generally not visible to the naked eye. Requires telescope or binoculars. Tracked primarily via ground-based radar and telemetry.',
  },
  {
    name: 'Geostationary Orbit (GEO)',
    altitude: '35,786 km (equatorial)',
    period: '23 hours, 56 minutes',
    speed: '3.07 km/s (11,052 km/h)',
    objectCount: '~560 active',
    examples: 'DirecTV, SES Astra, GOES weather satellites, Intelsat, Inmarsat',
    description:
      'Satellites appear stationary over one point on the equator because their orbital period matches Earth\'s rotation. This makes them ideal for broadcast television, weather monitoring, and fixed communications. GEO slots are valuable real estate, managed by the ITU. At 35,786 km, these satellites cover roughly one-third of Earth\'s surface.',
    visibility: 'Visible as stationary points of light through binoculars or small telescopes. Too faint for naked eye from most locations.',
  },
  {
    name: 'Highly Elliptical Orbit (HEO)',
    altitude: '200 - 40,000+ km (varies)',
    period: '12 hours (Molniya) / 24 hours (Tundra)',
    speed: 'Varies with altitude',
    objectCount: '~30',
    examples: 'Molniya (Russian comms), Sirius XM, SBIRS HEO (missile warning)',
    description:
      'Highly elliptical orbits have a low perigee and a very high apogee. Satellites spend most of their time near apogee, providing extended dwell time over specific regions. Molniya orbits provide coverage of polar regions that GEO satellites cannot reach. SBIRS HEO sensors provide persistent infrared coverage for missile warning.',
    visibility: 'Occasionally visible during apogee passage when sunlit. Tracking requires knowledge of current orbital elements.',
  },
  {
    name: 'Sun-Synchronous Orbit (SSO)',
    altitude: '600 - 800 km (polar)',
    period: '~97 minutes',
    speed: '7.5 km/s',
    objectCount: '~3,000',
    examples: 'Landsat, Sentinel, WorldView, Planet SkySat, NOAA weather satellites',
    description:
      'A special type of polar LEO where the orbital plane precesses to maintain a constant angle with the Sun. This means the satellite passes over any given point at the same local solar time every day, providing consistent illumination for imaging. Nearly all Earth observation satellites use SSO.',
    visibility: 'Visible to naked eye, similar to other LEO objects. Best observed in early morning or late evening twilight.',
  },
];

const popularSatellites = [
  {
    name: 'International Space Station (ISS)',
    noradId: '25544',
    orbit: 'LEO (~420 km)',
    size: '109m x 73m',
    brightness: 'Magnitude -6 (very bright)',
    trackingTip: 'Easiest satellite to spot. Appears as a bright, steady light moving across the sky in 3-5 minutes. No blinking. Visible worldwide.',
    link: '/satellites',
  },
  {
    name: 'Starlink Constellation',
    noradId: 'Multiple (6,000+)',
    orbit: 'LEO (~550 km)',
    size: '3.4m x 2.8m each',
    brightness: 'Magnitude 5-7 (visible in groups)',
    trackingTip: 'Recently launched Starlink "trains" are visible as a string of bright dots moving in a line. Individual satellites are faint but detectable. Use SpaceNexus to predict train visibility.',
    link: '/satellites',
  },
  {
    name: 'Hubble Space Telescope',
    noradId: '20580',
    orbit: 'LEO (~535 km)',
    size: '13.2m x 4.2m',
    brightness: 'Magnitude 1-2',
    trackingTip: 'Visible to the naked eye under dark skies. Orbits at 535 km in a 28.5-degree inclination. Best viewed from latitudes between 28.5N and 28.5S.',
    link: '/satellites',
  },
  {
    name: 'Tiangong Space Station',
    noradId: '54216',
    orbit: 'LEO (~390 km)',
    size: '~40m x 20m (growing)',
    brightness: 'Magnitude -1 to 1',
    trackingTip: 'China\'s modular space station. Visible to the naked eye, similar appearance to ISS but somewhat fainter. Inclined at 41.5 degrees, visible from most populated areas.',
    link: '/satellites',
  },
  {
    name: 'GPS Constellation',
    noradId: 'Multiple (31 active)',
    orbit: 'MEO (~20,200 km)',
    size: '~6m wingspan each',
    brightness: 'Not visible',
    trackingTip: 'GPS satellites are too far away to see with the naked eye, but your phone uses signals from 4+ GPS satellites simultaneously to determine your position to within a few meters.',
    link: '/satellites',
  },
  {
    name: 'GOES Weather Satellites',
    noradId: 'Multiple (GOES-16, 18)',
    orbit: 'GEO (~35,786 km)',
    size: '~6.1m x 5.6m',
    brightness: 'Telescope only',
    trackingTip: 'Geostationary weather satellites provide the images you see on weather forecasts. GOES-16 covers the eastern US, GOES-18 covers the western US. Fixed position in the sky.',
    link: '/satellites',
  },
];

const trackingConcepts = [
  {
    concept: 'Two-Line Element Sets (TLEs)',
    description:
      'TLEs are the standard format for describing a satellite\'s orbit. Each TLE contains six orbital elements (inclination, RAAN, eccentricity, argument of perigee, mean anomaly, mean motion) plus identification and epoch data. Published by the US Space Force 18th Space Defense Squadron via Space-Track.org.',
    example: '1 25544U 98067A   26048.52916667  .00005423  00000-0  10319-3 0  9994\n2 25544  51.6455 275.4579 0005225 127.8510  12.1645 15.49527089398472',
  },
  {
    concept: 'Orbital Propagation (SGP4)',
    description:
      'The Simplified General Perturbations model (SGP4) is the standard algorithm for predicting satellite positions from TLE data. It accounts for atmospheric drag, Earth\'s oblateness (J2 effect), and solar/lunar gravitational perturbations. SGP4 predictions are accurate to about 1 km over a few days but degrade over time, requiring regular TLE updates.',
  },
  {
    concept: 'NORAD Catalog Number',
    description:
      'Every tracked object in space receives a unique catalog number from the US Space Force. The ISS is 25544, Hubble is 20580, and the first Sputnik was 00001. Over 50,000 objects have been cataloged since 1957. SpaceNexus uses NORAD IDs to uniquely identify all tracked objects.',
  },
  {
    concept: 'Ground Track',
    description:
      'A satellite\'s ground track is the path its sub-satellite point traces on Earth\'s surface. LEO satellites trace sinusoidal paths due to Earth\'s rotation beneath them. A satellite with a 97-minute period shifts approximately 24 degrees westward on each successive orbit. Ground tracks are essential for predicting when a satellite will pass over your location.',
  },
  {
    concept: 'Space Debris Tracking',
    description:
      'In addition to active satellites, the US Space Force tracks over 30,000 pieces of debris larger than 10 cm. This includes spent rocket stages, defunct satellites, and collision fragments. Debris tracking is critical for conjunction analysis (collision avoidance). SpaceNexus visualizes debris density in the Space Environment module.',
  },
];

const faqItems = [
  {
    question: 'Can I see satellites with the naked eye?',
    answer:
      'Yes, many satellites in Low Earth Orbit (LEO) are visible to the naked eye, especially during twilight hours (1-2 hours after sunset or before sunrise). The International Space Station is the brightest artificial object in the sky (magnitude -6, brighter than Venus). Starlink "trains" of recently deployed satellites are also easily visible. Satellites appear as steady, non-blinking points of light moving smoothly across the sky, completing a pass in 3-6 minutes. Use SpaceNexus to predict exactly when visible passes occur for your location.',
  },
  {
    question: 'How many satellites are currently in orbit?',
    answer:
      'As of early 2026, there are approximately 10,000+ active satellites in orbit, with SpaceX Starlink alone accounting for over 6,000. The US Space Force tracks over 30,000 objects larger than 10 cm (including debris), and an estimated 100 million pieces of debris smaller than 1 cm are in orbit. The number of active satellites has more than tripled since 2020, driven primarily by mega-constellation deployments.',
  },
  {
    question: 'What is the best satellite tracking app?',
    answer:
      'SpaceNexus provides a comprehensive satellite tracker with real-time position data for 30,000+ objects, interactive 3D visualization, pass predictions for your location, and constellation views. Other popular tools include Heavens-Above (for visual observers), Space-Track.org (for raw TLE data, requires registration), and N2YO.com (simple web-based tracker). For professional satellite operators, SpaceNexus also provides conjunction analysis and orbital management tools.',
  },
  {
    question: 'How does satellite tracking work technically?',
    answer:
      'Satellite tracking relies on three components: (1) Observations — ground-based radar, optical telescopes, and laser ranging stations detect and measure satellite positions. The US Space Surveillance Network has 30+ sensor sites worldwide. (2) Orbit determination — observations are used to compute orbital elements, published as Two-Line Element Sets (TLEs). (3) Propagation — the SGP4 algorithm predicts future positions from TLEs, accounting for atmospheric drag, gravitational perturbations, and solar radiation pressure. TLEs are updated 1-4 times per day for most objects.',
  },
  {
    question: 'How fast do satellites travel?',
    answer:
      'Satellite speed depends on altitude. In Low Earth Orbit (400 km), satellites travel at approximately 7.67 km/s (27,600 km/h or 17,150 mph), completing one orbit every 93 minutes. In Medium Earth Orbit (20,200 km, like GPS), speed drops to about 3.87 km/s. At geostationary altitude (35,786 km), satellites travel at 3.07 km/s — precisely the speed needed to match Earth\'s rotation and appear stationary. The general rule: higher altitude means slower speed but longer orbital period.',
  },
];

export default function HowToTrackSatellitesPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How to Track Satellites in Real Time — Complete Guide',
    description:
      'Learn how satellite tracking works, understand TLE data and orbital mechanics, explore orbit types, and track the ISS, Starlink, and 30,000+ objects.',
    author: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
    publisher: {
      '@type': 'Organization',
      name: 'SpaceNexus',
      url: 'https://spacenexus.us',
      logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/spacenexus-logo.png' },
    },
    datePublished: '2026-02-18T00:00:00Z',
    dateModified: '2026-02-18T00:00:00Z',
    mainEntityOfPage: 'https://spacenexus.us/learn/how-to-track-satellites',
  };

  return (
    <div className="min-h-screen pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
      <FAQSchema items={faqItems} />

      <div className="container mx-auto px-4 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-8">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/learn" className="hover:text-slate-300 transition-colors">Learning Center</Link>
          <span>/</span>
          <span className="text-slate-400">How to Track Satellites</span>
        </nav>

        {/* Hero */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-nebula-500/10 text-nebula-400 border border-nebula-500/20">
              Technical Guide
            </span>
            <span className="text-xs text-slate-500">Updated February 2026</span>
            <span className="text-xs text-slate-500">11 min read</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
            How to Track Satellites in Real Time — Complete Guide
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            Over 10,000 active satellites orbit Earth right now, from the International Space Station
            visible to the naked eye to tiny CubeSats transmitting scientific data. Whether you are a
            satellite operator managing a constellation, an amateur astronomer spotting the ISS, or an
            analyst tracking orbital debris, this guide explains how satellite tracking works and how to
            use SpaceNexus to monitor any object in space.
          </p>
        </header>

        {/* What is Satellite Tracking */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">What Is Satellite Tracking?</h2>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-6">
            <p className="text-slate-300 leading-relaxed mb-4">
              Satellite tracking is the process of determining and predicting the position of artificial
              objects in Earth orbit. It combines ground-based observations (radar, optical telescopes,
              laser ranging) with mathematical models to compute where a satellite is right now and where
              it will be in the future.
            </p>
            <p className="text-slate-300 leading-relaxed mb-4">
              The US Space Force&apos;s 18th Space Defense Squadron operates a global network of 30+ sensors
              called the Space Surveillance Network (SSN). This network tracks over 30,000 objects
              larger than 10 cm, publishing orbital data as Two-Line Element Sets (TLEs) that anyone can
              use for tracking.
            </p>
            <h3 className="text-white font-semibold mb-3">Who uses satellite tracking?</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-3 text-slate-300 text-sm">
                <span className="text-nebula-400 mt-0.5 shrink-0">&#10003;</span>
                <span><strong className="text-white">Satellite operators</strong> — Monitor fleet health, plan maneuvers, avoid collisions</span>
              </li>
              <li className="flex items-start gap-3 text-slate-300 text-sm">
                <span className="text-nebula-400 mt-0.5 shrink-0">&#10003;</span>
                <span><strong className="text-white">Military & intelligence</strong> — Space domain awareness, treaty verification, threat assessment</span>
              </li>
              <li className="flex items-start gap-3 text-slate-300 text-sm">
                <span className="text-nebula-400 mt-0.5 shrink-0">&#10003;</span>
                <span><strong className="text-white">Amateur astronomers</strong> — Predict ISS passes, spot satellite flares, photograph satellites</span>
              </li>
              <li className="flex items-start gap-3 text-slate-300 text-sm">
                <span className="text-nebula-400 mt-0.5 shrink-0">&#10003;</span>
                <span><strong className="text-white">Researchers</strong> — Study orbital debris, analyze conjunction risks, model orbital environments</span>
              </li>
              <li className="flex items-start gap-3 text-slate-300 text-sm">
                <span className="text-nebula-400 mt-0.5 shrink-0">&#10003;</span>
                <span><strong className="text-white">Spectrum managers</strong> — Coordinate radio frequency usage, avoid interference</span>
              </li>
            </ul>
          </div>
        </section>

        {/* How Tracking Works */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-2">How Satellite Tracking Works</h2>
          <p className="text-slate-400 text-sm mb-6">
            From radar observation to position prediction, here are the core concepts that make satellite
            tracking possible.
          </p>
          <div className="space-y-4">
            {trackingConcepts.map((tc) => (
              <div key={tc.concept} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-5">
                <h3 className="text-white font-semibold mb-2">{tc.concept}</h3>
                <p className="text-slate-400 text-sm mb-2">{tc.description}</p>
                {'example' in tc && tc.example && (
                  <div className="mt-3 bg-slate-900/60 rounded-md p-3">
                    <div className="text-xs text-slate-500 mb-1">Example TLE (ISS):</div>
                    <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all">{tc.example}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Orbit Types */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-2">Types of Orbits Explained</h2>
          <p className="text-slate-400 text-sm mb-6">
            Understanding orbit types is essential for satellite tracking. Each orbit has different
            characteristics that affect visibility, tracking difficulty, and use cases.
          </p>
          <div className="space-y-4">
            {orbitTypes.map((orbit) => (
              <div key={orbit.name} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-5">
                <h3 className="text-white font-semibold text-lg mb-1">{orbit.name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-xs">
                  <div>
                    <span className="text-slate-500">Altitude:</span>
                    <span className="text-slate-300 ml-1">{orbit.altitude}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Period:</span>
                    <span className="text-slate-300 ml-1">{orbit.period}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Speed:</span>
                    <span className="text-slate-300 ml-1">{orbit.speed}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Objects:</span>
                    <span className="text-nebula-400 ml-1">{orbit.objectCount}</span>
                  </div>
                </div>
                <p className="text-slate-400 text-sm mb-3">{orbit.description}</p>
                <div className="flex flex-col gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Examples: </span>
                    <span className="text-slate-300">{orbit.examples}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Visibility: </span>
                    <span className="text-slate-300">{orbit.visibility}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Popular Satellites */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-2">Popular Satellites to Track</h2>
          <p className="text-slate-400 text-sm mb-6">
            These are the most commonly tracked objects in Earth orbit, ranging from the highly visible
            ISS to the utilitarian GPS constellation.
          </p>
          <div className="space-y-4">
            {popularSatellites.map((sat) => (
              <div key={sat.name} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 className="text-white font-semibold">{sat.name}</h3>
                  <Link
                    href={sat.link}
                    className="text-xs text-nebula-400 hover:underline"
                  >
                    Track on SpaceNexus
                  </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-xs">
                  <div>
                    <span className="text-slate-500">NORAD ID:</span>
                    <span className="text-slate-300 ml-1">{sat.noradId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Orbit:</span>
                    <span className="text-slate-300 ml-1">{sat.orbit}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Size:</span>
                    <span className="text-slate-300 ml-1">{sat.size}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Brightness:</span>
                    <span className="text-slate-300 ml-1">{sat.brightness}</span>
                  </div>
                </div>
                <p className="text-slate-400 text-sm">{sat.trackingTip}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How to Use SpaceNexus Tracker */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">How to Use the SpaceNexus Satellite Tracker</h2>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-6">
            <ol className="space-y-5">
              <li className="flex items-start gap-3">
                <span className="text-nebula-400 font-bold text-lg shrink-0">1.</span>
                <div>
                  <h4 className="text-white font-semibold">Open the Satellite Tracker</h4>
                  <p className="text-slate-400 text-sm mt-1">
                    Navigate to{' '}
                    <Link href="/satellites" className="text-nebula-400 hover:underline">
                      SpaceNexus Satellite Tracker
                    </Link>{' '}
                    from the main menu under Space Operations. The interactive 3D globe loads with all
                    tracked objects displayed in real time.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-nebula-400 font-bold text-lg shrink-0">2.</span>
                <div>
                  <h4 className="text-white font-semibold">Search for a Satellite</h4>
                  <p className="text-slate-400 text-sm mt-1">
                    Use the search bar to find any satellite by name (e.g., &quot;ISS&quot;), NORAD catalog number
                    (e.g., &quot;25544&quot;), or international designator. Results show orbital parameters, current
                    position, and next pass predictions.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-nebula-400 font-bold text-lg shrink-0">3.</span>
                <div>
                  <h4 className="text-white font-semibold">Filter by Orbit or Type</h4>
                  <p className="text-slate-400 text-sm mt-1">
                    Filter the display by orbit type (LEO, MEO, GEO), satellite type (active, debris,
                    rocket body), or constellation (Starlink, OneWeb, GPS). Toggle layers on and off to
                    focus on specific objects.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-nebula-400 font-bold text-lg shrink-0">4.</span>
                <div>
                  <h4 className="text-white font-semibold">View Orbital Details</h4>
                  <p className="text-slate-400 text-sm mt-1">
                    Click on any satellite to view detailed orbital elements: altitude, velocity,
                    inclination, period, RAAN, eccentricity, and current ground track. Historical
                    orbit data shows how parameters have changed over time.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-nebula-400 font-bold text-lg shrink-0">5.</span>
                <div>
                  <h4 className="text-white font-semibold">Monitor Constellations</h4>
                  <p className="text-slate-400 text-sm mt-1">
                    Use the{' '}
                    <Link href="/constellations" className="text-nebula-400 hover:underline">
                      Constellation Tracker
                    </Link>{' '}
                    to visualize entire satellite networks. See deployment progress, orbital planes,
                    coverage maps, and deorbit status for Starlink, OneWeb, Kuiper, and more.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-nebula-400 font-bold text-lg shrink-0">6.</span>
                <div>
                  <h4 className="text-white font-semibold">Track Debris and Space Weather</h4>
                  <p className="text-slate-400 text-sm mt-1">
                    The{' '}
                    <Link href="/space-environment" className="text-nebula-400 hover:underline">
                      Space Environment
                    </Link>{' '}
                    module provides debris density visualization, conjunction warnings, solar weather
                    alerts, and orbital decay predictions. Essential for satellite operators.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* Satellite Visibility Tips */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Tips for Spotting Satellites</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-5">
              <h3 className="text-white font-semibold mb-2">Best Viewing Times</h3>
              <p className="text-slate-400 text-sm">
                The ideal window is 30-90 minutes after sunset or before sunrise. The sky needs to be
                dark enough to see faint objects, but the satellite must still be illuminated by the Sun.
                This twilight zone is when most LEO satellites are visible.
              </p>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-5">
              <h3 className="text-white font-semibold mb-2">What to Look For</h3>
              <p className="text-slate-400 text-sm">
                Satellites appear as steady, non-blinking points of light moving in a straight line across
                the sky. Aircraft blink. Stars twinkle. Satellites do neither. The ISS is the brightest and
                takes 3-5 minutes to cross the sky. Most satellites are visible for 1-4 minutes.
              </p>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-5">
              <h3 className="text-white font-semibold mb-2">Starlink Trains</h3>
              <p className="text-slate-400 text-sm">
                Newly launched Starlink satellites fly in a visible &quot;train&quot; formation for the first few
                days before dispersing to their operational orbits. These trains of 20-60 satellites
                in a line are a stunning sight and easily visible to the naked eye.
              </p>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-5">
              <h3 className="text-white font-semibold mb-2">Iridium Flares</h3>
              <p className="text-slate-400 text-sm">
                The original Iridium satellites produced brilliant flares (magnitude -8, brighter than
                Venus) when their antenna panels reflected sunlight. The original constellation has been
                deorbited, but Iridium NEXT satellites can still produce fainter reflections.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="bg-slate-800/60 border border-nebula-500/30 rounded-xl p-6 text-center mb-12">
          <h3 className="text-xl font-bold text-white mb-2">Start Tracking Satellites Now</h3>
          <p className="text-slate-400 text-sm mb-4">
            SpaceNexus tracks over 30,000 objects in real time with 3D visualization, pass predictions,
            constellation monitoring, and debris tracking. Free to use.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/satellites"
              className="inline-block bg-nebula-500 hover:bg-nebula-600 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              Open Satellite Tracker
            </Link>
            <Link
              href="/space-environment"
              className="inline-block bg-slate-700/50 hover:bg-slate-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors border border-slate-600/50"
            >
              View Space Environment
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">{item.question}</h3>
                <p className="text-slate-400 text-sm">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Internal Links */}
        <section className="border-t border-slate-700/50 pt-8 mb-8">
          <h3 className="text-lg font-bold text-white mb-4">Related SpaceNexus Tools & Data</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              href="/satellites"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Satellite Tracker</div>
              <div className="text-slate-500 text-xs">30,000+ objects</div>
            </Link>
            <Link
              href="/space-environment"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Space Environment</div>
              <div className="text-slate-500 text-xs">Weather & debris</div>
            </Link>
            <Link
              href="/constellations"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Constellations</div>
              <div className="text-slate-500 text-xs">Fleet tracking</div>
            </Link>
            <Link
              href="/orbital-costs"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Orbital Costs</div>
              <div className="text-slate-500 text-xs">Pricing data</div>
            </Link>
          </div>
        </section>

        {/* Other Guides */}
        <section className="border-t border-slate-700/50 pt-8">
          <h3 className="text-lg font-bold text-white mb-4">More from the Learning Center</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link
              href="/learn/satellite-launch-cost"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Satellite Launch Costs</div>
              <div className="text-slate-500 text-xs">Complete cost breakdown</div>
            </Link>
            <Link
              href="/learn/space-industry-market-size"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Space Industry Market Size</div>
              <div className="text-slate-500 text-xs">$1.8 trillion and growing</div>
            </Link>
            <Link
              href="/learn/space-companies-to-watch"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Top Space Companies 2026</div>
              <div className="text-slate-500 text-xs">25 companies to watch</div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
