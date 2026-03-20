# Space Tycoon — Improvement Plan Based on Industry Research

**Date:** 2026-03-19
**Research Sources:** ExoMiner, Prosperous Universe, Galactic Tycoons, Idle Planet Miner, Space Company Simulator, Production Chain Tycoon, Rocket Star

---

## What We Have vs. What Top Games Have

| Feature | Space Tycoon | ExoMiner | Prosperous Universe | Galactic Tycoons |
|---------|-------------|----------|-------------------|-----------------|
| Building construction | ✅ 27 buildings | ✅ | ✅ | ✅ |
| Research tree | ✅ 37 techs, 9 branches | ✅ | ✅ | ✅ |
| Resource mining | ✅ 12 resources | ✅ 20+ ores | ✅ 50+ materials | ✅ |
| Market trading | ✅ Buy/sell | ❌ | ✅ Player-driven | ✅ Player-driven |
| NPC competitors | ✅ 10 NPCs | ❌ | ❌ (all players) | ❌ (all players) |
| Production chains | ⚠️ Basic refining | ✅ Smelt → Craft → Sell | ✅ Deep chains | ✅ Multi-step |
| Prestige/restart | ❌ None | ✅ Planet prestige | ❌ | ❌ |
| Worker management | ❌ None | ✅ Miners + managers | ✅ Workforce types | ✅ Staff |
| Ship/fleet | ❌ None | ❌ | ✅ Ship design + routes | ✅ |
| Offline income | ❌ None | ✅ Core feature | ✅ | ✅ |
| Weekly events | ❌ None | ✅ Tournaments | ❌ | ❌ |
| Achievements | ✅ 25 | ✅ | ❌ | ❌ |
| Contracts | ✅ 10 | ✅ Quests | ✅ Contracts | ✅ |
| Leaderboard | ✅ vs NPCs | ✅ Weekly | ✅ Rich rankings | ✅ |
| Sound/music | ✅ SFX + ambient | ✅ | ❌ | ❌ |
| Random events | ✅ 13 events | ❌ | ✅ Market events | ❌ |
| Building upgrades | ✅ 3 levels | ✅ | ✅ | ✅ |
| Visual map | ✅ 2D canvas | ❌ | ✅ Star map | ✅ Galaxy map |

---

## Priority Improvements (Ranked by Impact vs. Effort)

### TIER 1 — High Impact, Reasonable Effort

#### 1. Production Chains (Inspired by ExoMiner + Production Chain Tycoon)
**What:** Expand the refining system into proper multi-step production chains. Raw ore → Refined metal → Component → Product. Each step increases value.

**Example chain:**
```
Iron Ore → Steel Ingots → Structural Beams → Station Module Kit
(5,000/u)   (15,000/u)    (50,000/u)        (200,000/u)
```

**Why it matters:** Production Chain Tycoon's entire hook is "every upgrade affects the entire chain." Our refining system exists but it's disconnected from the build system. Making production chains the backbone of progression creates strategic depth without adding complexity — players still just click buttons, but they have to think about WHAT to produce.

**Implementation:**
- Expand `refining.ts` with 15-20 recipes organized into chains (not standalone)
- Add a "Refinery" tab or section within Market tab
- Chain visualization: show Iron → Steel → Beams with arrows
- Products required for Tier 3+ buildings (replace some money costs with product requirements)
- Higher-tier products sell for dramatically more on the market

#### 2. Offline Income (Inspired by ExoMiner, Idle Miner Tycoon)
**What:** When a player returns after being away, calculate and award income earned while offline. Show a "Welcome back! You earned $X while away" popup.

**Why it matters:** This is THE defining feature of idle games. Without it, players have no reason to come back — they must keep the tab open. With it, closing the browser becomes a positive experience ("I wonder how much I earned overnight").

**Implementation:**
- On game load, calculate `(Date.now() - lastTickAt) / tickInterval` = missed ticks
- Process revenue (not construction/research) for missed ticks
- Cap at 8 hours to prevent exploitation
- Show a "Welcome Back" modal with earnings breakdown
- Resource production also continues offline

#### 3. Workforce Management (Inspired by Prosperous Universe + Idle Miner)
**What:** Buildings require workers to operate. Hire workers (Engineers, Scientists, Miners, Operators) who provide productivity bonuses. Workers consume resources (food, supplies) creating a resource sink.

**Why it matters:** Prosperous Universe's core loop is "workers need consumables, so you must produce food/supplies, which requires workers, which need food..." This self-sustaining loop creates emergent complexity without adding many systems. For our game, a simplified version adds depth without overwhelming players.

**Simplified version for our game:**
- Each completed building has a "crew" slot (1-5 workers)
- Workers cost money per month (salary)
- Fully crewed buildings get +50% revenue
- Unstaffed buildings operate at 50% efficiency
- Worker types: Engineers (+build speed), Scientists (+research speed), Miners (+resource output), Operators (+service revenue)
- Hire from a "workforce pool" that grows over time

#### 4. Weekly Competitive Events (Inspired by ExoMiner tournaments)
**What:** Every 7 real-time days, a new competitive challenge starts. "Mine the most platinum this week." Players + NPCs compete. Winner gets a unique title and resource bonus.

**Why it matters:** Weekly events are the #1 retention mechanic in mobile idle games. They create recurring urgency and social comparison. ExoMiner's weekly tournaments are their primary retention driver.

**Implementation:**
- Extend `challenges.ts` to generate weekly events
- Track challenge progress for player + NPCs
- Challenge types: most resources mined, highest revenue, most buildings completed, fastest research
- Leaderboard sub-tab showing weekly challenge standings
- Winner gets a title badge displayed on their profile

### TIER 2 — Medium Impact, Moderate Effort

#### 5. Ship/Fleet System (Inspired by Interstellar Transport Company)
**What:** Build transport ships that carry resources between locations. Ships take real time to travel (based on distance). Cargo capacity limits how much you can move.

**Why it matters:** Currently resources just appear in a global inventory regardless of where they're mined. Adding transport creates strategic decisions: "Do I sell Mars water on Mars (low price, instant) or ship it to Earth orbit (high price, 8-month travel)?"

**Simplified version:**
- 3-4 ship types (Shuttle, Freighter, Heavy Transport, Interplanetary Cruiser)
- Ships cost money + resources to build
- Assign a ship to a route (e.g., Moon → LEO)
- Travel time based on real distance (simplified: 1 min for nearby, 10 min for Mars, 30 min for Jupiter)
- Ships carry X units of cargo per trip
- Auto-repeat routes once assigned

#### 6. Prestige System (Inspired by ExoMiner + Idle Miner Tycoon)
**What:** Once a player reaches a certain milestone (e.g., all locations unlocked or $1T net worth), they can "prestige" — restart the game with permanent multipliers. Each prestige makes the next run faster.

**Why it matters:** Prestige extends the game's lifespan infinitely. Without it, once a player unlocks everything, there's nothing left to do. With it, there's always "one more run."

**Implementation:**
- Prestige available after unlocking all 11 locations
- On prestige: reset money, buildings, research, locations to starting state
- Permanent bonus: +10% revenue per prestige level, +5% build speed, +5% research speed
- Prestige counter displayed on leaderboard (creates "who has the most prestiges" competition)
- Prestige currency: "Legacy Points" that can buy permanent upgrades
- Visual prestige star/badge on player profile

#### 7. Dynamic Market Events (Inspired by Prosperous Universe)
**What:** Market-wide events that shift prices temporarily. "Earth Demand Surge: Titanium prices +40% for 48 hours." "Asteroid Supply Glut: Iron prices -30% for 24 hours."

**Why it matters:** Creates trading opportunities and reactive gameplay. Players who check the market regularly can buy low/sell high. NPCs also react to these events (buying during dips, selling during surges).

**Implementation:**
- Market events fire every 2-4 hours (real time)
- 10-15 event types affecting different resource categories
- Events shown as banners in the Market tab
- Price modifiers applied on top of supply/demand
- NPC trading behavior adjusts during events
- Push notification: "Market Alert: Platinum prices surging +50%!"

### TIER 3 — Nice to Have, Lower Priority

#### 8. Alliances/Guilds (Inspired by Galactic Tycoons)
**What:** Players can form alliances, share resources, and compete as groups against other alliances.

**Why it matters:** Social features are the strongest retention mechanism in multiplayer games. However, this requires a critical mass of players to be meaningful.

**Status:** Defer until player base grows. Design the database schema now but don't build the UI yet.

#### 9. Reputation System (Inspired by Prosperous Universe)
**What:** Each NPC and player has a reputation score. Completing contracts, fulfilling trade agreements, and making market trades builds reputation. High reputation unlocks better contract rates, market fee discounts, and priority access to rare resources.

#### 10. Seasonal Content (Inspired by ExoMiner events)
**What:** Themed events tied to real space events. When a real SpaceX launch happens, an in-game event gives bonus XP/resources for launch-related activities. Ties the game directly to SpaceNexus's real-time data.

#### 11. Base Layout/Design (Inspired by Factorio)
**What:** Visual base layout where players arrange buildings on a grid. Adjacency bonuses: placing a solar farm next to a data center gives +10% power efficiency.

**Status:** Very cool but high effort. Defer to post-MVP.

---

## Realistic Space Business Types to Add

Based on real space economy research, these business types should be available in the game:

| Business Type | Revenue Source | Currently In Game? |
|--------------|---------------|-------------------|
| Launch services | Per-kg payload delivery | ✅ Yes |
| Satellite broadband (Starlink-style) | Monthly subscribers | ✅ Telecom service |
| Earth observation / imagery | Per-image / subscription | ✅ Sensor service |
| GPS / navigation | Government + commercial licensing | ❌ Add as service |
| Space tourism | Per-seat tickets | ✅ Tourism service |
| In-orbit manufacturing | Zero-G products (fiber, pharma) | ✅ Fabrication |
| Space data centers | AI compute per-hour | ✅ AI datacenter |
| Propellant depot (fuel station) | Per-kg fuel sales | ❌ Add — key cislunar business |
| Debris removal | Per-object contracts | ❌ Add — growing real market |
| Space insurance | Premium per-mission | ❌ Add — profitable passive income |
| Spectrum licensing | Annual fees from orbital slots | ❌ Add — ties to real business |
| Space advertising | Billboard satellites, sponsorships | ❌ Fun niche addition |
| Asteroid surveying | Sell prospecting data | ❌ Add — precursor to mining |

### Recommended additions (6 new service types):
1. **Propellant Depot** — Sell rocket fuel made from water. Requires water mining + refining. High-margin business.
2. **Debris Removal** — Contract-based income. Requires orbital operations research. Grows as more satellites are deployed.
3. **Navigation Services** — GPS-style service. Requires MEO satellite constellation. Steady government revenue.
4. **Space Insurance** — Passive income that scales with total industry activity. Requires actuarial research.
5. **Asteroid Survey** — Sell prospecting data to other companies. Precursor to mining. Low cost, moderate revenue.
6. **Propellant Brokerage** — Buy cheap fuel from Moon, sell expensive fuel at Mars/Jupiter. Requires ships.

---

## Implementation Roadmap

### Phase 1: Core Engagement Loop (1-2 weeks)
1. ✅ Production chains (expand refining into proper chains)
2. ✅ Offline income ("Welcome back" popup)
3. ✅ Weekly competitive events

### Phase 2: Strategic Depth (2-3 weeks)
4. ✅ Simplified workforce management
5. ✅ 6 new service types (propellant depot, debris removal, etc.)
6. ✅ Dynamic market events
7. ✅ Ship/fleet system (simplified)

### Phase 3: Long-Term Engagement (3-4 weeks)
8. ✅ Prestige system
9. ✅ Reputation system
10. ✅ Seasonal content tied to real launches
11. ✅ Alliance system (schema only, UI later)

---

## Key Design Principles

Based on research across all reference games:

1. **"UI IS the game"** — Prosperous Universe's developer says this explicitly. Since our game is browser-based, every UI decision IS a game design decision. Spreadsheet-style data is fine if it's beautiful and interactive.

2. **Progressive disclosure** — ExoMiner starts with one planet and one mine. Complexity is revealed gradually. Don't show all 12 resources on day 1. Show iron and water first, unlock others through research.

3. **Idle income is non-negotiable** — Every successful idle game generates income offline. Players should WANT to close the browser because they know they're earning while away.

4. **Production chains create depth, not buttons** — The depth doesn't come from having more things to click. It comes from interconnected systems where changing one variable ripples through others. If I mine more iron, I can smelt more steel, which lets me build more stations, which need more workers, which need more food...

5. **Competition drives retention** — Weekly events, "first to" milestones, and leaderboards are the top 3 retention mechanisms across all researched games. Make competition visible and rewarding.

6. **Semi-realistic is the sweet spot** — Players want to feel like they're running a "real" space company, but they don't want orbital mechanics homework. Use real terminology, real resource names, and plausible business models, but simplify the numbers for fun.

---

## Sources

- [ExoMiner Guide](https://mobilegamershq.com/exominer-idle-miner-guide/) — Prestige, crafting, progression
- [Prosperous Universe](https://prosperousuniverse.com/) — Player-driven economy, production chains, "UI is the game"
- [Galactic Tycoons](https://galactictycoons.com/) — Browser-based multiplayer space economy
- [Space Company Simulator](https://store.steampowered.com/app/923970/Space_Company_Simulator/) — Realistic space company management
- [Idle Planet Miner](https://idle-planet-miner.fandom.com/wiki/Strategy_Guide) — Planet progression, smelting, selling
- [Production Chain Tycoon](https://www.cityparkgames.com/games/production-chain-tycoon) — Chain optimization mechanics
- [Interstellar Transport Company](https://store.steampowered.com/app/573490/Interstellar_Transport_Company/) — Ship routes, logistics
- [Prosperous Universe Retention Discussion](https://com.prosperousuniverse.com/t/player-retention-and-the-disappearing-economy/4775)
- [80.lv Space Economy Simulation](https://80.lv/articles/space-economy-simulation-ui-is-the-game) — UI design philosophy
- [Best Idle Games 2026](https://www.blog.udonis.co/mobile-marketing/mobile-games/best-idle-games) — Market trends
- [Idle Games Design Guide](https://apptrove.com/a-guide-to-idle-games/) — Retention mechanics
