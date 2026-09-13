import type { Metadata } from 'next';
import Link from 'next/link';
import PadView from '@/components/launch/PadView';
import { getPadView } from '@/lib/launch-pad-data';
import { PAD_CHANNELS, padViewIsLive } from '@/lib/launch-pad-view';

// Live stream state changes by the minute; never prerender this.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Page metadata beats the /live layout's (project rule: page wins, and the
// suffix is never doubled).
export const metadata: Metadata = {
  // No brand suffix: the root layout's title template appends it, and a
  // doubled suffix is a standing bug in this repo (metadata-precedence-guard).
  title: 'Pad View — the launch pads, around the clock',
  description:
    'A continuous view of the world’s busiest launch pads: whichever pad camera is on air right now, the next launch from that site, and the most recent replay when nothing is live.',
  alternates: { canonical: 'https://spacenexus.us/live/pad' },
  openGraph: {
    title: 'Pad View — the launch pads, around the clock',
    description:
      'Whichever pad camera is on air right now, the next launch from that site, and the most recent replay when nothing is live.',
    url: 'https://spacenexus.us/live/pad',
    siteName: 'SpaceNexus',
    images: [
      {
        url: '/api/og?title=' + encodeURIComponent('Pad View') + '&subtitle=' + encodeURIComponent('The launch pads, around the clock') + '&type=data',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Pad View',
      },
    ],
  },
  twitter: { card: 'summary_large_image', title: 'Pad View — the launch pads, around the clock' },
};

export default async function PadPage() {
  const view = await getPadView();
  const live = padViewIsLive(view);

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6">
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-5">
        <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/live" className="hover:text-slate-300 transition-colors">Live</Link>
        <span aria-hidden="true">/</span>
        <span className="text-slate-400">Pad view</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold text-white leading-[1.05] tracking-[-0.02em]">
          Pad view
        </h1>
        <p className="mt-2 text-slate-400 text-sm max-w-2xl">
          One tab, always pointed at a launch pad. We pick whichever continuous pad camera is on
          air; when none is, we say so and show you the next launch and the last replay instead.
        </p>
      </header>

      <PadView view={view} />

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
          The cameras we watch
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {PAD_CHANNELS.map((channel) => (
            <li key={channel.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">{channel.name}</h3>
                {live && view.channel?.id === channel.id && (
                  <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">on air</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{channel.site}</p>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{channel.what}</p>
              <a
                href={channel.watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
              >
                Open on YouTube &rarr;
              </a>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-xs text-slate-500">
        Looking for a specific mission?{' '}
        <Link href="/mission-control" className="text-cyan-400 hover:text-cyan-300">
          The launch schedule
        </Link>{' '}
        lists everything coming up, and each launch gets its own live page an hour before liftoff.
      </p>
    </div>
  );
}
