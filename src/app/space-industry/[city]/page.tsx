import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCity, SPACE_CITIES } from '@/lib/city-data';
import FAQSchema from '@/components/seo/FAQSchema';

export const revalidate = 86400;

interface Props {
  params: { city: string };
}

export async function generateStaticParams() {
  return SPACE_CITIES.map((city) => ({ city: city.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = getCity(params.city);
  if (!city) return { title: 'City Not Found' };

  return {
    title: `${city.title} | SpaceNexus`,
    description: city.description,
    keywords: [
      `space industry ${city.name.toLowerCase()}`,
      `aerospace companies ${city.name.toLowerCase()}`,
      `space jobs ${city.name.toLowerCase()}`,
      `${city.name.toLowerCase()} space companies`,
      'space industry jobs',
      'aerospace careers',
    ],
    openGraph: {
      title: city.title,
      description: city.description,
      type: 'article',
      url: `https://spacenexus.us/space-industry/${city.slug}`,
    },
    alternates: {
      canonical: `https://spacenexus.us/space-industry/${city.slug}`,
    },
  };
}

export default function CityPage({ params }: Props) {
  const city = getCity(params.city);
  if (!city) notFound();

  const faqItems = [
    {
      question: `How many space companies are in ${city.name}?`,
      answer: `${city.name} has ${city.stats[0].value} space and aerospace companies, ranging from major defense primes to innovative startups.`,
    },
    {
      question: `What is the average space industry salary in ${city.name}?`,
      answer: `The average aerospace salary in ${city.name} is approximately ${city.jobMarket.avgSalary}. Top roles include ${city.jobMarket.topRoles.slice(0, 3).join(', ')}.`,
    },
    {
      question: `What are the major space facilities in ${city.name}?`,
      answer: `Key facilities include ${city.keyFacilities.slice(0, 3).map((f) => f.name).join(', ')}. ${city.name} is a major hub for ${city.keyFacilities[0].type.toLowerCase() === 'government' ? 'government space programs' : 'commercial space operations'}.`,
    },
    {
      question: `What types of space jobs are available in ${city.name}?`,
      answer: `There are currently ${city.jobMarket.openPositions} open positions in the ${city.name} area. Top roles include ${city.jobMarket.topRoles.join(', ')}.`,
    },
    {
      question: `Why is ${city.name} important for the space industry?`,
      answer: city.whyThisCity[0] + '. ' + city.whyThisCity[1] + '.',
    },
  ];

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: city.title,
    description: city.description,
    author: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
    publisher: {
      '@type': 'Organization',
      name: 'SpaceNexus',
      url: 'https://spacenexus.us',
      logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/spacenexus-logo.png' },
    },
    datePublished: '2026-02-14T00:00:00Z',
    mainEntityOfPage: `https://spacenexus.us/space-industry/${city.slug}`,
  };

  const otherCities = SPACE_CITIES.filter((c) => c.slug !== city.slug);

  return (
    <div className="min-h-screen pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <FAQSchema items={faqItems} />

      <div className="container mx-auto px-4 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-8">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/space-talent" className="hover:text-slate-300 transition-colors">Space Industry</Link>
          <span>/</span>
          <span className="text-slate-400">{city.name}</span>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
            Space Industry in {city.name}, {city.state}
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">{city.heroText}</p>
        </header>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {city.stats.map((stat) => (
            <div key={stat.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-nebula-400 mb-1">{stat.value}</div>
              <div className="text-xs text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Key Facilities */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Key Space Facilities</h2>
          <div className="space-y-4">
            {city.keyFacilities.map((facility) => (
              <div key={facility.name} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-white font-semibold">{facility.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">
                    {facility.type}
                  </span>
                </div>
                <p className="text-slate-400 text-sm">{facility.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Major Companies */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Major Space Companies</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left text-slate-400 font-medium py-3 pr-4">Company</th>
                  <th className="text-left text-slate-400 font-medium py-3 pr-4">Focus Area</th>
                  <th className="text-left text-slate-400 font-medium py-3">Profile</th>
                </tr>
              </thead>
              <tbody>
                {city.majorCompanies.map((company) => (
                  <tr key={company.slug} className="border-b border-slate-700/30">
                    <td className="py-3 pr-4 text-white font-medium">{company.name}</td>
                    <td className="py-3 pr-4 text-slate-400">{company.focus}</td>
                    <td className="py-3">
                      <Link
                        href={`/company-profiles/${company.slug}`}
                        className="text-nebula-400 hover:underline text-sm"
                      >
                        View profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-slate-500 text-sm mt-4">
            <Link href="/company-profiles" className="text-nebula-400 hover:underline">
              Browse all 200+ space company profiles
            </Link>
          </p>
        </section>

        {/* Job Market */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Space Industry Job Market</h2>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-sm text-slate-400 mb-1">Average Salary</div>
                <div className="text-2xl font-bold text-white">{city.jobMarket.avgSalary}</div>
              </div>
              <div>
                <div className="text-sm text-slate-400 mb-1">Open Positions</div>
                <div className="text-2xl font-bold text-white">{city.jobMarket.openPositions}</div>
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-400 mb-3">Top Roles</div>
              <div className="flex flex-wrap gap-2">
                {city.jobMarket.topRoles.map((role) => (
                  <span key={role} className="text-xs px-3 py-1.5 rounded-full bg-slate-700/50 text-slate-300">
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-4">
            <Link href="/space-talent" className="text-nebula-400 hover:underline">
              Browse all space industry jobs
            </Link>
          </p>
        </section>

        {/* Why This City */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Why {city.name} for Space?</h2>
          <ul className="space-y-3">
            {city.whyThisCity.map((reason, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-300">
                <span className="text-nebula-400 mt-1 shrink-0">&#10003;</span>
                {reason}
              </li>
            ))}
          </ul>
        </section>

        {/* Nearby Launch Sites */}
        {city.nearbyLaunchSites && city.nearbyLaunchSites.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Nearby Launch Sites</h2>
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
              <ul className="space-y-2">
                {city.nearbyLaunchSites.map((site) => (
                  <li key={site} className="text-slate-300">{site}</li>
                ))}
              </ul>
            </div>
            <p className="text-slate-500 text-sm mt-4">
              <Link href="/spaceports" className="text-nebula-400 hover:underline">
                View all global launch sites
              </Link>
            </p>
          </section>
        )}

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

        {/* CTA */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 text-center mb-12">
          <h3 className="text-lg font-bold text-white mb-2">
            Track the {city.name} space ecosystem with SpaceNexus
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            Company profiles, job listings, government contracts, and real-time industry data.
          </p>
          <Link
            href="/register"
            className="inline-block bg-nebula-500 hover:bg-nebula-600 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            Get Started Free
          </Link>
        </div>

        {/* Other Cities */}
        <section className="border-t border-slate-700/50 pt-8">
          <h3 className="text-lg font-bold text-white mb-4">Explore Other Space Industry Hubs</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {otherCities.map((c) => (
              <Link
                key={c.slug}
                href={`/space-industry/${c.slug}`}
                className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center hover:border-nebula-500/50 transition-colors"
              >
                <div className="text-white text-sm font-medium">{c.name}</div>
                <div className="text-slate-500 text-xs">{c.state}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
