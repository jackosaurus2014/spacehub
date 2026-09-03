# Space Tycoon — Economic Balance Report, 2026 Q3

*Published 2026-09-02. The first quarterly balance report under the
"balance review cadence" commitment in the public policy
(docs/POLICY.md): median corporate net worth, inequality (Gini), price
stability of core commodities, faction balance, new-player retention and
P&L distribution, published in the open. Every figure below comes from one
of three sources and says which: the 50-year balance simulation
(`scripts/sim-50yr.ts`, run 2026-09-02 on the unified clock), the live
world's public APIs (`/api/space-tycoon/leaderboard`, `/market`,
`/market/share`, read 2026-09-02), or the shipped constants in
`docs/BALANCE.md`. Nothing is estimated. Where a number cannot be measured
yet, the report says so and states how it will be measured next quarter.*

## 1. Summary

- **The clock defect is fixed and the balance tables are now the rate
  players experience.** Until 2026-09-02 the engine credited one game-month
  of income every 60 real seconds while the calendar advanced one game-month
  every 6 real hours (360x). Every balance playtest had been run at the
  6-hour rate, so the design tables were right and the live game was wrong.
  Post-mortem: [dev log, 2026-09-02](https://spacenexus.us/space-tycoon/dev-log);
  engineering detail: `docs/BALANCE.md` "Clock unification".
- **The economy is on the Pass-6 curve where the curve was not deliberately
  moved.** The year-10 and year-30 late joiners land within rounding of the
  Pass-6 tables (joiner-y10 $18.74B at year 50 vs $18.70B recorded;
  joiner-y30 $80.9M vs $80.9M). The founding integrator is off the Pass-5
  table by −28% on income and −51% on net worth at year 50; the identified
  contributor is D5 making the T5 research tree affordable (it now spends
  $230B on research it previously could not buy, and holds a $20B flagship
  with an $80M/month floor). The exact split from other August changes
  cannot be settled from the recorded tables and needs a counterfactual run
  next quarter. See §4.
- **D5 flagship economics work in practice for the one archetype that
  reaches a flagship.** The integrator's first Jupiter datacenter returned
  its $20B capex in **76 game-months** on its own P&L line (D5's design band
  was 120–240 months at a 2.07x revenue stack; the sim runs a 3.0x stack).
  Seven of eight archetypes never buy a flagship in 50 years in either run —
  the deep-tier horizon is still canon (Pass 7), but the "money-losing
  asset" finding is closed.
- **Mark-II refits partly fill the H3 void.** With refit-aware play,
  decision cadence in years 10–30 rises from 1/1 to 9/11 months per decade
  for the mono-expander, 8/13 to 13/27 for the integrator, and 7/8 to 35/29
  for the year-10 joiner; the year-30 joiner goes from 5/0 to 25/27. But the
  refit content itself is consumed in the first decade a portfolio matures
  (mono-expander: 22 refit-months in years 0–10, then 3, 2, 1, 2). The
  cadence gain in years 10–30 comes mostly from the income uplift un-stalling
  research, not from ongoing refit decisions. Mark III arrives only for the
  integrator, in years 40–50.
- **Inequality falls with refits.** Year-50 Gini across the eight
  archetypes: 0.730 without refits, 0.548 with; top-1 share of wealth 67% →
  39% (Pass 5: 0.82 / 89%; Pass 6: 0.787 / 80%). Refits are cheap relative to
  the catalog's next rung, so the archetypes that were stuck (mono-expander,
  both joiners) gain far more than the one that was not.
- **No runaway, no new stall.** Money-supply sink coverage stays 95–104%
  per decade in both runs (cumulative net minted −$2.0B standard, +$28.3B
  refit-aware, over 50 years and ~$1.3T of flow). The industrialist's
  40-year stall on `deep_drilling` ($8B) and the hoarder's flat line are
  unchanged from Pass 5 — known, not new.
- **The live world has two corporations.** Median net worth $236.9M, Gini
  0.289, no player order-book fills in the trailing 30 days (NPC share of
  traded value: 100%). Retention and faction balance are not statistically
  meaningful at n=2 and are marked *measured next quarter*.

## 2. Methodology

**Simulation.** `npx tsx scripts/sim-50yr.ts` (standard) and
`npx tsx scripts/sim-50yr.ts --refit` (refit-aware). 600 game-months (50
game-years = 150 real days at the unified 6 h/month clock), eight scripted
archetypes in ONE shared world with every realism switch on: contended NPC
absorption caps (order-book FIFO), the shared labor market at the D6 supply
base, dynamic spot prices from combined flows with the real mean-reversion
math, construction material settlement, the delivery-contract outlet (5/day),
D5 flagship upkeep floors, D4 Mark refit multipliers, and the Pass-6
graduation glide for the late joiners. Deterministic — no wall clock, no
random numbers; two runs diff clean.

| archetype | start | strategy |
|---|---|---|
| mono-expander | $2B at month 0 | LEO/GEO telecom copies forever, reactive decommission |
| integrator | $2B, month 0 | 41-step diversified ladder to the outer system |
| industrialist | $2B, month 0 | belt rigs + refinery + fabs + continuous crafting |
| aggressor | $2B, month 0 | mid-size base, price campaigns on the real 28/56-month cadence |
| turtle | $2B, month 0 | 8 first-copy buildings, T1+T2 research only, then nothing |
| hoarder | $2B, month 0 | maximum extraction, sells nothing |
| joiner-y10 | $200M at month 120 | value-first order then the integrator ladder (post-Frontier, glide on) |
| joiner-y30 | $200M at month 360 | same |

"Refit-aware" means every archetype takes a Mark II (and, once its
category's T3 gate tech is researched, Mark III) refit on any building whose
preview payback — the same arithmetic the in-game refit card shows — is under
60 game-months, cheapest first, at most its construction-slot count per
month, never spending more than half its cash on one refit.

**What the simulation models with the real engine modules:** the service
revenue stack (saturation × shared demand pools × power × supply efficiency),
price-linked mining with shared extraction pressure, consumption and storage
integrity, NPC absorption caps, the contract outlet, crafting, corporate
overhead, executive compensation on book net worth, labor-market payroll,
dynamic spot, price campaigns, decommission recovery, serial money-gated
research on the real tree, D4 refits, D5 floors.

**Approximations, stated plainly:** private revenue multipliers are a
fixed 3.0x stack (research cap 2.0 × workforce service bonus cap 1.5) once
the scripted research completes — the live engine's stack differs in
composition (research bonus cap +50%, tier +20%, station +15%, commanders,
legacy) and can be higher or lower; corporate tier is inferred from lifetime
earnings only (T6/T7 legacy gates not modeled, reported tier caps at 5);
buildings and refits complete instantly (their wall-clock timers are minutes
to an hour against a 6-hour month); headcounts follow a rational-cap formula.
**Not modeled at all:** megastructures, interstellar expeditions, story
chapters, senate and factions, ships and lanes, hazards and insurance,
espionage, takeovers, seasonal events, mentorship, player-to-player
order-book trades, D6 takeover and slot-auction gates. The simulation says
nothing about those systems.

**Clock note.** `scripts/sim-50yr.ts` and its harness have always stepped
one game-month at a time (research advances 21,600 real seconds per step),
so the derived 10,800 ticks-per-month changed nothing in these tables; the
whole 600-month world runs in about three seconds. The tick-stepping runner
that did need conversion, `scripts/balance-archetypes.ts`, now steps a
30-tick month through the engine's `monthFraction` override and reproduces
its pre-unification numbers exactly (regression:
`src/lib/game/__tests__/sim-month-grid.test.ts`).

**Live world.** Public leaderboard and market endpoints, read
2026-09-02 (UTC). No private data; the two corporations named below are the
public leaderboard's rows.

## 3. The 50-year decade grid

Book net worth (cash + depreciated buildings and refits + inventory at base
prices) and trailing-12-month net income at each decade end. Decision months
= months with a build, a research completion, a refit, a decommission or a
campaign declaration (b/r/f = build / research / refit months). Sink coverage
= that archetype's money destroyed ÷ money created in the decade.

### 3a. Standard run (no refits)

| archetype | y10 | y20 | y30 | y40 | y50 | tier y50 |
|---|---:|---:|---:|---:|---:|---|
| mono-expander | $269.9M / $5.9M | $185.9M / $102K | $197.1M / $513K | $242.5M / $2.4M | $246.6M / $988K | T3 |
| integrator | $16.63B / $458.8M | $42.66B / $542.0M | $53.21B / $596.0M | $68.64B / $731.9M | $66.15B / $713.2M | T5 |
| industrialist | $5.28B / $49.0M | $3.22B / $47.2M | $5.74B / $44.3M | $4.44B / $44.1M | $3.14B / $43.7M | T3 |
| aggressor | $1.34B / $33.7M | $1.15B / $31.3M | $913.6M / $28.9M | $938.3M / $26.8M | $1.69B / $26.4M | T3 |
| turtle | $1.07B / $63.5M | $1.42B / $60.4M | $1.44B / $56.8M | $981.0M / $42.9M | $1.10B / $38.5M | T4 |
| hoarder | $886.7M / $9.5M | $1.00B / $9.5M | $1.92B / $26.9M | $4.04B / $40.7M | $7.30B / $30.8M | T3 |
| joiner-y10 | — | $165.8M / $1.3M | $522.5M / $30.8M | $9.57B / $297.5M | $18.74B / $318.1M | T4 |
| joiner-y30 | — | — | — | $164.1M / −$648K | $80.9M / −$718K | T2 |

Decision months per decade (b/r/f):

| archetype | y0–10 | y10–20 | y20–30 | y30–40 | y40–50 |
|---|---|---|---|---|---|
| mono-expander | 13 (13b/1r) | 1 (1b) | 1 | 3 (2b) | 1 (1b) |
| integrator | 25 (20b/6r) | 8 (4b/4r) | 13 (6b/7r) | 33 (1b/32r) | 29 (29r) |
| industrialist | 7 (6b/2r) | 2 (2r) | 1 (1r) | 1 (1r) | 2 (2r) |
| aggressor | 24 (4b/21r) | 9 (8r) | 12 (11r) | 7 (6r) | 6 (5r) |
| turtle | 31 (6b/26r) | 17 (17r) | 17 (17r) | 14 (14r) | 10 (10r) |
| hoarder | 4 (2b/3r) | 2 (2r) | 1 (1b) | 2 (2b) | 1 (1b) |
| joiner-y10 | — | 7 (3b/5r) | 8 (5b/3r) | 22 (13b/9r) | 11 (6b/5r) |
| joiner-y30 | — | — | — | 5 (3b/3r) | 0 |

Sink coverage per archetype per decade: mono-expander 131/101/100/99/100%;
integrator 95/90/107/98/103%; industrialist 73/123/72/115/115%; aggressor
118/99/100/95/83%; turtle 116/94/100/105/99%; hoarder 186/93/104/94/71%;
joiner-y10 —/108/97/91/103%; joiner-y30 —/—/—/108/107%.

### 3b. Refit-aware run

| archetype | y10 | y20 | y30 | y40 | y50 | tier y50 | refits (cum) / spend |
|---|---:|---:|---:|---:|---:|---|---|
| mono-expander | $633.5M / $28.9M | $999.9M / $20.6M | $1.24B / $19.8M | $1.47B / $19.3M | $1.19B / $18.4M | T4 | 32 / $732.8M |
| integrator | $18.62B / $683.1M | $57.47B / $772.0M | $66.51B / $889.0M | $68.43B / $840.6M | $71.23B / $829.8M | T5 | 24 / $9.95B |
| industrialist | $4.27B / $75.1M | $5.35B / $66.7M | $3.98B / $66.8M | $8.06B / $60.2M | $14.87B / $94.4M | T4 | 7 / $962.8M |
| aggressor | $1.73B / $53.2M | $1.45B / $45.6M | $1.86B / $44.3M | $1.64B / $38.9M | $2.30B / $38.8M | T3 | 6 / $812.4M |
| turtle | $1.77B / $112.5M | $1.70B / $92.7M | $2.82B / $72.6M | $11.07B / $64.5M | $17.76B / $52.1M | T4 | 8 / $1.13B |
| hoarder | $871.3M / $8.5M | $950.5M / $9.3M | $1.56B / $16.6M | $3.82B / $22.3M | $5.94B / $23.9M | T3 | 0 / $0 |
| joiner-y10 | — | $2.21B / $127.5M | $19.16B / $521.4M | $55.29B / $619.3M | $58.78B / $481.0M | T4 | 19 / $5.14B |
| joiner-y30 | — | — | — | $1.15B / $55.5M | $12.67B / $329.1M | T3 | 15 / $4.40B |

Decision months per decade (b/r/f):

| archetype | y0–10 | y10–20 | y20–30 | y30–40 | y40–50 |
|---|---|---|---|---|---|
| mono-expander | 46 (19b/7r/22f) | 9 (3b/3r/3f) | 11 (2b/7r/2f) | 5 (1b/3r/1f) | 5 (2b/1r/2f) |
| integrator | 38 (19b/9r/13f) | 13 (10b/3r) | 27 (1b/26r) | 36 (35r/1f) | 42 (36r/6f) |
| industrialist | 13 (6b/3r/6f) | 2 (2r) | 2 (2r) | 1 (1r) | 2 (2b) |
| aggressor | 31 (4b/23r/5f) | 17 (16r) | 12 (10r) | 12 (11r) | 9 (8r) |
| turtle | 44 (5b/33r/7f) | 28 (28r) | 21 (21r) | 0 | 0 |
| hoarder | 4 (2b/3r) | 2 (2r) | 1 (1b) | 1 (1b) | 2 (2b) |
| joiner-y10 | — | 35 (12b/14r/10f) | 29 (14b/7r/9f) | 11 (10b/1r) | 9 (9r) |
| joiner-y30 | — | — | — | 25 (10b/9r/7f) | 27 (11b/8r/8f) |

Mark levels held at year 50: mono-expander 32 buildings, all Mark II;
integrator 34 (19 Mark I, 6 Mark II, 9 Mark III); industrialist 11 (4/7/0);
aggressor 7 (1/6/0); turtle 8 (0/8/0); hoarder 6 (all Mark I); joiner-y10 38
(19/19/0); joiner-y30 22 (7/15/0).

Sink coverage per archetype per decade: mono-expander 119/97/98/98/102%;
integrator 98/99/103/98/100%; industrialist 93/91/111/65/95%; aggressor
111/103/92/95/88%; turtle 111/99/92/36/44%; hoarder 188/95/119/65/101%;
joiner-y10 —/97/96/101/97%; joiner-y30 —/—/—/98/91%. The turtle's 36–44% in
its last two decades is a corporation that has finished its scripted
research and does not reinvest: it banks ~$50–65M/month against an
executive-compensation wealth tax that does not stop the pile growing. That
is the passive archetype by construction, and a WATCH item (§9).

### 3c. Money supply (world totals)

| decade | standard: created / destroyed / coverage | refit-aware: created / destroyed / coverage |
|---|---|---|
| y0–10 | $77.65B / $79.51B / 102% | $110.62B / $114.94B / 104% |
| y10–20 | $121.70B / $115.26B / 95% | $193.32B / $189.99B / 98% |
| y20–30 | $159.01B / $165.17B / 104% | $266.82B / $269.23B / 101% |
| y30–40 | $205.87B / $201.15B / 98% | $331.02B / $314.18B / 95% |
| y40–50 | $249.03B / $254.13B / 102% | $377.81B / $362.93B / 96% |
| cumulative net minted | −$1.96B | +$28.34B |
| research destroyed | $337.07B | $512.68B |
| world cash / book NW at y50 | $10.43B / $95.96B | $40.72B / $184.73B |

Pass 5 recorded +$15.0B cumulative net minted over 50 years and $237B of
research destroyed. Research destruction is up, not down, after the D5 ÷10
reprice — the integrator (and, refit-aware, the year-10 joiner) now buys the
T5 tree it could never afford before. Campaign fees burned: $250M in each
of decades 2–5 (standard), $250M–$500M (refit-aware).

## 4. Against the Pass 5 / Pass 6 tables

Pass 5 (docs/BALANCE.md, 2026-08) and Pass 6 were run at the same 6 h/month
rate this run uses, so they should be close except where a shipped change
deliberately moved them.

| measure | Pass 5 / 6 recorded | this run (standard) | verdict |
|---|---:|---:|---|
| joiner-y10 NW at y50 | $18.70B (Pass 6) | $18.74B | on-curve (+0.2%) |
| joiner-y30 NW at y50 | $80.9M (Pass 6) | $80.9M | on-curve; stagnation residual unchanged |
| joiner-y10 first profitable month / profitable of first 60 | 0 / 60 (Pass 6) | 0 / 60 | on-curve |
| solvent players at y50 | 8/8 (Pass 6) | 8/8 | on-curve |
| Gini at y50 / top-1 share | 0.787 / 80% (Pass 6) | 0.730 / 67% | better by 0.06 / 13 pts |
| integrator net/mo at y50 | $986M (Pass 5) | $713M | **−28%** |
| integrator NW at y50 | $136.2B (Pass 5) | $66.15B | **−51%** |
| integrator 50-year gross | $611B (D5 note) | $537B | −12% |
| turtle NW at y50 | $5.2B (Pass 5) | $1.10B | −79% — not attributable from the recorded tables (see below) |
| industrialist net/mo at y50 | $48M (Pass 5) | $43.7M | −9% |
| hoarder NW at y50 | $6.5B (Pass 5) | $7.30B | +12% |
| labor index, all decades | 0.80 floor (Pass 5) | 0.80 floor | unchanged at 8 corps (D6 table: 0.800 at 5 and 10 corps) |
| organic spot excursion | never beyond −12% (Pass 5) | iron 90% of base at y50, nothing else below 92% | on-curve |

**Verdict on D1 (clock).** The economy is on-curve wherever the curve was
not intentionally moved: every joiner figure Pass 6 recorded reproduces to
the rounding digit, solvency and concentration are at or better than
recorded, prices and the labor index are where the tables put them. Two
founders are off the Pass-5 table by more than 25%: the integrator (−28%
income, −51% net worth) and the turtle (−79% net worth). What can be
identified for the integrator: D5 divided the 35 most expensive research
nodes by ten, and the integrator now spends **$229.75B** on 162 techs and
reaches T5 — Pass 5's integrator could not touch T5 at all (finding C2) —
and it buys a $20B flagship at month 407 that pays an $80M/month upkeep
floor. The standard run ends with 34 buildings; in the refit-aware run the
integrator recovers most of the income ($830M/month, −16% vs Pass 5; NW
$71.2B) while spending $326.9B on 200 techs. What cannot be identified: Pass
5 did not record the integrator's own research spend or building count, and
the turtle (no mining, no flagship, T1+T2 techs whose prices D5 did not
touch) moved too, so the split between "cash diverted into the tree" and the
other changes shipped since August (Pass-6 duty-cycle opex, Pass-9 fee
indexing, D6 labor supply, the manufacturing and early-fab waves, and the
other archetypes' changed footprints in the shared pools) cannot be settled
from the recorded tables. **The constant that most directly moves the
integrator figure is `T5_RESEARCH_REPRICE_DIVISOR` (10 → 5 would halve the
cash the tree absorbs).** We recommend NOT changing it this quarter: D5's
research-destruction arithmetic assumed exactly this spend, the sink is now
exercised instead of theoretical, and the joiners and every refit-aware
archetype are on or above curve. Follow-up (engineering, not balance): a
`--pre-d5` counterfactual switch in the harness so next quarter's report can
attribute the founders' gap by cause instead of by inference.

## 5. D5 — did flagship payback get fixed in practice?

| run | first flagship | bought | scaled capex | realised payback (own line) | own-line net recovered by y50 |
|---|---|---|---:|---:|---:|
| standard | integrator: datacenter_jupiter | month 407 (year 33.9) | $20.00B | **76 months (6.3 y)** | $51.24B (256%) |
| refit-aware | integrator: datacenter_jupiter | month 314 (year 26.2) | $20.00B | **76 months (6.3 y)** | $75.93B (380%) |
| both | every other archetype | none in 50 years | — | — | — |

"Own line" = that building's service revenue at the archetype's multiplier
stack minus its operating cost and its D5-floored maintenance, accumulated
from the month of purchase. First-copy self-payback at neutral multipliers
(the harness's `marginalCurve`, same as D5's table) is unchanged at 1,683
months for datacenter_jupiter, 1,450 for mining_europa, 1,153 for
mining_titan, 1,764 for fabrication_titan, 1,114 for deep_space_relay and 669
for mining_kuiper — the neutral figure is a thin generational asset by
design, and the realised figure at a mature stack is inside (below) the
120–240 band. Verdict: **D5 landed** — the one corporation that reaches a
flagship makes money on it. The other five income flagships and the three
infrastructure flagships were built by nobody in 50 years in either run; the
D5 WATCH ("does anyone build them once T5 is reachable") stays open, to be
read from live telemetry rather than the sim.

## 6. D4 — does Mark II fill the H3 void?

Pass 5's H3 finding: decision cadence collapses to 0–3 months per decade by
year 30 for every archetype but the integrator, because copy N+1 lands in a
0.35-floored pool and the catalog jumps from ~$2B to $8–80B.

| archetype | y10–20 cadence: standard → refit | y20–30: standard → refit |
|---|---:|---:|
| mono-expander | 1 → 9 | 1 → 11 |
| integrator | 8 → 13 | 13 → 27 |
| industrialist | 2 → 2 | 1 → 2 |
| aggressor | 9 → 17 | 12 → 12 |
| turtle | 17 → 28 | 17 → 21 |
| hoarder | 2 → 2 | 1 → 1 |
| joiner-y10 | 7 → 35 | 8 → 29 |
| joiner-y30 | — | — (y30–40: 5 → 25; y40–50: 0 → 27) |

Reading the b/r/f breakdown honestly: in years 10–30 the refit months
themselves are few (mono-expander 3 and 2; integrator 0 and 0; joiner-y10 10
and 9). Most of the cadence gain is research completions that the higher
refit-boosted income now affords, plus the joiners' faster ladder climb. The
refit content is front-loaded: a portfolio takes its Mark IIs in the decade
it matures and is then done until a Mark III gate opens (only the integrator
reaches one, in years 40–50, 9 buildings). **Verdict: Mark II fills the void
for the archetypes that were starved (mono-expander, both joiners) and
materially raises founder income (mono +$17M/month at y50, integrator
+$117M/month), but it is a one-decade burst, not a standing rung.** The
industrialist and hoarder — mining-heavy portfolios whose lines at the 0.4
extraction floor do not clear a 60-month refit payback — are untouched
(industrialist: 7 refits, all in years 0–10; hoarder: 0), so H3's mining-side
residual and H4 remain: the industrialist still stalls on `deep_drilling`
($8B) for 40 years in both runs. No constant changed here; the next lever
for those two is content (a mid-band mining rung or deposit), as Pass 5 said.

## 7. Inequality, concentration and tiers

Gini over book net worth across present archetypes (negatives clamped to
zero), and the top corporation's share of positive net worth:

| decade end | standard Gini / top-1 | refit-aware Gini / top-1 | Pass 5 |
|---|---:|---:|---:|
| y10 | 0.623 / 65% | 0.599 / 67% | 0.61 / 64% |
| y20 | 0.769 / 86% | 0.729 / 82% | 0.77 |
| y30 | 0.762 / 83% | 0.686 / 68% | 0.79 |
| y40 | 0.758 / 77% | 0.640 / 45% | 0.84 |
| y50 | 0.730 / 67% | 0.548 / 39% | 0.82 / 89% |

Tier concentration at year 50 (lifetime-earnings thresholds; T6/T7 not
modeled): standard — T5 ×1 (integrator), T4 ×2 (turtle, joiner-y10), T3 ×4,
T2 ×1 (joiner-y30); refit-aware — T5 ×1, T4 ×4 (mono-expander,
industrialist, turtle, joiner-y10), T3 ×3.

P&L distribution at year 50 (trailing-12-month net, standard run): −$718K,
$988K, $26.4M, $30.8M, $38.5M, $43.7M, $318.1M, $713.2M per month — a median
of $34.7M against a top of $713.2M. Refit-aware: $18.4M, $23.9M, $38.8M,
$52.1M, $94.4M, $329.1M, $481.0M, $829.8M — median $73.3M, every archetype
profitable.

## 8. The live world (2026-09-02)

Read from the public leaderboard and market endpoints after the 2026-09-02
÷360 rescale (see the dev-log post-mortem). Epoch 2 opened 2026-08-24.

| | |
|---|---|
| Corporations on the public leaderboard | **2** |
| #1 Tracking & Mission Services Consortium | net worth $373.75M, lifetime earned $695.88M, 11 buildings, 4 research, 9 services, 4 locations |
| #2 Cape Heritage Launch Systems | net worth $100.00M, lifetime earned $1.34M, 4 buildings, 0 research, 4 services, 3 locations |
| Median corporate net worth | $236.9M (mean of two) |
| Gini (same clamped formula as the sim) | 0.289 |
| Tier concentration (lifetime-earnings thresholds) | T2 ×1, T1 ×1 |
| Order-book fills, trailing 30 days | $59.38M traded value, 89 units, 5 participants — all five are NPC industrial corporations (stellar, frontier, nova, deep_space, helios). No player fill in the window. |
| NPC share of traded value | **100%** |
| Spot prices vs base (35 resources with a price row) | 34 of 35 within ±20%; lowest iron 95%, aluminum 96%, titanium 96%; highest rare_earth 125% |
| Alliances | none |

**Price stability of core commodities.** Live: the raw-material floor
(iron, aluminum, titanium) sits 4–5% below base after nine days of NPC
production; one component (rare_earth) is 25% above base. Sim: no organic
excursion beyond −10% in 50 years (iron 90% at y50, lunar_water 92%,
aluminum 94%); the only prices that move meaningfully are those under a
declared price campaign, which pin at the 30% band floor for the campaign
window and recover after it (refit-aware run: lunar_water at 30% at month
119 and 36% at month 359, back above 90% at every other snapshot).

**NPC market share.** The measured figure above is the public free tier of
`market-share.ts` (top participants by fill value, trailing 30 days). A
resource-by-resource share and the 90-day quarterly window need a database
read (`computeServerTradeSummary`, `getResourceShare`) and will be published
from the live database next quarter. **Two things were fixed on 2026-09-03**
(both were open when this report published): the share endpoint used to mark
the five `__NPC_CORP_*` industrial corporations `isNpc: false` (only the
market maker `__NPC_MARKET_MAKER__` was recognized) — it now uses one
canonical predicate (`npc-identity.ts`'s `isNpcProfileId`) shared by
`market-share.ts`, `market-orderbook.ts` and `flow-map.ts`, so every UI
reading the share endpoint labels NPC industrial volume as NPC, not
rival-player volume. And per-side shares used to sum to 200% of value
(buyer and seller each counted the full fill value against the
single-counted market total); `sharePct` is now computed against the
doubled trade-side total, so it sums to ~100% across participants. The
pre-fix reading survives as a separate field, `sideValuePct` — needed by at
least one real consumer (`corp-pacts-server.ts`'s non-aggression-pact
clause, calibrated to "holds 40% of traded value," not "holds 40% of
trade-side credit"), which was switched to it so the fix does not silently
change that pact's enforcement bar. **Does the measured NPC share above
change?** No — it is unchanged at **100%**. The fix only changes how value
is apportioned *among* participants; this window had zero player fills (all
five participants were NPC industrial corporations trading with each
other), so the player/NPC split — 0% player, 100% NPC — was never affected
by the per-participant double-counting bug.

**Faction balance — measured next quarter.** No public endpoint exposes
faction standings, and the sim does not model factions. Method: aggregate
per-faction reputation and standing counts across active profiles from the
profile store; publish the six-faction distribution and the share of
contracts by faction.

**New-player retention — measured next quarter.** With two corporations the
figure is not meaningful. Method: cohort of profiles created in the quarter
vs. profiles that synced in the following 7 and 30 days, from the profile
timestamps; published as a percentage with the cohort size.

**Starting-archetype fairness (idle coast).** `scripts/balance-archetypes.ts`,
100 games × 3 starting archetypes × 24 idle months on the month grid: median
net worth at month 24 — Cape Heritage $315.4M, Meridian Signals $288.0M
(−8.7%), Tracking Consortium $265.2M (−15.9%). Spread 15.9%, the runner's
"moderate" band; unchanged from its pre-unification reading by construction
(same 30-tick month).

## 9. What changed this quarter, and what we watch

**Shipped (all 2026-09-02, founder-approved; detail in docs/BALANCE.md):**

- **D1 clock unification** — one game clock; ticks-per-month derived from
  the 6 h calendar; offline operations on the same clock with overhead and
  executive compensation charged; a state-derived money plausibility ceiling
  with a $500K/s backstop. **D2 migration:** every balance divided by 360,
  no compensation (everyone scaled equally). **D3:** subscriber perks that
  touched starting money, build/research speed and offline hours removed.
- **D4 Mark-II/III refits** — in-place upgrades at 1.5x / 2.5x baseCost,
  1.6x / 2.4x own-line revenue, 2.2x / 3.6x maintenance; saturation still
  counts one unit; nine previously inert T3 techs gate Mark III.
- **D5 flagship economics** — upkeep floor 0.4%/month of baseCost above
  $20B, the 35 most expensive research nodes ÷10, eight flagship services
  retuned into a 120–240-month payback band at a 2.07x stack.
- **D6 population gates** — takeovers open at 10 active corporations (was
  25); slot auctions on relative occupancy; labor supply base ÷5.

**Watch list for Q4 (live telemetry, not sim):**

1. First flagship built in the live world and its realised payback (D5
   WATCH); whether anyone builds the three infrastructure flagships.
2. Refit uptake: share of eligible buildings at Mark II within 30 days of
   eligibility, and whether Mark III gates are researched.
3. Money supply: cumulative net minted per game-month across all profiles
   (the sim's refit-aware world mints +$28B over 50 years against ~$1.3T of
   flow — bounded, but positive in the last two decades where the standard
   world was negative).
4. Passive cash piles: corporations with no spend for 12+ game-months and
   growing net worth (the turtle's 36–44% sink coverage).
5. The labor index leaving the 0.80 floor at ~12 active corporations (D6),
   the first tender at 10, the first relative-occupancy slot auction.
6. Industrialist / mining-specialist stall (`deep_drilling` at $8B): the
   next content rung, not a repricing.
7. The "my income is frozen" risk: run-rate widgets now move every 6 hours.

**Balance-adjustment notice.** No balance constant was changed for this
report. Per policy, minor adjustments carry 7-day notice and major ones
30-day notice with community comment; none is pending.

## 10. Reproducing this report

```
npx tsx scripts/sim-50yr.ts            # §3a, §4, §5, §7 (standard)
npx tsx scripts/sim-50yr.ts --refit    # §3b, §6 (refit-aware)
npx tsx scripts/balance-archetypes.ts  # §8 starting-archetype spread
curl https://spacenexus.us/api/space-tycoon/leaderboard
curl https://spacenexus.us/api/space-tycoon/market
curl https://spacenexus.us/api/space-tycoon/market/share
```

Section 11 of each sim run prints the decade grid, the flagship table, the
concentration table and the Mark-level table exactly as used above.
