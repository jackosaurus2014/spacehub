# Space Tycoon — Press Kit (one-pager)

> **For Jay:** This is the copy-paste source for anyone who asks "what is it?" — journalists,
> newsletter writers, podcast hosts. Screenshots are yours to capture (list below). Keep this
> file updated as facts change; everything in it is verified against the shipped code as of
> 2026-08-16.

---

## One-liner

Space Tycoon is a free browser MMO of pure economic warfare in a hard-science 2150 solar
system — no combat, one live market for everything, and real space data (NOAA storms, live
launches) feeding the simulation.

## What it is

A free live-service economic strategy MMO from SpaceNexus, playable instantly in any browser or
on a phone — no download, no install. Players found corporations in the year 2150, nine decades
after the Accord of 2089 demilitarized space, and compete for wealth and influence across a
realistically modeled solar system: delta-v-priced freight, finite orbital slots, depleting
deposits, and a shared market where every trade moves the price.

- **Play:** https://spacenexus.us/space-tycoon
- **Price:** Free. Published no-pay-to-win policy — real money can never buy competitive
  advantage (cosmetics and convenience only).
- **Platforms:** Web browser (desktop + mobile), installable as an app (PWA / Google Play).
- **Launch status:** Newly launched (August 2026). The economy is live; the first corporations
  are forming.

## Key features

- **No combat — economic PvP only.** Price wars in finite local demand pools, market cornering
  on a live limit-order book, sealed-bid contract auctions, zone influence and governor taxes,
  espionage (information only), talent poaching with 48-hour counteroffer windows, and a
  hostile-takeover system (share registry, tender offers, white knights, minority protections)
  that activates as the server population grows.
- **Real space data in the simulation.** Live NOAA SWPC space weather (planetary Kp index, GOES
  X-ray flux) surfaces as in-game solar-storm watches with severity mapped from the real
  reading. Real launches within an hour of T-0 open a +10% contract-payout window. Real
  Starship/Artemis program milestones grant a week-long research-speed bonus. The in-game
  mission calendar shows the actual upcoming launch manifest.
- **A real economy.** One shared live price per commodity; buildings consume inputs every tick;
  deposits thin under shared extraction; wages move on a labor index; commodity super-cycles
  are announced a week in advance; over-building actively loses money. Hazards (solar storms,
  micrometeoroids, NPC piracy, equipment failure) make insurance and redundancy genuine
  strategic decisions.
- **Built for months-scale play.** Command queues and standing directives run operations while
  players are away (deterministic catch-up — no offline exploits); 90-real-day corporate eras
  with public charters and medals; world-synchronized story chapters with finale weekends;
  quarterly faction realignments; weekly leagues with promotion and relegation; a six-faction
  political landscape grounded in a documented 22nd-century timeline.
- **Public, crawlable world record.** The leaderboard, corporate registry, era chronicle, and
  quarterly epoch address are public web pages — the server's history is legible to anyone.

## Technical notes

- Next.js 14 (App Router), TypeScript, Prisma/PostgreSQL; ~2,800 automated tests.
- Deterministic client-side simulation (2-second ticks) with server authority over all shared
  surfaces: the order book (price-time FIFO with escrow), the transaction ledger, zones,
  alliances, and takeovers. Away-time resolves via seeded PRNG — identical results live or on
  return.
- The economy is balance-tested by a simulation harness that runs scripted strategies against
  the actual engine modules over 24 game-months, solo and against competitors — degenerate
  strategies (e.g., spamming one profitable building) are verified to lose money before tuning
  ships.
- Real-data ingestion shares the pipelines that power SpaceNexus's news and tracking tools
  (NOAA SWPC, launch schedule, program trackers).

## Screenshots to capture (Jay)

1. **Command center hub** — the main ops-room view a session opens on (dashboard, true-black
   HUD aesthetic).
2. **Market tab** — the order book plus a price-history chart for one commodity (iron or
   helium-3), ideally with a super-cycle banner visible.
3. **Solar system map** — the WebGL map, belt or Jovian region framed.
4. **World events banner during a real event** — a live NOAA storm watch or a real launch
   window with the +10% badge (time the capture to a real launch day).
5. **Mission calendar / world calendar** — showing real upcoming launches alongside game events.
6. **Operations debrief** — the return-from-away digest screen.
7. **Corporate era charter panel** — a chartered 90-day era with its mandate.
8. **Public leaderboard** — https://spacenexus.us/space-tycoon/leaderboard (logged out).
9. **Epoch address** — https://spacenexus.us/space-tycoon/epoch (the quarterly realignment page).
10. **Mobile** — one phone-width capture of the command center to prove mobile parity.

## Links

- Play: https://spacenexus.us/space-tycoon
- Launch announcement: https://spacenexus.us/blog/introducing-space-tycoon-economic-space-mmo
- Public leaderboard: https://spacenexus.us/space-tycoon/leaderboard
- Corporate registry: https://spacenexus.us/space-tycoon/registry
- Era chronicle: https://spacenexus.us/space-tycoon/chronicle
- Epoch address: https://spacenexus.us/space-tycoon/epoch
- FAQ: https://spacenexus.us/space-tycoon/faq
- SpaceNexus: https://spacenexus.us
- Contact: via https://spacenexus.us/contact
- LinkedIn: https://www.linkedin.com/company/112094370

## Boilerplate

SpaceNexus is the space industry's portal: news, market intelligence, jobs, funding data, and
mission tracking for enthusiasts, professionals, and investors. Space Tycoon is its free
economic strategy MMO, built on the same live data that powers the site.
