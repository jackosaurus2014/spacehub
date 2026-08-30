import Link from 'next/link';
import Image from 'next/image';
import Countdown from '@/components/ui/Countdown';
import Telemetry from '@/components/ui/Telemetry';
import StatusPip from '@/components/ui/StatusPip';
import { missionOf, type NextLaunch } from '@/lib/next-launch';

// The hero IS the next launch (Mission Control, SYNTHESIS.md item 15).
// Mission name as the headline, GO pip, the clock, four telemetry fields —
// including "Slipped", the one dataset nobody else records — and two
// actions. Region art behind, scrim in front, nothing else in this space.
function pipState(status: string): 'go' | 'hold' | 'tminus' {
  if (status === 'go') return 'go';
  if (status === 'tbd' || status === 'tbc') return 'hold';
  return 'tminus';
}

export default function NextLaunchHero({ next, slips }: { next: NextLaunch | null; slips: number | null }) {
  const rocket = next?.rocket ? next.rocket.replace(/ Block 5$/, '') : null;
  const site = next?.location ?? null;
  const when = next ? new Date(next.launchDate) : null;
  const whenText = when ? when.toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' }) : null;

  return (
    <header className="relative min-h-[520px] flex items-end border-b border-[var(--line)] overflow-hidden" aria-labelledby="hero-mission">
      <Image src="/game/region-inner_system.webp" alt="" fill priority sizes="100vw" className="object-cover object-[70%_30%] opacity-70" />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,#0B0A09_6%,rgba(11,10,9,.88)_34%,rgba(11,10,9,.35)_72%,rgba(11,10,9,.55)_100%)]" aria-hidden="true" />
      <div className="relative w-full container mx-auto px-4 pt-16 md:pt-20 pb-8">
        {next ? (
          <>
            <div className="mb-4"><StatusPip state={pipState(next.status)} /></div>
            <h1 id="hero-mission" className="text-display font-bold text-[var(--ink)] leading-[1.05] tracking-[-0.02em] text-[clamp(2rem,3.6vw,3.1rem)] max-w-[17ch] mb-2">
              <span className="block text-[0.44em] font-medium text-[var(--ink-2)] tracking-[-0.01em] mb-1.5">{rocket ?? 'Launch'}{site ? ` · ${site.split(',')[0]}` : ''}</span>
              {missionOf(next.name)}
            </h1>
            <p className="text-[15px] text-[var(--ink-2)] mb-6">{whenText ? <><b className="text-[var(--ink)] font-medium">{whenText}</b>{site ? ` from ${site}` : ''}.</> : null}</p>
            <div className="flex flex-wrap items-end gap-x-10 gap-y-5 mb-6">
              <Countdown to={next.launchDate} size="clock" />
              <div className="flex flex-wrap gap-x-8 gap-y-3 pb-1">
                <Telemetry label="Vehicle" value={rocket ?? '—'} />
                <Telemetry label="Provider" value={next.agency ?? '—'} />
                <Telemetry label="Status" value={next.status.toUpperCase()} tone="signal" />
                <Telemetry label="Slipped" value={slips == null ? '—' : slips === 0 ? 'Never' : `${slips}×`} sub={slips == null ? 'slip history unavailable' : 'since first listed · our own data'} tone={slips && slips > 0 ? 'ember' : 'ink'} />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Link href={`/launch/${next.id}`} className="btn-primary text-[14.5px] py-3 px-5">Watch live &rarr;</Link>
              <Link href={`/launch/${next.id}#alerts`} className="btn-secondary text-[14.5px] py-3 px-5">Remind me at T&minus;1h</Link>
              <span className="text-[12.5px] text-[var(--ink-3)]">No account needed. One email at T&minus;24h, one at T&minus;1h, one if it scrubs.</span>
            </div>
          </>
        ) : (
          <>
            <h1 id="hero-mission" className="text-display font-bold text-[var(--ink)] text-[clamp(2rem,3.6vw,3.1rem)] mb-2">Every launch. Live, tracked, explained.</h1>
            <p className="text-[15px] text-[var(--ink-2)] mb-6">The launch board is refreshing. Mission Control has every upcoming mission with countdowns, streams and outcomes.</p>
            <Link href="/mission-control" className="btn-primary text-[14.5px] py-3 px-5">Open Mission Control &rarr;</Link>
          </>
        )}
      </div>
    </header>
  );
}
