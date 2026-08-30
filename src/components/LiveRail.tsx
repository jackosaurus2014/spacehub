import Link from 'next/link';
import { getNextLaunch, missionOf } from '@/lib/next-launch';
import LiveRailClock from './LiveRailClock';

// One server-rendered line above the nav on every page:
//   ● T−04:12:07 · Falcon 9 · Starlink 12-8 · Cape SLC-40 · Watch →
// The site's headline promise, true in the HTML on all surfaces for the
// first time. Falls back to a static link, never to "—".
export default async function LiveRail() {
  const next = await getNextLaunch();
  const rocket = next?.rocket ? next.rocket.replace(/ Block 5$/, '') : null;
  const site = next?.location ? next.location.split(',')[0] : null;
  return (
    <div className="w-full border-b border-white/[0.06] bg-[#0B0A09] text-[12px] leading-none" role="region" aria-label="Next launch">
      <div className="container mx-auto px-4 h-8 flex items-center gap-2 overflow-hidden whitespace-nowrap">
        <span className="relative flex h-2 w-2 flex-shrink-0" aria-hidden="true">
          <span className={`absolute inline-flex h-full w-full rounded-full ${next ? 'bg-[#56F000] opacity-75 animate-ping motion-reduce:animate-none' : 'bg-slate-600'}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${next ? 'bg-[#56F000]' : 'bg-slate-600'}`} />
        </span>
        {next ? (
          <>
            <LiveRailClock iso={next.launchDate} />
            <span className="text-slate-500" aria-hidden="true">·</span>
            <span className="text-slate-200 font-medium truncate">{rocket ? `${rocket} · ` : ''}{missionOf(next.name)}</span>
            {site && <><span className="text-slate-500 hidden sm:inline" aria-hidden="true">·</span><span className="text-slate-400 hidden sm:inline truncate">{site}</span></>}
            <Link href={`/launch/${next.id}`} className="ml-auto text-[#FF7A18] hover:text-[#FFA35C] font-semibold flex-shrink-0">Watch &rarr;</Link>
          </>
        ) : (
          <>
            <span className="text-slate-300">Every launch, live and tracked.</span>
            <Link href="/mission-control" className="ml-auto text-[#FF7A18] hover:text-[#FFA35C] font-semibold flex-shrink-0">Next launch &rarr;</Link>
          </>
        )}
      </div>
    </div>
  );
}
