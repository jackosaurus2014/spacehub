import Link from 'next/link';
import { rocketSlugForName } from '@/lib/rocket-registry';
import { LAUNCH_SITES, siteSlugForLocation } from '@/lib/launch-site-registry';

// "What's next" rail for every launch surface (roadmap Tier 2 #12). Only the
// game averaged 5+ views per user; every other page was a dead end. Server-
// safe; renders only the links that apply.
export default function LaunchCrossLinks({ rocket, location, eventId, upcoming, hide = [], debriefSlug = null }: { debriefSlug?: string | null; rocket?: string | null; location?: string | null; eventId?: string; upcoming?: boolean; hide?: string[] }) {
  const rocketSlug = rocketSlugForName(rocket);
  const siteSlug = siteSlugForLocation(location);
  const site = siteSlug ? LAUNCH_SITES.find((s) => s.slug === siteSlug) : null;
  const items: Array<{ key: string; href: string; icon: string; label: string; hint: string }> = [];
  if (upcoming) items.push({ key: 'predict', href: '/predictions', icon: '🎯', label: 'Call it', hint: 'Will it fly this window? No account needed' });
  if (rocketSlug) items.push({ key: 'rocket', href: `/rockets/${rocketSlug}`, icon: '🚀', label: rocket!.split(' Block')[0], hint: 'Cost, record, every flight' });
  if (site) items.push({ key: 'site', href: `/launches/${site.slug}`, icon: '📍', label: site.shortName, hint: 'This month and next, from this pad' });
  if (site?.viewingGuide) items.push({ key: 'watch', href: site.viewingGuide, icon: '🎟️', label: 'Watch in person', hint: `Best spots at ${site.shortName}` });
  items.push({ key: 'track', href: '/satellites', icon: '🛰️', label: 'Track it after liftoff', hint: 'Live orbital map' });
  // Deep-link a flown launch to its own debrief (SYNTHESIS.md item 42), else the index.
  if (debriefSlug) items.push({ key: 'debriefs', href: `/mission-debriefs/${debriefSlug}`, icon: '📝', label: 'Read the mission debrief', hint: 'What happened after the stream' });
  else if (eventId) items.push({ key: 'debriefs', href: '/mission-debriefs', icon: '📝', label: 'Mission debriefs', hint: 'What happened after the stream' });
  items.push({ key: 'mc', href: '/mission-control', icon: '🖥️', label: 'Mission Control', hint: 'Every upcoming launch' });
  const shown = items.filter((i) => !hide.includes(i.key)).slice(0, 6);
  if (shown.length === 0) return null;
  return (
    <nav aria-label="Related launch pages" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {shown.map((i) => (
        <Link key={i.key} href={i.href} className="card p-3 flex items-center gap-2.5 hover:border-cyan-500/30 transition-colors group">
          <span className="text-lg flex-shrink-0" aria-hidden="true">{i.icon}</span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">{i.label}</span>
            <span className="block text-[10px] text-slate-500 truncate">{i.hint}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}
