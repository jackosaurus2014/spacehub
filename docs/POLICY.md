# Space Tycoon — Policy Documents

This file collects the public-facing, load-bearing policies for Space Tycoon. These are not internal guidelines — players can and should be able to read them. The community's trust depends on these being explicit and honored.

---

## No Pay-to-Win

**Core principle:** Real money can buy convenience, personalization, and support. Real money can never buy competitive economic advantage.

### What real money CAN buy

- **Cosmetic items** — commander portraits, faction-themed UI skins, custom corporation emblems, ship paint jobs, profile flair
- **Additional save slots** — for players who want multiple characters or scenario loadouts
- **Reasonable convenience boosts beyond the free tier** — for example, one extra concurrent construction slot above the free cap, or a second research queue beyond the free cap. Always bounded; never unlimited.
- **Off-session notifications** — push alerts when time-sensitive events need player attention
- **Premium UI themes** — OLED-friendly palettes, custom dashboard layouts, advanced market-chart features
- **Subscription tier** (Pro / Enterprise) — unlocks ad-free browsing, higher API quotas on the SpaceNexus platform side, dashboard builder access, higher notification allotments
- **Branded / sponsored content** — officially-licensed cosmetics from real-world space companies are acceptable

### What real money CANNOT buy

- **Resources, money, cargo, or inventory** of any kind
- **Research acceleration** — no paid speedup of active research. The single free construction/research slot expansion per subscription tier is an up-front infrastructure perk, not an instant-finish button.
- **Construction acceleration** — same as above. Paid tier unlocks one extra *slot*; it does not accelerate an active build.
- **Commander hires or specific commanders** — the recruitment pool is identical for free and paid players. Paid players cannot pay-to-hire legendaries or skip the rarity rolls.
- **Faction reputation** — envoy costs are the same; no paid rep shortcuts
- **Competitive contract access** — contract pools are identical; no exclusive paid tiers for contracts
- **Market intelligence beyond the free tier** — if paid tiers offer more intelligence, it is about convenience (alerts, historical range, export) and never information that competitive players cannot earn
- **Alliance / corporate advantages** — premium players get no voting weight, leadership priority, or alliance-tier bonuses beyond what free players can earn

### Lockboxes and randomized purchases

- **Randomized cosmetic purchases are permitted** if and only if the randomization space is public, the odds of each outcome are posted in the UI before purchase, and none of the outcomes affect gameplay balance.
- **Randomized purchases that yield competitive items are forbidden.** This includes "chance to get a rare commander," "chance to get extra resources," "chance to get research points," or anything similar.

### Sponsored content

Real-world space companies may sponsor in-game faction skins, commander personas, ship liveries, or themed events. Such sponsorship:

- Must be disclosed publicly when launched
- Must grant no mechanical edge
- Must not override the no-P2W rules above
- Must not alter existing faction lore in ways the sponsor can veto — canonical story is not for sale

### Enforcement and review

- The paid-tier feature list is published in-app and at spacenexus.us
- Any change to what paid tiers grant is announced at least 14 days before taking effect, with community comment period
- Annual public review of the no-P2W policy with transparent sourcing on what was considered and why the current lines were drawn

---

## Simulation Integrity

**Core principle:** The economy is the game. Exploits, dupes, and real-money trading corrupt the core experience. We take this seriously from day one.

### Exploit response playbook

When a potential economic exploit is reported, suspected from anomaly detection, or discovered internally:

1. **Triage (within 2 hours for P0, 24 hours for P1, 72 hours for P2).**
   - **P0** — exploit is trivially reproducible and affects large player populations or the global economy
   - **P1** — exploit is reproducible but affects only individual players or is self-limiting
   - **P2** — minor inconsistency or suspected issue without confirmation

2. **Contain.**
   - Feature flag or hotfix to disable the exploit path
   - For P0: may temporarily disable a feature for all users while a patch is prepared

3. **Rollback (P0 only, time-boxed).**
   - If the exploit produced economic gains large enough to distort the game state, relevant transactions may be rolled back within a **72-hour window** from the exploit's first use
   - Rollbacks are announced publicly before execution
   - Beyond the 72-hour window, rollbacks are not performed — damage is compensated through balance adjustments, NPC economic intervention, or, in extreme cases, a partial shard reset with community approval

4. **Differentiate accidental vs deliberate exploitation.**
   - Players who stumbled into an exploit and did not propagate it are not punished; their gains may still be rolled back
   - Players who deliberately farmed an exploit, shared methods publicly, or monetized exploits are subject to bans
   - Intent is judged on volume, pattern, and communication evidence — not on a single transaction

5. **Public post-mortem within 14 days.**
   - What happened
   - How it was found
   - What was rolled back, if anything
   - What changed to prevent recurrence
   - Any known remaining risk

### Real-money trading (RMT)

RMT — buying or selling in-game resources, currency, accounts, or services for real money outside the official in-app store — is prohibited and actively detected.

- Pattern detection runs continuously on market activity, with thresholds set conservatively to minimize false positives
- Confirmed RMT sellers are banned; their corporations' assets are liquidated into the NPC economy
- Confirmed RMT buyers are warned for first offenses, suspended for repeats
- Third-party RMT marketplaces are reported to the platforms that host them

### Anti-cheat

- **Client-side state is never trusted.** The server validates every economic transition. Clients submit intents; servers compute outcomes.
- **Rate limits** on all economic endpoints, scaled to plausible human activity
- **Anomaly detection** on per-player P&L, resource acquisition rate, and transaction patterns
- **Bug bounties** — security researchers who report exploits responsibly receive in-game cosmetic rewards and public acknowledgment

### Balance review cadence

- **Quarterly published economic health report** — median corp net worth, inequality (Gini), price stability of core commodities, faction balance, new-player retention, P&L distribution. Public chart dashboards.
- **Minor balance adjustments** may happen any time with 7-day notice
- **Major balance adjustments** (changing core formulas or removing content) require 30-day notice and community comment

### Escrow and transaction reversibility

For large player-to-player transactions (see `Diplomacy` system design):

- Large-value contracts default to **escrow** — funds and goods held by the SCC (in-fiction) until both parties confirm delivery
- Escrowed transactions are reversible within a defined window if either party disputes
- Dispute resolution uses the in-game **Spacefaring Commerce Court** arbitration system (automated for clear cases, staff-reviewed for ambiguous ones)

### What players can count on

- The game is not pay-to-win. Real money buys convenience, not competitive edge.
- If a major exploit happens, we fix it, tell you everything, and where possible we undo the damage.
- Your data is yours. You can export it, delete it, and see exactly what the game knows about you.
- The economy is continuously monitored. You can read our quarterly health report.
- If you find an exploit, report it. Don't farm it. We'll reward the report.

---

## Ship Visibility

Space is a shared place, and the map shows it honestly.

- **Every ship in the solar system is visible to every player** — including other corporations' ships. On the map they appear as anonymised **contacts**: a hull class ("Freighter", "Mining ship"), the lane or location they are on, and their progress along it. Nothing else.
- **Identity is earned, never free.** A contact's corporation, cargo and destination are shown only to players who hold an active fleet reveal on that corporation — a successful *Fleet Tracking* mission (7 game-months) or *Trade Route Intercept* (4 game-months) from the espionage system. When the reveal expires, the contact goes anonymous again.
- **Contacts cannot be tracked across days.** Contact identifiers rotate every UTC day and never contain a ship or account identifier, so a watcher cannot build a history of a specific hull without paying for the reveal each window.
- **Your own ships are never in anyone's feed as identified hulls** without that reveal. Being tracked is visible to you the same way any espionage is — detected missions show in your counter-intelligence log.
- **NPC faction traffic** is drawn on the same layer and always labelled as NPC.
- **Seeing is not touching.** Contacts are information. There is no combat, interception or blockade mechanic against another player's ship — the "No Combat" rule of the design brief applies to the traffic layer exactly as everywhere else.

Real money never buys a reveal, a longer reveal, or a way to hide your ships.

---

## Asteroid Claims

A claim is exclusive extraction rights on one surveyed rock. It is a filed, on-ledger right, and the rules are the same for everyone.

- **You stake what you have seen.** Only a rock your corporation has surveyed can be claimed. The stake fee scales with what is in the ground (grade × reserve × ore price × 3%, minimum $1M) and is burned; a monthly upkeep of 10% of the fee keeps it alive.
- **Exclusive means exclusive.** Nobody else can mine a rock under your claim. Anyone can still survey it. Rocks nobody has claimed are open to every corporation — and crowded rocks yield less to each (extraction pressure).
- **Use it or lose it.** A claim lapses after **three game-months unworked**. Every completed mining order of yours on the rock resets the clock. The Outliner warns you one game-month before it lapses.
- **The only ways to lose a claim are your own or the rock's:** it lapses unworked, its upkeep goes unpaid, the rock is exhausted, or you release it. **No other player can take, jump, contest or damage a claim.** Ever.
- **Claims are public.** Every active claim appears in the claim feed with the holding corporation's name, when it was staked, when it was last worked and when it lapses. What the feed never shows: the fee paid, the upkeep state, or what the holder is extracting — that intelligence stays earned through espionage.
- **Caps grow with your corporation** (1 claim at tier 1 up to 12 at tier 7). Real money never buys a claim, a bigger cap, a longer expiry or a place in the feed.

---

## Security Ships

Space Tycoon has NPC pirates (the Void Corsairs) who shake down ore runs on the belt and outer-system lanes. It has **no player-versus-player combat** and never will.

- **The Escort Cutter is a security ship, not a warship.** Assigned to a mining order, or stationed at a field, it reduces the odds that the Corsairs shake down *your own corporation's* ore run. That is its entire effect.
- **It cannot be pointed at another player.** There is no target, no intercept, no blockade and no order that acts on another corporation's ships, claims or cargo. A security hull that is not covering your own run does nothing.
- **Shakedowns are NPC, transparent and bounded.** The odds per lane are published in the game (and in `docs/BALANCE.md`), the roll is fixed per order so it cannot be re-rolled, a hit takes a share of the ore aboard and never the hull or the crew, and the Protected Frontier is exempt.
- **Nothing here is for sale.** Real money buys no cover, no lower odds and no immunity.

---

## Data and Privacy

Space Tycoon stores per-player game state, chat messages (if you participate in corporate or alliance chat), and basic account information.

- **Export:** Every player can download their complete game state as JSON from account settings
- **Delete:** Every player can delete their account and all associated game state. Deletion is permanent after a 30-day grace period.
- **No selling.** We do not sell player data. We do not sell chat contents. We do not sell market behavior. Ever.
- **Telemetry:** Aggregate anonymized telemetry is collected for balance analysis. Individual players cannot be re-identified from aggregate data.
- **Ads:** Non-paying players see ads on the broader SpaceNexus platform. Ads do not target based on Space Tycoon behavior. The game itself is ad-free.

---

## Updates to this document

This policy is versioned. Changes are announced publicly 14 days before taking effect. The full history of versions is retained at `/docs/policy-history/` so players can see how the rules have evolved.
