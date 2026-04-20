# Space Tycoon — Session Design and Time-Horizon Audit

Complement to the "Session design and time horizons" principle in [CLAUDE.md](../CLAUDE.md).
Every feature in Space Tycoon should live on a specific time loop — **tactical, daily, weekly, monthly, or campaign**. Flattening everything to a single cadence destroys the game's texture.

This document maps the current feature set to its intended loop and flags features that may be mis-cadenced.

Last audit: **2026-04-19.**

---

## Legend

- **Tactical** — seconds to minutes. Done within an active session.
- **Daily** — refreshes roughly every 24 hours. Designed to pull the player back once a day.
- **Weekly** — refreshes or resolves on a roughly 7-day cycle. Designed for committed players.
- **Monthly / Quarterly** — resolves over ~30-90 day spans. The strategic horizon.
- **Campaign** — multi-month or longer. Generational corporate growth, interstellar expansion, legacy milestones.

---

## Current feature map

### Tactical loops (seconds–minutes)
- **Market buy/sell orders** — `MarketPanel.tsx`, `/api/space-tycoon/market/*`. Instant trades at current prices.
- **Building construction (Tier 1)** — 3-5 minute real-time builds. In dev, accelerated 100× via `DEV_FAST_MULTIPLIER`.
- **Research (Tier 1)** — ~10 minute real-time. Tiers 2-3 cross into Daily.
- **Ship dispatch** (`FleetPanel.tsx`) — click to move a ship on a route.
- **Contract bidding / bounty acceptance** — pick up work from the pool.
- **Mini-activities** — 4-slot rotation of quick objectives (`MiniActivitiesWidget.tsx`).
- **Event choice modals** — respond to random events within a session.
- **Crafting** — small output jobs finish within minutes.

### Daily loops (~24h)
- **Contract pool refresh** — `lastContractRefresh` in `GameState`. New procurement contracts daily.
- **Daily challenges** — `DailyBonusModal.tsx`, faction events.
- **Daily reward / login bonus** — already present.
- **Commander recruitment pool refresh** — every 8h (sub-daily), deterministic seed.
- **Workforce payroll** — monthly in game-time, but effectively a daily outlay at typical tick speeds.
- **Building / research completions** at Tier 2-3 (~30 min – 4 h).

### Weekly loops (~7 days)
- **Season pass progression** — `seasonal-events.ts`, 28-day seasons with daily challenges rolling up.
- **League standings** — `LeaguePanel.tsx`, `/api/space-tycoon/leagues`.
- **Timed competitive events** — spawned on ~weekly cadence, daily-range deadlines.
- **Alliance elections / rotations** — weekly schedule.

### Monthly / Quarterly loops
- **Corporate tier progression** — tiers unlock over weeks to months of committed play.
- **Research completion at top tiers** — Tier 4-5 research takes ~24h real-time; completing the full tree is a multi-week effort.
- **Megaprojects** — multi-phase, each phase runs for days to weeks.
- **Mega-structures** — the longest-running player-driven projects. Intentionally campaign-scale.
- **Corporate quarterly reports** *(planned — Phase D roadmap)* — public summaries of corporate growth.

### Campaign loops (multi-month to years)
- **Prestige / Legacy system** — `legacy-system.ts`, permanent bonuses across resets.
- **Interstellar expansion** *(end-game, not yet implemented)* — per CLAUDE.md the eventual cap.
- **Corporate eras** *(planned)* — generational corporate narrative beats.
- **Faction realignment** *(planned)* — major political shifts that happen infrequently.

---

## Observations (where features may be mis-cadenced)

### 🟡 Seasons are weekly but progression scales sub-daily
Daily challenges refresh within a 28-day season; Season Points accumulate fast. Players can max a season in under a week of focused play. Consider extending SP pacing so a 28-day season requires ~28 days of steady engagement for most brackets, with speedruns still viable but not dominant.

### 🟡 Corporate tier gates daily features (market, workforce) behind hours of play
Tier 3 unlocks Market, Workforce, Crafting, Commanders, Analytics — the backbone of the economic game. The tier-3 requirement ($5B earned, 12 buildings, 8 research, 5 locations) takes 2-4 hours of engaged play at normal speed. Accessibility tradeoff vs. progression feel. Revisit once on-ramp data is available.

### 🟢 Contracts are appropriately Daily
Contract pool refresh daily is the right loop — gives logged-in players a reason to check in once a day without forcing them to stay logged in to grind.

### 🟢 Mini-activities are correctly Tactical
Rotating 4 slots of quick-win objectives scratches the micro-loop itch without bloating the roster.

### 🔴 No current Monthly/Quarterly corporate milestone
The gap between weekly (seasons, leagues) and multi-month (mega-structures, prestige) is empty. Corporate quarterly reports (planned) should fill this — a clear 30-day measurement point.

### 🔴 No Campaign-scale milestones pre-interstellar
Once a player hits tier 7 and near-complete research, there's little left to pursue until interstellar ships. Consider adding corporate-era milestones — "Century of the Dominion", "First Trillion-Dollar Decade" — that require sustained multi-month engagement.

### 🟢 Commander pool refresh (8h) is a smart sub-daily nudge
Not quite Daily, not quite Tactical. Gives players a reason to check back twice a day without being oppressive.

---

## Audit rules for new features

When proposing a new feature, answer:

1. **Which primary loop does it live on?** (pick one)
2. **What does the player do first time they encounter it?** (tactical action)
3. **What brings them back tomorrow?** (daily hook — if applicable)
4. **What matures in a week?** (weekly payoff — if applicable)
5. **What matures in a quarter?** (monthly / quarterly payoff — if applicable)
6. **Is this loop already oversubscribed?** (if we have 4 daily loops and 0 monthly, prefer monthly)

Features that cannot honestly answer (1) are probably content, not features — they should be scoped into an existing loop or rejected.

---

## Planned additions by target loop

Each major planned feature from CLAUDE.md, mapped to its intended loop:

| Feature | Target loop | Rationale |
|---|---|---|
| Player-to-player binding contracts (Diplomacy) | Daily to Weekly | Offers posted, matured over days; defaults resolve on deadline |
| Public diplomatic feed | Daily | Live chronological feed of negotiations + defaults |
| Shipping lane infrastructure | Campaign | Investments pay off over weeks of repeated route use |
| Chokepoint control | Weekly | Contested locations; influence shifts weekly |
| Corporate quarterly reports | Monthly | Automatic public readouts every 30 in-game days |
| Protected Frontier | One-time (per player) | First ~30 days of real play; graduates at net-worth threshold |
| Mentorship program | Campaign | Veteran earns XP from mentee growth over weeks |
| Faction realignment events | Quarterly | Major political shifts every 3 months |
| Exploit post-mortems | As-needed | Triggered by incident, not scheduled |
| Balance health report | Quarterly | Public Gini / price stability / tier distribution |
| Interstellar expansion | Campaign (end-game) | Cap on the solar-system era |

---

## Session Experience Checklist (QA reference)

For each tier of player, can they make meaningful progress on:

- Their **tactical loop** in a 5-minute session?
- Their **daily loop** in a 15-minute session?
- Their **weekly loop** in a ~3-hour commitment across the week?
- Their **monthly loop** in some observable way by logging in weekly?
- Their **campaign loop** across months of on-and-off engagement?

If the answer to any of these is "no," the relevant loop is under-served.
