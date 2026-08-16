# Show HN draft

> **For Jay:** Post from your personal HN account, not a brand account. Be in the comments for the
> first 3-4 hours — HN threads live or die on the author answering questions. If someone finds a
> balance exploit, thank them and fix it publicly; that IS the content. Best posting windows are
> weekday mornings US Eastern. Do not edit the title to add superlatives; HN will flag it.

---

## Title

Show HN: An economic space MMO with no combat, fed by live space data

*(Alternate if that reads too generic: "Show HN: Space Tycoon – a browser MMO where you fight with money, not fleets")*

## URL

https://spacenexus.us/space-tycoon

## Body

I run SpaceNexus, a space-industry news/data site, and over the past months I've been building a
game into it: Space Tycoon, a free browser (and phone) MMO where corporations compete across a
hard-science 2150 solar system. It just launched properly, the economy is live, and the first
corporations are forming.

Two design decisions drove everything:

**1. No combat, ever.** The strategy genre defaults to fleet battles. This game has none — the
in-universe Accord of 2089 demilitarized space, so all conflict is economic: undercut a rival's
prices in a shared demand pool, corner a commodity on the order book, poach their engineers (the
target gets a 48-hour counteroffer window, and poaching wars heat a global wage index for that
crew type), levy zone taxes on their revenue, and eventually tender for their shares. The hostile
takeover system (share registry, tender offers, white knights, minority-shareholder protections)
is built but population-gated — it answers "awaiting market depth" until enough corporations are
active, rather than pretending a 9-corp server is Wall Street.

**2. Real space data feeds the simulation.** The site already ingests NOAA SWPC space weather and
the global launch schedule, so the game reads the same feeds: when the real planetary Kp index
goes above 5 or there's an M/X-class flare, an in-game solar-storm watch appears with severity
mapped from the actual reading. When a real rocket is within an hour of T-0, a +10%
contract-payout window opens in the game. Real Starship/Artemis program milestones grant a +10%
research-speed bonus for the week. The in-game mission calendar shows the actual upcoming launch
manifest.

Technical bits HN might find interesting:

- **Deterministic client sim + server-authoritative markets.** Each player's economy ticks
  client-side (2s ticks), but all shared surfaces — the limit-order book (price-time FIFO with
  escrow), the one-wallet ledger, zones, alliances — are server-side. Away-time catch-up uses
  seeded PRNG (mulberry32 over hashed month keys), so a week of absence resolves identically
  whether processed live or on return. That's what makes offline progression exploit-resistant.
- **The economy is balance-tested by simulation, not vibes.** A harness
  (`sim-harness.ts`) imports the actual engine modules and runs scripted strategies over 24
  game-months, solo and against competitors sharing a demand pool. It's how we caught the
  degenerate strategies: a "satellite spammer" who buys nothing but telecom sats converts $2B of
  cash into a fleet that loses $23.9M/month forever, while a diversified vertical integrator is
  the only durable positive strategy. Rival entry into a shared GEO pool cut the incumbent's
  revenue 33% in sim. When we retune a constant, we re-run the harness and the design doc's
  tables regenerate.
- **Demand is finite and local.** Service revenue comes from per-location demand pools, buildings
  consume inputs per tick, deposits deplete under extraction pressure (three co-located miners
  each settle at ~2/3 of solo output), and wages move on a labor index. Over-building doesn't
  just diminish — it loses money, because costs don't scale down when your pool share does.
- Stack: Next.js 14 / TypeScript / Prisma / Postgres, ~2,800 Jest tests, additive save
  migrations so old saves always load.

It's free, browser + phone, no install, and no pay-to-win — the published policy is that real
money can never buy competitive advantage (cosmetics/convenience only), and that's load-bearing
for an economy game.

What I'd love feedback on: whether the first 30 minutes teaches the economy fast enough, anything
that feels like a dominant strategy (the harness can't think of everything), and how the market
UI reads on mobile. If you find an exploit, tell me — the policy commits us to public
post-mortems.
