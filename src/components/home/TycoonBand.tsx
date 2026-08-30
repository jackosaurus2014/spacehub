import Link from 'next/link';
import Image from 'next/image';
import type { PublicLeaderboardEntry } from '@/lib/game/public-leaderboard';
import { RESEARCH } from '@/lib/game/research-tree';
import { BUILDINGS } from '@/lib/game/buildings';

// The game gets its own region band, its own colour (violet), once.
// Live leaderboard is the proof the economy is running (graft A4, part 1;
// live commodity spot prices follow when a public route exists).
export default function TycoonBand({ topCorps }: { topCorps: PublicLeaderboardEntry[] }) {
  return (
    <div className="relative border-y border-[var(--line)] overflow-hidden">
      <Image src="/game/region-asteroid_belt.webp" alt="" fill sizes="100vw" className="object-cover opacity-35" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(11,10,9,.92),rgba(11,10,9,.75)_60%,rgba(11,10,9,.6))]" aria-hidden="true" />
      <div className="relative container mx-auto px-4 py-12 md:py-14 flex flex-wrap items-center justify-between gap-8">
        <div className="max-w-[52ch]">
          <p className="text-[11px] uppercase tracking-[0.14em] font-medium text-[var(--violet)]">Free browser MMO · Epoch 2 · no combat</p>
          <h2 className="text-[28px] md:text-[30px] font-bold text-[var(--ink)] mt-2 mb-2">Space Tycoon</h2>
          <p className="text-[15px] text-[var(--ink-2)]">An economic space MMO. Build launch capacity, mine the belt, manufacture hardware, sign binding contracts with rival corporations — and out-trade them across eight regions from LEO to interstellar.</p>
          <div className="flex flex-wrap gap-6 mt-4">
            {[[`${RESEARCH.length}`, 'Technologies'], [`${BUILDINGS.length}`, 'Buildings'], ['8', 'Regions'], ['No P2W', 'Ever']].map(([v, l]) => (
              <div key={l}><b className="block font-mono text-[17px] text-[var(--violet)]">{v}</b><span className="text-[11.5px] uppercase tracking-[0.08em] text-[var(--ink-3)]">{l}</span></div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 min-w-[240px]">
          {topCorps.length > 0 && (
            <div className="rounded-[var(--radius-console)] border border-[var(--line)] bg-[rgba(19,17,16,.85)] p-3">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-[var(--ink-3)] mb-2"><span>Top corporations</span><Link href="/space-tycoon/leaderboard" className="text-[var(--violet)] normal-case tracking-normal">Leaderboard &rarr;</Link></div>
              <ol className="space-y-1">
                {topCorps.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 text-[13px]">
                    <Link href={`/space-tycoon/corp/${c.id}`} className="truncate text-[var(--ink)] hover:text-[var(--violet)]"><span className="font-mono text-[var(--ink-3)] mr-2">{c.rank}</span>{c.companyName}{c.allianceTag ? <span className="text-[var(--ink-3)]"> [{c.allianceTag}]</span> : null}</Link>
                    <span className="font-mono tabular-nums text-[var(--ink-2)]">${(c.netWorth / 1e9).toFixed(1)}B</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <Link href="/space-tycoon" className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--violet)] text-[#0A0A0B] font-bold text-[14.5px] min-h-[44px] px-5 hover:brightness-110">Play free in your browser &rarr;</Link>
          <Link href="/space-tycoon/about" className="text-[12.5px] text-[var(--ink-3)] hover:text-[var(--ink)] text-center">What is Space Tycoon?</Link>
        </div>
      </div>
    </div>
  );
}
