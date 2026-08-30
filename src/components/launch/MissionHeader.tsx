import Link from 'next/link';
import Countdown from '@/components/ui/Countdown';
import Telemetry from '@/components/ui/Telemetry';
import StatusPip from '@/components/ui/StatusPip';
import Console from '@/components/ui/Console';
import { missionOf } from '@/lib/next-launch';

// Server-rendered mission header for /launch/[eventId] (SYNTHESIS.md item 16):
// one URL, three states — T− / LIVE / FLEW·SCRUB — so a wrong status field
// is impossible to hide, and crawlers get the headline, the clock and the
// slip history in HTML before the client dashboard hydrates.
export interface SlipRow { fromDate: Date; toDate: Date; observedAt: Date }
export interface MissionHeaderProps {
  event: { id: string; name: string; status: string; launchDate: Date | null; rocket: string | null; agency: string | null; location: string | null; isLive: boolean };
  slips: SlipRow[];
  debriefSlug: string | null;
  now?: Date;
}

export function missionState(status: string, launchDate: Date | null, isLive: boolean, now: Date): 'tminus' | 'go' | 'hold' | 'live' | 'flew' | 'scrub' {
  if (status === 'completed') return 'flew';
  if (status === 'failed' || status === 'failure') return 'scrub';
  if (status === 'scrubbed') return 'scrub';
  if (isLive || (launchDate && Math.abs(launchDate.getTime() - now.getTime()) < 30 * 60000 && launchDate.getTime() <= now.getTime())) return 'live';
  if (status === 'go') return 'go';
  if (status === 'tbd' || status === 'tbc') return 'hold';
  return 'tminus';
}

const fmt = (d: Date) => d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' });

export default function MissionHeader({ event, slips, debriefSlug, now = new Date() }: MissionHeaderProps) {
  const state = missionState(event.status, event.launchDate, event.isLive, now);
  const upcoming = state === 'tminus' || state === 'go' || state === 'hold';
  const rocket = event.rocket?.replace(/ Block 5$/, '') ?? null;
  const netSlip = slips.length > 0 ? Math.round((slips[slips.length - 1].toDate.getTime() - slips[0].fromDate.getTime()) / 86400000) : 0;
  const stateLabel = state === 'flew' ? 'Launched' : state === 'scrub' ? (event.status === 'scrubbed' ? 'Scrubbed' : 'Failed') : state === 'live' ? 'Live now' : state === 'go' ? 'GO for launch' : state === 'hold' ? 'Date to be confirmed' : 'Scheduled';

  return (
    <div className="max-w-[1400px] mx-auto px-4 mb-6">
      <div className="mb-3"><StatusPip state={state} label={stateLabel} /></div>
      <h1 className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold text-[var(--ink)] leading-[1.05] tracking-[-0.02em] max-w-[24ch]">
        <span className="block text-[0.5em] font-medium text-[var(--ink-2)] mb-1">{rocket ?? 'Launch'}{event.location ? ` · ${event.location.split(',')[0]}` : ''}</span>
        {missionOf(event.name)}
      </h1>
      <div className="flex flex-wrap items-end gap-x-10 gap-y-4 mt-5">
        {upcoming && event.launchDate && <Countdown to={event.launchDate.toISOString()} size="lg" />}
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Telemetry label={upcoming ? 'Window opens' : 'Launched'} value={event.launchDate ? fmt(event.launchDate) : 'TBD'} />
          <Telemetry label="Provider" value={event.agency ?? '—'} />
          <Telemetry label="Slipped" value={slips.length === 0 ? 'Never' : `${slips.length}×`} sub={slips.length === 0 ? 'since first listed · our own data' : `net ${netSlip >= 0 ? '+' : ''}${netSlip} days · our own data`} tone={slips.length > 0 ? 'ember' : 'ink'} />
        </div>
      </div>
      {state === 'flew' && debriefSlug && (
        <p className="mt-4 text-[14px] text-[var(--ink-2)]">This mission flew. <Link href={`/mission-debriefs/${debriefSlug}`} className="text-[var(--ember)] hover:underline">Read the mission debrief &rarr;</Link></p>
      )}
      {slips.length > 0 && (
        <div className="mt-6 max-w-2xl">
          <Console title="Slip history" source="SpaceNexus slip history" status="verified" asOf={slips[slips.length - 1].observedAt}>
            <ol className="space-y-1.5">
              {slips.slice(-8).map((s, i) => (
                <li key={i} className="flex flex-wrap gap-x-3 text-[13px] text-[var(--ink-2)]">
                  <span className="font-mono text-[var(--ink-3)] tabular-nums">{s.observedAt.toISOString().slice(0, 10)}</span>
                  <span>{fmt(s.fromDate)} <span className="text-[var(--ink-3)]">&rarr;</span> {fmt(s.toDate)}</span>
                </li>
              ))}
            </ol>
            <p className="text-[12px] text-[var(--ink-3)] mt-3">Every manifest change of more than a minute is recorded. Nobody else publishes this.</p>
          </Console>
        </div>
      )}
    </div>
  );
}
