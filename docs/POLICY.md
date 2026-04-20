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
