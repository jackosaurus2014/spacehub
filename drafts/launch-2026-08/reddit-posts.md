# Reddit launch drafts — 3 posts

> **For Jay — general notes before posting any of these:**
> - Post from your personal account with some comment history, never a fresh account.
> - Space the three posts out over several days; simultaneous cross-posting looks like a campaign.
> - Answer every comment in the first few hours. Reddit rewards makers who engage and buries
>   drive-by promo.
> - All three drafts avoid player counts, hype words, and traction claims. Keep it that way in
>   comments too — "it just launched, the economy is live, corporations are forming" is the line.

---

## Post 1 — r/incremental_games

> **Sub norms (check before posting):** r/incremental_games is friendly to dev posts about your
> own game — use the "Update"/"WebGame" flair if available, and consider Feedback Friday if the
> mods prefer new games there. Link directly to the game, not to marketing pages. This community
> will actually play it and will find every exploit — treat that as free QA and say thank you.

**Title:** I built a browser space MMO where away-time is a planning decision, not a penalty — command queues, standing directives, and an economy where over-building loses money

**Body:**

Long-time lurker, first game post. Space Tycoon is a free browser/mobile economic MMO set in a
2150 solar system, and I want to share the two systems this sub cares most about.

**Away progression.** I started with the classic 8-hour offline cap and hated it — it punishes
having a job. So the cap is gone, replaced by an efficiency curve: away yield is uncapped in
time but capped in rate, and the curve's tiers are raised by things you invest in (automation
research, an autonomous ops center, operator crew). Before you log off you load a command queue
(next builds, next research, ship loops) and set standing directives (auto-sell above a price,
auto-restock below one, keep a maintenance reserve) — each directive charges a monthly ops fee,
so full automation is a priced choice, not a default. Catch-up is deterministic (seeded PRNG per
game-month), so a week away resolves identically whether you were online or not — no
offline-exploit weirdness. When you come back you get an operations debrief instead of a toast:
what earned, what completed, what the market did, what's on the calendar.

Being present is still strictly better — this is not an idle game — but absence is now a
strategy you can spend money on.

**Economic depth.** No combat at all: it's pure economic PvP. Every commodity has one live
shared price and an order book. Service revenue comes from finite local demand pools, so a rival
building next to you literally takes your customers (in our balance sims, a competitor entering
a shared GEO pool cut the incumbent's revenue by a third). Buildings consume inputs, deposits
deplete when multiple miners share them, and wages move on a labor index — if you poach a
rival's engineers (they get a 48h counteroffer window), the whole market's wages for that crew
type heat up. We balance-test all of it with a simulation harness that runs scripted strategies
against the real engine: the "buy nothing but satellites" strategy ends up losing $24M/month
forever, which is exactly what we wanted.

Free, browser + phone, no download, and a published no-pay-to-win policy (real money can never
buy competitive advantage — cosmetics and convenience only).

Play: https://spacenexus.us/space-tycoon

It launched recently, so the economy is young and I'd genuinely value this sub's judgment on the
away-progression curve numbers and anything that smells like a dominant strategy.

---

## Post 2 — r/tycoon

> **Sub norms (check before posting):** r/tycoon allows developers to share their own games but
> read the sidebar for the current self-promo rule (some periods they require a "Developer" flair
> or limit frequency). This audience wants economic mechanics, not screenshots of explosions —
> lead with the simulation. Expect comparisons to Capitalism Lab, Offworld Trading Company, and
> EVE's market; have opinions ready.

**Title:** I made a tycoon MMO with zero combat — all conflict is price wars, market cornering, talent poaching, and hostile takeovers

**Body:**

Most "space strategy" games are combat games with a market bolted on. I wanted the opposite: a
game where the market IS the battlefield. Space Tycoon is a free browser/mobile MMO set in a
hard-science 2150 solar system where corporations compete purely economically — the in-universe
treaty demilitarized space, so there are no fleets to sink. What you can do instead:

- **Price wars:** service revenue comes from finite local demand pools. Build a competing
  datacenter in the same orbit and you take a share of the incumbent's customers — their revenue
  actually drops.
- **Market cornering:** one live shared price per commodity, a real limit-order book
  (price-time FIFO, escrow), commodity super-cycles announced a week in advance, and cornering
  alerts so the market can see someone accumulating.
- **Talent poaching:** make a poach offer on a rival's crew; they get a 48-hour counteroffer
  window; either way the global wage index for that crew type rises. Poaching wars make labor
  expensive for everyone.
- **Hostile takeovers:** every corporation has a 100-share registry. Shares only enter the float
  through capital raises, distress auctions, or accepted tender offers — so a healthy company
  that never over-leverages can never be taken over. Tender offers, counteroffers, white
  knights, and minority-shareholder protections are all in (the system gates itself off until
  the server has enough active corporations for takeovers to mean anything, and says so
  honestly).
- **Risk without PvP violence:** solar storms, micrometeoroids, NPC pirate raids, and equipment
  failures can destroy assets — so insurance, redundancy, and shielding are real economic
  decisions.

Costs are designed to catch up with income: buildings consume inputs every tick, deposits
deplete when shared, wages float, and demand saturates — our balance harness shows the
"spam one profitable building forever" strategy going cash-negative within a year while
diversified vertical integration wins. There's also a long game: 90-day corporate eras with
public charters, world-synchronized story chapters with finale weekends, and quarterly faction
realignments.

Free, no download, browser + phone, published no-pay-to-win policy.

https://spacenexus.us/space-tycoon

Newly launched — the economy is live and the first corporations are forming. Happy to go as deep
as anyone wants on the demand-pool math or the takeover rules.

---

## Post 3 — r/space (or r/SpaceXLounge — pick ONE, do not post to both)

> **Sub norms — IMPORTANT, read before posting:** Both subs are hostile to self-promotion.
> r/space rule: no self-promo outside the weekly "All Space Questions" / designated threads —
> check whether a "Discussion" flair post from a maker is currently tolerated, and if in doubt
> ask the mods first via modmail (this genuinely works and mods appreciate it).
> r/SpaceXLounge is more relaxed than r/spacex but still expects the post to be interesting to
> the community first and a product second. The draft below is written for r/SpaceXLounge
> (launch-window mechanic leads); if posting to r/space instead, swap the first paragraph's
> SpaceX framing for the NOAA framing. If neither sub's rules allow it, r/spacegames and
> r/WebGames are safe fallbacks that welcome this directly.

**Title:** I built a game where real launches and real NOAA space weather flow into the simulation — when a rocket is an hour from T-0, an in-game bonus window opens

**Body:**

I run a space-industry news site, and it already ingests NOAA SWPC space-weather data and the
global launch manifest. A while ago I had a thought: what if a game read the same feeds?

So the economic strategy game I've been building into the site does:

- **Real space weather:** when the actual planetary Kp index goes above 5, or the current GOES
  reading is an M/X-class flare, an in-game solar-storm watch appears — severity mapped from the
  real reading, labeled "mirrored from real heliophysics data (NOAA SWPC)."
- **Real launches:** when any real launch is within about an hour of T-0, the game opens a
  "launch window" event with a +10% contract payout bonus — so an actual Falcon 9 or New Glenn
  countdown is a reason to be in the game at that moment. The in-game mission calendar shows the
  real upcoming manifest.
- **Real program milestones:** when the Starship or Artemis programs hit a genuine milestone, a
  research-speed bonus fires for the week.

The game itself (Space Tycoon) is a free browser MMO set in 2150 — deliberately no combat, all
competition is economic (markets, supply chains, takeovers), with the solar system modeled
seriously: delta-v priced freight, finite orbital slots, deposits that deplete. But the
real-data loop is the part I thought this sub might find fun: the game's "weather" is the actual
Sun's weather.

It's at https://spacenexus.us/space-tycoon — free, no install, no pay-to-win. Honest disclosure:
I made it, it launched recently, and I'm posting because the real-data mechanic seemed like
something this community in particular would appreciate (and would tell me how to improve —
e.g., what other live data sources would be fun to wire in?).
