import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import DirectoryBrowser from '@/components/directory/DirectoryBrowser';
import { SITE_DIRECTORY } from '@/lib/site-directory';

// /tools is the site directory: every live page, grouped and searchable.
// The navigation shows only each group's most-used rows and links here for
// the rest — so the menus stay short without any page going away.
// (Before 2026-08-28 this page listed seven calculators; those now sit in
// the "Engineering & Operations" group below.)

const total = SITE_DIRECTORY.reduce((n, g) => n + g.entries.length, 0);

export const metadata: Metadata = {
  title: `Every SpaceNexus Tool and Page (${total}) — Directory`,
  description: 'The complete directory of SpaceNexus: launch trackers and rocket pages, news and analysis, market data, business and compliance tools, courses, engineering calculators, and reference data — searchable.',
  alternates: { canonical: 'https://spacenexus.us/tools' },
  openGraph: { title: 'SpaceNexus Directory', description: `All ${total} tools and pages, grouped and searchable.`, type: 'website' },
};

export default function ToolsDirectoryPage() {
  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <header className="pt-10 mb-6 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Everything on SpaceNexus</h1>
          <p className="text-lg text-white/70 leading-relaxed">
            {total} pages, tools and trackers. The menus show the most-used handful; this is all of it.
          </p>
        </header>
        <DirectoryBrowser groups={SITE_DIRECTORY} />
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Directory' }]} />
      </div>
    </div>
  );
}
