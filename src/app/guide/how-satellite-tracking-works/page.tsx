import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 3600; // ISR: revalidate every hour

export const metadata: Metadata = {
  title: 'How Satellite Tracking Works: Technology, Methods & Tools | SpaceNexus Guide',
  description:
    'Learn how satellite tracking works: radar, optical, TLE data, orbital mechanics, and real-time tools used to monitor 10,000+ active satellites.',
  keywords: [
    'satellite tracking',
    'how satellite tracking works',
    'TLE two-line element',
    'orbital mechanics',
    'space situational awareness',
    'satellite radar tracking',
    'space surveillance network',
    'satellite orbit prediction',
    'NORAD tracking',
    'space debris tracking',
  ],
  openGraph: {
    title: 'How Satellite Tracking Works: Technology, Methods & Tools',
    description:
      'Learn how satellite tracking works: radar, optical sensors, TLE data, and the tools used to monitor 10,000+ active satellites in orbit.',
    type: 'article',
    publishedTime: '2026-02-08T00:00:00Z',
    authors: ['SpaceNexus'],
  },
  alternates: {
    canonical: 'https://spacenexus.com/guide/how-satellite-tracking-works',
  },
};

/* ------------------------------------------------------------------ */
/*  Table of Contents data                                            */
/* ------------------------------------------------------------------ */
const TOC = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'orbital-mechanics', label: 'Orbital Mechanics Basics' },
  { id: 'orbit-types', label: 'Types of Orbits' },
  { id: 'tracking-methods', label: 'Tracking Methods' },
  { id: 'ssn', label: 'Space Surveillance Networks' },
  { id: 'tle-data', label: 'TLE Data Explained' },
  { id: 'prediction', label: 'Orbit Prediction & Propagation' },
  { id: 'conjunction', label: 'Conjunction Assessment' },
  { id: 'commercial-tracking', label: 'Commercial Tracking Services' },
  { id: 'challenges', label: 'Modern Challenges' },
  { id: 'stm', label: 'Space Traffic Management' },
  { id: 'tools', label: 'Tracking Tools & Platforms' },
  { id: 'spacenexus', label: 'Track Satellites on SpaceNexus' },
];

/* ------------------------------------------------------------------ */
/*  FAQ data                                                          */
/* ------------------------------------------------------------------ */
const FAQ_ITEMS = [
  {
    q: 'How many satellites are currently in orbit?',
    a: 'As of early 2026, there are over 10,000 active satellites in Earth orbit, according to data from the Union of Concerned Scientists (UCS) satellite database and the U.S. Space Force 18th Space Defense Squadron catalog. The total number of tracked objects (including debris and inactive satellites) exceeds 48,000.',
  },
  {
    q: 'What is a TLE (Two-Line Element set)?',
    a: 'A TLE is a standardized data format that encodes the orbital elements of a satellite in two 69-character lines. TLEs specify the inclination, eccentricity, argument of perigee, right ascension of the ascending node, mean anomaly, and mean motion of an object. They are published by the U.S. Space Force via space-track.org and are the primary data format used for satellite tracking worldwide.',
  },
  {
    q: 'Who tracks satellites?',
    a: 'The primary global satellite tracking authority is the U.S. Space Force 18th Space Defense Squadron (formerly the 18th Space Control Squadron), which operates the Space Surveillance Network (SSN). Other government entities include the Russian Space Surveillance System, the European Space Surveillance and Tracking (EU SST) program, and national agencies in Japan, Australia, and others. Commercial tracking providers include LeoLabs, ExoAnalytic Solutions, and Numerica Corporation.',
  },
  {
    q: 'How accurate is satellite tracking?',
    a: 'Accuracy depends on the tracking system and the object being tracked. The U.S. Space Surveillance Network can determine the position of objects in LEO to within roughly 100 meters using radar, and within a few hundred meters for objects in GEO using optical telescopes. Commercial providers like LeoLabs claim radar tracking accuracy of 10-20 meters in LEO. For conjunction assessment (collision prediction), uncertainties are typically expressed as covariance ellipsoids, with along-track uncertainty being the largest component due to atmospheric drag uncertainties.',
  },
];

/* ------------------------------------------------------------------ */
/*  Structured data (JSON-LD)                                         */
/* ------------------------------------------------------------------ */
function buildStructuredData() {
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How Satellite Tracking Works: Technology, Methods & Tools',
    description:
      'Comprehensive guide to satellite tracking technology including radar, optical methods, TLE data, orbital mechanics, and modern tracking tools.',
    author: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.com' },
    publisher: {
      '@type': 'Organization',
      name: 'SpaceNexus',
      logo: { '@type': 'ImageObject', url: 'https://spacenexus.com/logo.png' },
    },
    datePublished: '2026-02-08T00:00:00Z',
    dateModified: '2026-02-08T00:00:00Z',
    mainEntityOfPage: 'https://spacenexus.com/guide/how-satellite-tracking-works',
    image: 'https://spacenexus.com/og-image.png',
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return { article, faqSchema };
}

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */
export default function HowSatelliteTrackingWorksPage() {
  const { article, faqSchema } = buildStructuredData();

  return (
    <>
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="min-h-screen">
        {/* ── Hero ── */}
        <header className="relative overflow-hidden py-20 md:py-28">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-nebula-600/30 via-space-900/80 to-transparent pointer-events-none"
          />
          <div className="relative container mx-auto px-4 text-center max-w-4xl">
            <div className="flex items-center justify-center gap-2 text-star-300 text-sm mb-4">
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <span className="text-star-300/50">/</span>
              <Link href="/guide/space-industry" className="hover:text-white transition-colors">
                Guide
              </Link>
              <span className="text-star-300/50">/</span>
              <span className="text-white">Satellite Tracking</span>
            </div>
            <h1 className="text-display-lg md:text-display-xl font-display font-bold text-white mb-6 leading-tight">
              How Satellite Tracking Works
            </h1>
            <p className="text-xl md:text-2xl text-star-200 leading-relaxed max-w-3xl mx-auto">
              Technology, Methods &amp; Tools for Monitoring Objects in Orbit
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-star-300">
              <time dateTime="2026-02-08">Last updated: February 2026</time>
              <span className="hidden sm:inline text-star-300/40">|</span>
              <span>22 min read</span>
              <span className="hidden sm:inline text-star-300/40">|</span>
              <span>By SpaceNexus Research</span>
            </div>
            <div className="w-24 h-[3px] bg-gradient-to-r from-nebula-500 to-plasma-400 rounded-full mx-auto mt-8" />
          </div>
        </header>

        {/* ── Main content area ── */}
        <div className="container mx-auto px-4 pb-20">
          <div className="flex flex-col lg:flex-row gap-10 max-w-7xl mx-auto">
            {/* ── Table of Contents (sidebar) ── */}
            <aside className="lg:w-64 shrink-0">
              <nav
                aria-label="Table of Contents"
                className="lg:sticky lg:top-24 card p-5"
              >
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                  Contents
                </h2>
                <ol className="space-y-2 text-sm">
                  {TOC.map((item, i) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="flex items-start gap-2 text-star-300 hover:text-cyan-400 transition-colors"
                      >
                        <span className="text-cyan-500/60 font-mono text-xs mt-0.5">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            {/* ── Article content ── */}
            <article className="min-w-0 flex-1 max-w-3xl">
              {/* ──────────────────────────────────── */}
              {/* 1. Introduction                     */}
              {/* ──────────────────────────────────── */}
              <section id="introduction" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Introduction
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    More than 10,000 active satellites currently orbit the Earth, and the number is
                    growing rapidly. SpaceX alone has launched over 6,000 Starlink satellites, and
                    with Amazon&apos;s Project Kuiper, China&apos;s Guowang constellation, and dozens
                    of other operators deploying spacecraft, the total population of active satellites
                    could exceed 50,000 within the next decade.
                  </p>
                  <p>
                    Tracking all of these objects -- along with spent rocket stages, defunct satellites,
                    and fragments from collisions and explosions -- is one of the most complex
                    operational challenges in the space domain. Satellite tracking, formally known as
                    space situational awareness (SSA) or space domain awareness (SDA), involves
                    detecting, cataloging, and predicting the positions of objects in Earth orbit
                    to prevent collisions, ensure mission success, and maintain the long-term
                    sustainability of the space environment.
                  </p>
                  <p>
                    This guide explains the fundamental physics, technology, data formats, and
                    operational processes that make satellite tracking possible. Whether you are a
                    satellite operator, a student of orbital mechanics, an investor evaluating SSA
                    companies, or simply curious about how we keep track of objects moving at 7.5
                    kilometers per second, this is a comprehensive starting point.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 2. Orbital Mechanics Basics          */}
              {/* ──────────────────────────────────── */}
              <section id="orbital-mechanics" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Orbital Mechanics Basics
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    Satellite tracking is grounded in the physics of orbital mechanics, which
                    describes the motion of objects under the influence of gravity. The foundational
                    work was established by Johannes Kepler (whose three laws of planetary motion
                    describe the shape, speed, and period of orbits) and Isaac Newton (whose law of
                    universal gravitation provides the mathematical framework for calculating
                    trajectories).
                  </p>
                  <p>
                    In idealized two-body mechanics (one massive body, one negligible mass), an orbit
                    is fully described by six parameters known as <strong className="text-white">Keplerian
                    orbital elements</strong>:
                  </p>

                  <div className="card p-6 my-8">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                      The Six Classical Orbital Elements
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex gap-3 border-b border-cyan-400/10 pb-2">
                        <span className="text-cyan-400 font-mono font-semibold w-8 shrink-0">a</span>
                        <div>
                          <span className="text-white font-medium">Semi-major axis</span>
                          <span className="text-star-300"> -- size of the orbit (determines period)</span>
                        </div>
                      </div>
                      <div className="flex gap-3 border-b border-cyan-400/10 pb-2">
                        <span className="text-cyan-400 font-mono font-semibold w-8 shrink-0">e</span>
                        <div>
                          <span className="text-white font-medium">Eccentricity</span>
                          <span className="text-star-300"> -- shape of the orbit (0 = circular, 0-1 = elliptical)</span>
                        </div>
                      </div>
                      <div className="flex gap-3 border-b border-cyan-400/10 pb-2">
                        <span className="text-cyan-400 font-mono font-semibold w-8 shrink-0">i</span>
                        <div>
                          <span className="text-white font-medium">Inclination</span>
                          <span className="text-star-300"> -- tilt of the orbit relative to the equator</span>
                        </div>
                      </div>
                      <div className="flex gap-3 border-b border-cyan-400/10 pb-2">
                        <span className="text-cyan-400 font-mono font-semibold w-8 shrink-0">&Omega;</span>
                        <div>
                          <span className="text-white font-medium">Right ascension of ascending node (RAAN)</span>
                          <span className="text-star-300"> -- orientation of the orbital plane</span>
                        </div>
                      </div>
                      <div className="flex gap-3 border-b border-cyan-400/10 pb-2">
                        <span className="text-cyan-400 font-mono font-semibold w-8 shrink-0">&omega;</span>
                        <div>
                          <span className="text-white font-medium">Argument of perigee</span>
                          <span className="text-star-300"> -- orientation of the ellipse within the orbital plane</span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-cyan-400 font-mono font-semibold w-8 shrink-0">&nu;</span>
                        <div>
                          <span className="text-white font-medium">True anomaly</span>
                          <span className="text-star-300"> -- position of the satellite along the orbit at a given time</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p>
                    In practice, real orbits are not perfectly Keplerian. They are perturbed by
                    Earth&apos;s non-spherical gravity field (particularly the J2 oblateness term),
                    atmospheric drag (significant below ~800 km altitude), solar radiation pressure,
                    lunar and solar gravitational influences, and relativistic effects. Accurate orbit
                    determination must account for all of these perturbations, which is why orbit
                    prediction is computationally intensive and why tracking data must be updated
                    regularly.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 3. Types of Orbits                   */}
              {/* ──────────────────────────────────── */}
              <section id="orbit-types" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Types of Orbits
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    Different types of orbits serve different purposes, and each presents distinct
                    tracking challenges.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Low Earth Orbit (LEO): 200-2,000 km
                  </h3>
                  <p>
                    LEO is the most populated orbital regime, home to the International Space
                    Station (~415 km), Starlink (~550 km), Planet Labs satellites (~475 km), and
                    most Earth observation and scientific satellites. Objects in LEO complete an
                    orbit in approximately 90 to 130 minutes and travel at roughly 7.5 km/s. LEO
                    satellites are subject to significant atmospheric drag, especially below 500 km,
                    which causes orbital decay and makes long-term orbit prediction more challenging.
                    Radar is the primary tracking method for LEO objects.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Medium Earth Orbit (MEO): 2,000-35,786 km
                  </h3>
                  <p>
                    MEO is used primarily for navigation satellites (GPS at ~20,200 km, Galileo at
                    ~23,222 km, GLONASS at ~19,100 km) and some communication constellations
                    (Eutelsat OneWeb at ~1,200 km, technically upper LEO). MEO satellites orbit more
                    slowly than LEO objects (periods of 2-24 hours) and experience less atmospheric
                    drag, making their orbits more predictable. Tracking at MEO altitudes typically
                    uses a combination of radar and optical methods.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Geostationary Orbit (GEO): ~35,786 km
                  </h3>
                  <p>
                    GEO is a circular orbit at approximately 35,786 km altitude where the orbital
                    period matches Earth&apos;s rotation, causing the satellite to appear stationary
                    over a fixed point on the equator. GEO is used for communications satellites
                    (SES, Intelsat, Viasat), weather satellites (GOES, Meteosat), and some military
                    early warning systems. GEO satellites are typically tracked using optical
                    telescopes, as the distance makes radar tracking more challenging. The GEO belt
                    is a finite resource, with orbital slots allocated by the International
                    Telecommunication Union (ITU).
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Highly Elliptical Orbits (HEO)
                  </h3>
                  <p>
                    HEO orbits, such as Molniya orbits (used by Russia for high-latitude
                    communications) and Tundra orbits, have high eccentricity, spending most of
                    their orbital period at high altitudes over specific regions. These orbits present
                    unique tracking challenges due to the wide range of altitudes and velocities
                    involved.
                  </p>

                  <p className="mt-4">
                    <Link href="/satellites" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Explore satellite orbits in real time on SpaceNexus
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 4. Tracking Methods                  */}
              {/* ──────────────────────────────────── */}
              <section id="tracking-methods" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Satellite Tracking Methods
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <h3 className="text-xl font-semibold text-white mt-4 mb-3">
                    Radar Tracking
                  </h3>
                  <p>
                    Radar is the workhorse of satellite tracking for objects in low Earth orbit.
                    Tracking radars emit radio pulses and measure the time, direction, and Doppler
                    shift of reflected signals to determine an object&apos;s range, azimuth,
                    elevation, and radial velocity. The U.S. Space Surveillance Network (SSN)
                    operates several powerful radar systems, including the AN/FPS-85 phased array
                    radar at Eglin Air Force Base (Florida), the Space Fence on Kwajalein Atoll
                    (Marshall Islands), and several other dedicated tracking radars.
                  </p>
                  <p>
                    The <strong className="text-white">Space Fence</strong>, which became operational
                    in 2020, is a ground-based S-band radar system that represents a major upgrade
                    in U.S. tracking capability. Operating in the Kwajalein Atoll, it can detect and
                    track objects as small as 10 centimeters in LEO, significantly smaller than
                    previous systems. The Space Fence has increased the U.S. catalog by thousands of
                    newly tracked objects.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Optical Tracking
                  </h3>
                  <p>
                    Optical tracking uses telescopes equipped with CCD or CMOS sensors to observe
                    satellites by the sunlight they reflect. Optical methods are particularly
                    effective for tracking objects in GEO and MEO, where radar range limitations make
                    radio-based tracking less practical. Optical observations can provide highly
                    accurate angular position measurements but depend on favorable lighting
                    conditions -- the satellite must be illuminated by the sun while the observer is
                    in darkness (typically during twilight hours for LEO observations).
                  </p>
                  <p>
                    The U.S. operates the Ground-Based Electro-Optical Deep Space Surveillance
                    (GEODSS) system at sites in New Mexico, Hawaii, and Diego Garcia, specifically
                    designed to track objects in deep space (GEO and beyond). Commercial providers
                    like ExoAnalytic Solutions operate global networks of commercial telescopes for
                    GEO tracking and characterization.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Passive RF Tracking
                  </h3>
                  <p>
                    Some tracking systems detect the radio frequency (RF) emissions from active
                    satellites -- their telemetry, beacon signals, or communication transmissions.
                    This passive approach can identify and locate satellites without emitting any
                    signals. Companies like HawkEye 360 operate satellite constellations that
                    geolocate RF emitters from space, which can include satellite signals.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Laser Ranging (SLR)
                  </h3>
                  <p>
                    Satellite Laser Ranging (SLR) provides the highest precision tracking
                    measurements available, achieving millimeter-level accuracy by bouncing short
                    laser pulses off retroreflectors mounted on certain satellites. The International
                    Laser Ranging Service (ILRS) coordinates a global network of approximately 40
                    SLR stations. While SLR is too resource-intensive for routine tracking of the
                    full catalog, it provides critical data for geodesy, precise orbit determination
                    of reference satellites, and calibration of other tracking systems.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 5. Space Surveillance Networks       */}
              {/* ──────────────────────────────────── */}
              <section id="ssn" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Space Surveillance Networks
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <div className="card p-6 my-8 border-l-4 border-l-cyan-400">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                      <div>
                        <div className="text-3xl font-display font-bold text-cyan-400">48,000+</div>
                        <div className="text-star-300 text-sm mt-1">Tracked Objects (U.S. Catalog)</div>
                      </div>
                      <div>
                        <div className="text-3xl font-display font-bold text-cyan-400">30+</div>
                        <div className="text-star-300 text-sm mt-1">SSN Sensor Sites</div>
                      </div>
                      <div>
                        <div className="text-3xl font-display font-bold text-cyan-400">400K+</div>
                        <div className="text-star-300 text-sm mt-1">Daily Observations</div>
                      </div>
                    </div>
                  </div>

                  <p>
                    The <strong className="text-white">U.S. Space Surveillance Network (SSN)</strong>{' '}
                    is the world&apos;s most comprehensive satellite tracking system. Operated by the
                    U.S. Space Force&apos;s 18th Space Defense Squadron at Vandenberg Space Force
                    Base, the SSN consists of over 30 radar and optical sensor sites distributed
                    around the globe. The SSN tracks approximately 48,000 objects larger than 10 cm
                    in LEO and 1 meter in GEO, performing over 400,000 observations per day.
                  </p>
                  <p>
                    The SSN&apos;s catalog data is published through <strong className="text-white">
                    Space-Track.org</strong>, operated by the 18th Space Defense Squadron. Registered
                    users can access Two-Line Element sets (TLEs), conjunction data messages (CDMs),
                    and other orbital data. This publicly shared data forms the backbone of most
                    civilian and commercial satellite tracking worldwide.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Other Government Networks
                  </h3>
                  <p>
                    Russia operates its own space surveillance system, the <strong className="text-white">
                    Space Surveillance System (SSS)</strong>, though it shares limited data publicly.
                    The <strong className="text-white">European Space Surveillance and Tracking
                    (EU SST)</strong> program, established in 2014 and expanded through the EU Space
                    Programme, coordinates sensor assets across EU member states including radar
                    systems in Spain and France and optical telescopes in the Canary Islands and
                    elsewhere. Japan&apos;s JAXA operates the Kamisaibara Space Guard Center with
                    radar and optical sensors, and Australia contributes tracking capabilities through
                    facilities at Pine Gap and a growing network of optical sensors.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 6. TLE Data Explained                */}
              {/* ──────────────────────────────────── */}
              <section id="tle-data" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  TLE Data Explained
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The <strong className="text-white">Two-Line Element set (TLE)</strong> is the
                    standard data format for distributing satellite orbital parameters. Developed by
                    NORAD in the 1960s and still in widespread use, a TLE encodes the essential
                    orbital elements and related parameters in two lines of 69 characters each,
                    preceded by a title line.
                  </p>

                  <div className="card p-6 my-8 bg-slate-800/50 font-mono text-sm overflow-x-auto">
                    <div className="text-star-300 text-xs mb-2 font-sans">Example TLE (ISS):</div>
                    <pre className="text-cyan-300 whitespace-pre">
{`ISS (ZARYA)
1 25544U 98067A   26038.51234567  .00016717  00000-0  10270-3 0  9993
2 25544  51.6416 247.4627 0006703 130.5360 229.6100 15.50000000123456`}
                    </pre>
                  </div>

                  <p>
                    Each field in a TLE carries specific information. Line 1 includes the satellite
                    catalog number (25544 for the ISS), the international designator (98067A,
                    meaning the 67th launch of 1998, object A), the epoch (the date and time to
                    which the orbital elements are referenced), the first and second derivatives of
                    mean motion (related to drag), and the BSTAR drag coefficient. Line 2 contains
                    the orbital elements themselves: inclination, RAAN, eccentricity, argument of
                    perigee, mean anomaly, and mean motion (revolutions per day).
                  </p>
                  <p>
                    TLEs are designed to be used with the <strong className="text-white">SGP4/SDP4
                    propagator</strong>, a mathematical model that predicts a satellite&apos;s future
                    position based on its TLE. The SGP4 model accounts for Earth&apos;s oblateness
                    (J2 perturbation), atmospheric drag, and solar/lunar effects in a simplified but
                    computationally efficient manner. Using a TLE with a different propagator will
                    produce incorrect results, as the TLE elements are not true Keplerian elements
                    but rather &quot;mean&quot; elements that absorb certain perturbation effects.
                  </p>
                  <p>
                    TLE accuracy degrades over time as perturbations cause the actual orbit to
                    diverge from the prediction. For LEO objects, a TLE is typically accurate to
                    within a few kilometers for the first day after epoch, degrading to tens of
                    kilometers within a week. GEO TLEs tend to maintain better accuracy over longer
                    periods due to the absence of atmospheric drag. TLEs are updated regularly --
                    typically every few days for most cataloged objects, and more frequently for
                    objects of high interest.
                  </p>

                  <p className="mt-4">
                    <Link href="/satellites" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      View live TLE data and satellite positions on SpaceNexus
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 7. Orbit Prediction & Propagation    */}
              {/* ──────────────────────────────────── */}
              <section id="prediction" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Orbit Prediction &amp; Propagation
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    Orbit propagation is the process of predicting a satellite&apos;s future position
                    based on its current orbital state and a mathematical model of the forces acting
                    on it. The choice of propagator depends on the accuracy required and the
                    computational resources available.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    SGP4/SDP4 (Simplified General Perturbations)
                  </h3>
                  <p>
                    SGP4 (for near-Earth objects, period &lt; 225 minutes) and SDP4 (for deep-space
                    objects) are the standard propagators used with TLE data. Developed by the U.S.
                    Air Force in the 1960s and refined through the 1980s, SGP4 remains the most
                    widely used propagator in the world due to its computational efficiency and the
                    ubiquity of TLE data. However, its accuracy is limited -- typically to a few
                    kilometers after one day of propagation for LEO objects.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    High-Fidelity Numerical Propagators
                  </h3>
                  <p>
                    For applications requiring greater accuracy -- such as mission planning,
                    conjunction assessment, and precise orbit determination -- high-fidelity numerical
                    propagators are used. These integrate the equations of motion step by step,
                    incorporating detailed force models including high-order gravity field harmonics
                    (up to 70x70 or higher), atmospheric density models (NRLMSISE-00, JB2008),
                    solar radiation pressure with shadow modeling, third-body perturbations from the
                    Moon and planets, and solid Earth and ocean tides. Software packages like AGI&apos;s
                    STK, GMAT (NASA&apos;s open-source General Mission Analysis Tool), and Orekit
                    (open-source Java library) provide high-fidelity propagation capabilities.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Atmospheric Drag: The Biggest Uncertainty
                  </h3>
                  <p>
                    For satellites in LEO below approximately 800 km, atmospheric drag is the
                    dominant source of orbit prediction uncertainty. The Earth&apos;s upper
                    atmosphere (thermosphere) is highly variable, with density changing by factors of
                    ten or more depending on solar activity, geomagnetic storms, and time of day.
                    During major solar storms, atmospheric density can increase dramatically,
                    causing unexpected orbital decay. This is precisely what happened with the loss
                    of 38 Starlink satellites in February 2022, when a geomagnetic storm increased
                    atmospheric drag to levels that prevented the newly launched satellites from
                    reaching their operational orbit.
                  </p>

                  <p className="mt-4">
                    <Link href="/space-environment" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Monitor space weather and its effects on orbits with SpaceNexus
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 8. Conjunction Assessment            */}
              {/* ──────────────────────────────────── */}
              <section id="conjunction" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Conjunction Assessment &amp; Collision Avoidance
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    Conjunction assessment (CA) is the process of identifying close approaches
                    between objects in orbit and evaluating the risk of collision. With over 48,000
                    tracked objects and billions of potential pairings, this is a computationally
                    intensive screening process performed continuously by the 18th Space Defense
                    Squadron.
                  </p>
                  <p>
                    When two objects are predicted to pass within a defined screening volume
                    (typically a few kilometers), a <strong className="text-white">Conjunction Data
                    Message (CDM)</strong> is generated and shared with the affected satellite
                    operator. The CDM contains the predicted time of closest approach (TCA), the
                    miss distance, the relative velocity, and the covariance matrices (uncertainty
                    ellipsoids) for both objects. From this data, a <strong className="text-white">
                    probability of collision (Pc)</strong> can be calculated.
                  </p>
                  <p>
                    When the probability of collision exceeds a defined threshold -- typically 1 in
                    10,000 (10<sup>-4</sup>) for high-value assets like the ISS -- the satellite
                    operator may perform a collision avoidance maneuver (CAM), adjusting the
                    satellite&apos;s orbit to increase the miss distance. NASA&apos;s Conjunction
                    Assessment team at the Goddard Space Flight Center supports conjunction
                    assessment for NASA missions, including the ISS, which performs several
                    collision avoidance maneuvers per year.
                  </p>
                  <p>
                    SpaceX has implemented an autonomous collision avoidance system for Starlink,
                    which processes CDMs and executes avoidance maneuvers without human intervention.
                    The company reports performing thousands of maneuvers annually. As the number
                    of satellites grows, the frequency and complexity of conjunction events increases
                    non-linearly, making automated collision avoidance systems increasingly essential.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 9. Commercial Tracking Services      */}
              {/* ──────────────────────────────────── */}
              <section id="commercial-tracking" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Commercial Tracking Services
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    While government tracking networks provide the foundation, a growing commercial
                    SSA industry has emerged to fill capability gaps and provide differentiated
                    services to satellite operators, insurers, and government customers.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    LeoLabs
                  </h3>
                  <p>
                    LeoLabs operates a global network of phased-array radars optimized for tracking
                    objects in LEO. With radar sites in New Zealand, Texas, Costa Rica, Australia,
                    and the Azores, LeoLabs provides commercial tracking services including a
                    maintained LEO catalog, conjunction screening, and analytics. The company claims
                    to track objects as small as 2 centimeters in certain orbital regimes and provides
                    position accuracy of approximately 10-20 meters.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    ExoAnalytic Solutions
                  </h3>
                  <p>
                    ExoAnalytic operates the world&apos;s largest commercial network of optical
                    telescopes, with over 300 sensors at sites globally. The company specializes in
                    tracking objects in GEO and cislunar space, providing characterization data
                    (identifying what an object is, not just where it is) and anomaly detection
                    for satellite operators and government customers.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Other Commercial Providers
                  </h3>
                  <p>
                    Numerica Corporation provides a commercial space catalog and collision avoidance
                    services using a combination of owned and partner telescopes. Privateer, co-founded
                    by Apple co-founder Steve Wozniak, is building a space mapping and data platform.
                    COMSPOC (Commercial Space Operations Center) provides independent conjunction
                    screening and space safety services. Slingshot Aerospace offers a space
                    situational awareness platform used by the U.S. Space Force.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 10. Modern Challenges                */}
              {/* ──────────────────────────────────── */}
              <section id="challenges" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Modern Challenges in Satellite Tracking
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <h3 className="text-xl font-semibold text-white mt-4 mb-3">
                    Mega-Constellation Growth
                  </h3>
                  <p>
                    The sheer number of satellites being deployed presents an unprecedented tracking
                    challenge. The U.S. catalog has grown from approximately 20,000 objects in 2019
                    to over 48,000 in 2026, driven largely by Starlink deployments. With Kuiper,
                    Guowang, and other mega-constellations in deployment or planning, the catalog
                    could exceed 100,000 objects within the next decade. Each new object increases
                    the number of potential conjunctions quadratically, straining existing screening
                    capabilities.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Small Debris
                  </h3>
                  <p>
                    Current ground-based tracking systems can reliably detect objects down to
                    approximately 10 cm in LEO and 1 meter in GEO. However, NASA models estimate
                    there are over 100 million pieces of debris larger than 1 mm in orbit, and
                    approximately 500,000 pieces between 1 cm and 10 cm -- large enough to cause
                    catastrophic damage but too small to be tracked and avoided. This &quot;lethal
                    non-trackable&quot; population represents the most dangerous threat to
                    operational spacecraft.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Cislunar and Deep Space Tracking
                  </h3>
                  <p>
                    As activity extends beyond Earth orbit -- to cislunar space (between Earth and
                    the Moon), lunar orbit, and beyond -- existing tracking infrastructure is
                    inadequate. The SSN is optimized for Earth-orbital tracking and has limited
                    capability to monitor objects in cislunar space. New sensor architectures,
                    including space-based telescopes and deep-space radar, will be needed to maintain
                    situational awareness as human and robotic activity in the cislunar domain
                    increases.
                  </p>

                  <p className="mt-4">
                    <Link href="/space-environment" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Track debris and space environment data on SpaceNexus
                    </Link>
                    {' '}&middot;{' '}
                    <Link href="/cislunar" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Explore cislunar activity tracking
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 11. Space Traffic Management         */}
              {/* ──────────────────────────────────── */}
              <section id="stm" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Space Traffic Management
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The rapid growth in orbital populations has prompted efforts to establish formal
                    space traffic management (STM) frameworks -- analogous to air traffic management
                    for aviation. In the United States, Space Policy Directive-3 (SPD-3), issued in
                    2018, directed the transition of civilian space traffic management responsibilities
                    from the Department of Defense to the Department of Commerce. This transition
                    has been slow, with the Office of Space Commerce (OSC) developing the Traffic
                    Coordination System for Space (TraCSS) to provide basic conjunction screening
                    and notification services to satellite operators.
                  </p>
                  <p>
                    Internationally, the United Nations Committee on the Peaceful Uses of Outer
                    Space (COPUOS) has published long-term sustainability guidelines that encourage
                    space debris mitigation and best practices for SSA data sharing. However, there
                    is no binding international treaty governing space traffic management, and
                    coordination between spacefaring nations remains largely voluntary and ad hoc.
                  </p>
                  <p>
                    The space insurance industry is increasingly factoring collision risk and space
                    sustainability into underwriting decisions. Satellite operators that can
                    demonstrate robust collision avoidance capabilities and compliance with debris
                    mitigation guidelines may benefit from favorable insurance terms.
                  </p>

                  <p className="mt-4">
                    <Link href="/compliance" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Track space regulations and compliance requirements on SpaceNexus
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 12. Tools & Platforms                 */}
              {/* ──────────────────────────────────── */}
              <section id="tools" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Satellite Tracking Tools &amp; Platforms
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    A range of tools and platforms are available for satellite tracking, from free
                    public resources to sophisticated commercial systems.
                  </p>

                  <div className="card p-6 my-8">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                      Key Satellite Tracking Resources
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="border-b border-cyan-400/10 pb-2">
                        <span className="text-white font-medium">Space-Track.org</span>
                        <span className="text-star-300"> -- Official U.S. Space Force catalog data (TLEs, CDMs). Free registration required.</span>
                      </div>
                      <div className="border-b border-cyan-400/10 pb-2">
                        <span className="text-white font-medium">CelesTrak</span>
                        <span className="text-star-300"> -- Curated TLE data and supplemental orbital data, maintained by Dr. T.S. Kelso. Free.</span>
                      </div>
                      <div className="border-b border-cyan-400/10 pb-2">
                        <span className="text-white font-medium">N2YO.com</span>
                        <span className="text-star-300"> -- Free web-based satellite tracking with 3D visualization.</span>
                      </div>
                      <div className="border-b border-cyan-400/10 pb-2">
                        <span className="text-white font-medium">Heavens-Above</span>
                        <span className="text-star-300"> -- Visual observation predictions (ISS passes, satellite flybys).</span>
                      </div>
                      <div className="border-b border-cyan-400/10 pb-2">
                        <span className="text-white font-medium">AGI STK (Systems Tool Kit)</span>
                        <span className="text-star-300"> -- Professional-grade astrodynamics and mission analysis software.</span>
                      </div>
                      <div>
                        <span className="text-white font-medium">SpaceNexus</span>
                        <span className="text-star-300"> -- Integrated space operations platform with satellite tracking, constellation monitoring, and orbital management.</span>
                      </div>
                    </div>
                  </div>

                  <p>
                    For developers and researchers, several open-source libraries provide satellite
                    tracking capabilities. <strong className="text-white">Orekit</strong> (Java) is a
                    comprehensive space dynamics library used by ESA and commercial operators.{' '}
                    <strong className="text-white">Skyfield</strong> (Python) provides high-accuracy
                    astronomical calculations including satellite position prediction.{' '}
                    <strong className="text-white">satellite.js</strong> is a JavaScript
                    implementation of the SGP4 propagator used in web-based tracking applications.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 13. SpaceNexus CTA                   */}
              {/* ──────────────────────────────────── */}
              <section id="spacenexus" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Track Satellites on SpaceNexus
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    SpaceNexus provides an integrated satellite tracking and space operations
                    platform that brings together orbital data, constellation monitoring, ground
                    station mapping, and space environment awareness in a single interface.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  {[
                    { name: 'Satellite Tracker', href: '/satellites', desc: 'Real-time satellite positions and orbital data' },
                    { name: 'Constellation Tracker', href: '/constellations', desc: 'Monitor mega-constellations and coverage' },
                    { name: 'Space Environment', href: '/space-environment', desc: 'Debris tracking, space weather, and ops awareness' },
                    { name: 'Ground Station Map', href: '/ground-stations', desc: 'Global ground station network visualization' },
                  ].map((mod) => (
                    <Link
                      key={mod.href}
                      href={mod.href}
                      className="card-interactive p-4 block"
                    >
                      <div className="font-semibold text-white text-sm">{mod.name}</div>
                      <div className="text-star-300 text-xs mt-1">{mod.desc}</div>
                    </Link>
                  ))}
                </div>

                <div className="mt-8 text-center">
                  <Link href="/register" className="btn-primary">
                    Get Started Free
                  </Link>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* FAQ                                  */}
              {/* ──────────────────────────────────── */}
              <section className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-3">
                  {FAQ_ITEMS.map((item, i) => (
                    <details key={i} className="card group">
                      <summary className="cursor-pointer p-5 flex items-center justify-between text-white font-medium select-none list-none [&::-webkit-details-marker]:hidden">
                        <span>{item.q}</span>
                        <span
                          aria-hidden="true"
                          className="ml-4 shrink-0 text-cyan-400 transition-transform group-open:rotate-45 text-xl leading-none"
                        >
                          +
                        </span>
                      </summary>
                      <div className="px-5 pb-5 text-star-200 leading-relaxed">
                        {item.a}
                      </div>
                    </details>
                  ))}
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* Newsletter CTA                       */}
              {/* ──────────────────────────────────── */}
              <section className="card p-8 md:p-12 text-center glow-border">
                <h2 className="text-display-sm font-display font-bold text-white mb-4">
                  Monitor the Space Domain
                </h2>
                <p className="text-star-200 text-lg mb-8 max-w-2xl mx-auto">
                  Track satellites, constellations, and space environment conditions in real time.
                  SpaceNexus gives you the operational awareness tools used by space professionals.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/register" className="btn-primary">
                    Create Free Account
                  </Link>
                  <Link href="/satellites" className="btn-secondary">
                    Explore Satellite Tracker
                  </Link>
                </div>
              </section>
            </article>
          </div>
        </div>
      </div>
    </>
  );
}
