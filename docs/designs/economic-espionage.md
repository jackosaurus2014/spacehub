# Economic Espionage (Soft PvP) -- Implementation Design

**System**: Space Tycoon -- Async Multiplayer Space Industry Tycoon
**Status**: Design Document (Research Only)
**Date**: 2026-03-23

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Espionage Action Types](#2-espionage-action-types)
3. [Intelligence Gathering](#3-intelligence-gathering)
4. [Corporate Security System](#4-corporate-security-system)
5. [Employee Loyalty Mechanics](#5-employee-loyalty-mechanics)
6. [Success/Failure Probability Formulas](#6-successfailure-probability-formulas)
7. [Cooldowns and Limits](#7-cooldowns-and-limits)
8. [Counter-Espionage](#8-counter-espionage)
9. [Rewards for Successful Espionage](#9-rewards-for-successful-espionage)
10. [Impact on Target](#10-impact-on-target-soft-pvp-guarantee)
11. [Espionage Tech Tree](#11-espionage-tech-tree)
12. [Alliance Espionage](#12-alliance-espionage)
13. [Database Schema](#13-database-schema-prisma-models)
14. [API Endpoints](#14-api-endpoints)
15. [UI Design](#15-ui-design)
16. [Notification System](#16-notification-system)
17. [Implementation Phases](#17-implementation-phases)

---

## 1. Design Philosophy

### Core Principle: NEVER Take Things Away

Espionage in Space Tycoon is strictly **information warfare**. A successful espionage action gives the attacker **advantages** (intel bonuses, market insights, timing advantages) but **never** damages the target's buildings, removes their money, steals their resources, cancels their contracts, or degrades their facilities. The target experiences at most a *temporary information disadvantage* -- never a material loss.

This is soft PvP: the knife is knowledge, not destruction.

### Why Espionage Fits Space Tycoon

The game already has:
- **Market trading** with supply/demand mechanics -- knowing a rival's stockpile or sell plans is hugely valuable
- **Competitive contracts** where first-movers win -- knowing a rival's progress lets you prioritize
- **Alliance warfare** over colony claims -- intelligence about alliance strength changes outcomes
- **Research trees** with 300+ options -- knowing a rival's research path reveals their strategy
- **Workforce** with hiring costs -- poaching workers is a natural competitive lever

### Bracket Targeting Rules

Players are classified into brackets by **net worth** (the `netWorth` field on `GameProfile`):

| Bracket | Net Worth Range | Bracket ID |
|---------|----------------|------------|
| Startup | < $500M | 0 |
| LEO Ops | $500M -- $5B | 1 |
| Interplanetary | $5B -- $50B | 2 |
| Deep Space | $50B+ | 3 |

**Targeting rule**: You may only target players whose bracket ID is within 1 of your own. A LEO Ops player (bracket 1) can target Startup (0) or Interplanetary (2) players, but not Deep Space (3).

**Daily cap**: Maximum 3 espionage actions per 24-hour period (real-time, resets at midnight UTC).

---

## 2. Espionage Action Types

### 2.1 Market Reconnaissance

**What it does**: Reveals a target's current resource stockpile and their last 5 market buy/sell orders.

| Property | Value |
|----------|-------|
| ID | `esp_market_recon` |
| Cost | $5M + (bracket * $10M) |
| Base Success Rate | 75% |
| Cooldown | 4 hours per target |
| Unlock | Available by default |
| Intel Duration | 24 hours |

**Reward on success**: You see the target's exact `resources` inventory and their recent `MarketOrder` records (type, resource, quantity, price). This lets you predict their market moves -- if they are hoarding titanium, you can buy first.

**On failure**: Your agent returns empty-handed. The target may be notified (see counter-espionage).

---

### 2.2 Research Probe

**What it does**: Reveals the target's completed research list, their currently active research, and progress percentage.

| Property | Value |
|----------|-------|
| ID | `esp_research_probe` |
| Cost | $8M + (bracket * $15M) |
| Base Success Rate | 70% |
| Cooldown | 6 hours per target |
| Unlock | Research: `signals_intelligence` (tier 1 espionage) |
| Intel Duration | 48 hours |

**Reward on success**: Full `completedResearch[]` list plus `activeResearch` definition ID and real-time progress (% complete). Reveals the rival's strategic direction. If they are researching `nuclear_thermal`, you know they are heading to Jupiter next.

---

### 2.3 Facility Survey

**What it does**: Reveals all buildings at a specific target location, including building types, upgrade levels, and completion status.

| Property | Value |
|----------|-------|
| ID | `esp_facility_survey` |
| Cost | $10M + (bracket * $20M) |
| Base Success Rate | 65% |
| Cooldown | 8 hours per target |
| Unlock | Research: `signals_intelligence` |
| Intel Duration | 48 hours |

**Reward on success**: Full `buildingsData` for the specified location, including upgrade levels and under-construction buildings. Reveals the rival's infrastructure investment. You specify which of the target's unlocked locations to survey when launching the action.

---

### 2.4 Contract Intelligence

**What it does**: Reveals which competitive contracts the target is pursuing and their current progress toward requirements.

| Property | Value |
|----------|-------|
| ID | `esp_contract_intel` |
| Cost | $12M + (bracket * $25M) |
| Base Success Rate | 60% |
| Cooldown | 12 hours per target |
| Unlock | Research: `corporate_infiltration` (tier 2 espionage) |
| Intel Duration | 24 hours |

**Reward on success**: Reveals `activeContracts[]` and progress percentages. If a rival is 90% done with a competitive contract you also want, you know to pivot or accelerate. Critical for competitive contract races.

---

### 2.5 Workforce Headhunting

**What it does**: Reveals the target's entire workforce composition AND gives you a one-time discount on your next hire.

| Property | Value |
|----------|-------|
| ID | `esp_headhunting` |
| Cost | $15M + (bracket * $15M) |
| Base Success Rate | 55% |
| Cooldown | 24 hours per target |
| Unlock | Research: `talent_acquisition` (tier 2 espionage) |
| Intel Duration | 72 hours |

**Reward on success**: Full `workforceData` (engineers, scientists, miners, operators counts). Additionally, you receive a **Headhunting Voucher**: your next hire costs 50% less (the signing bonus is halved). This represents your agent finding candidates through research about the rival's team structure. The target does NOT lose any employees.

---

### 2.6 Fleet Tracking

**What it does**: Reveals all of the target's ships -- positions, cargo, routes, mining operations.

| Property | Value |
|----------|-------|
| ID | `esp_fleet_tracking` |
| Cost | $20M + (bracket * $30M) |
| Base Success Rate | 50% |
| Cooldown | 12 hours per target |
| Unlock | Research: `deep_space_surveillance` (tier 3 espionage) |
| Intel Duration | 24 hours |

**Reward on success**: Full `shipsData` including routes (from/to), cargo manifests, and mining operation targets. If a rival has 3 cargo ships headed to Titan with titanium, you know the Titan market is about to get flooded.

---

### 2.7 Alliance Dossier

**What it does**: Reveals the target alliance's full membership list, individual member net worths, shared facilities, and total alliance bonuses.

| Property | Value |
|----------|-------|
| ID | `esp_alliance_dossier` |
| Cost | $50M + (bracket * $50M) |
| Base Success Rate | 40% |
| Cooldown | 48 hours per alliance |
| Unlock | Research: `counterintelligence_ops` (tier 3 espionage) |
| Intel Duration | 72 hours |

**Reward on success**: Full alliance membership with roles, individual net worths, and shared facility data. Reveals which member is the weakest link and where the alliance's resources are concentrated.

---

### 2.8 Trade Route Intercept

**What it does**: Reveals all active resource bounties posted by the target AND gives you a temporary 10% market fee discount on resources they are trading.

| Property | Value |
|----------|-------|
| ID | `esp_trade_intercept` |
| Cost | $8M + (bracket * $12M) |
| Base Success Rate | 70% |
| Cooldown | 6 hours per target |
| Unlock | Research: `signals_intelligence` |
| Intel Duration | 24 hours |

**Reward on success**: See all open bounties posted by the target (resource, quantity, price-per-unit). Plus a 10% discount on your own market orders for the same resources for 24 hours. This represents your agents finding better deals through the intel they gathered.

---

### 2.9 Strategic Assessment

**What it does**: Generates a comprehensive intelligence report combining multiple data points about the target. The most expensive single-action espionage operation.

| Property | Value |
|----------|-------|
| ID | `esp_strategic_assessment` |
| Cost | $100M + (bracket * $100M) |
| Base Success Rate | 35% |
| Cooldown | 72 hours per target |
| Unlock | Research: `intelligence_directorate` (tier 4 espionage) |
| Intel Duration | 96 hours |

**Reward on success**: Combined intelligence report including:
- Net worth breakdown (money, resource values, building values)
- Top 3 revenue-generating services and their monthly income
- Research completion percentage by category
- Number of colony claims
- Alliance contribution share
- Estimated monthly income and burn rate

This is the "full picture" operation. It reveals the rival's strengths and weaknesses at a strategic level.

---

### 2.10 Disinformation Campaign

**What it does**: Plants false information in the target's market view. For 24 hours, the target sees slightly altered market prices (within +/-8%) in their UI. The real prices are unchanged; only their display is affected.

| Property | Value |
|----------|-------|
| ID | `esp_disinformation` |
| Cost | $25M + (bracket * $40M) |
| Base Success Rate | 45% |
| Cooldown | 48 hours per target |
| Unlock | Research: `psychological_operations` (tier 3 espionage) |
| Effect Duration | 24 hours |

**How this stays soft**: The target's actual transactions still execute at REAL prices. The display distortion only affects the market price display in their UI -- a subtle nudge that might cause them to delay a trade or misjudge timing. If the target checks an external source (leaderboard, alliance chat) they can detect the discrepancy. This is the most aggressive espionage action and correspondingly the hardest to execute.

**IMPORTANT**: The distortion is purely cosmetic display-side. No actual price manipulation occurs. Transactions execute at true server prices. The target's money/resources are never affected.

---

### 2.11 Insider Tip

**What it does**: Gives you advance notice of the next market event (from `market-events.ts`) affecting a specific resource category. You learn which event is coming 4 hours before it triggers.

| Property | Value |
|----------|-------|
| ID | `esp_insider_tip` |
| Cost | $30M + (bracket * $30M) |
| Base Success Rate | 50% |
| Cooldown | 24 hours (global, not per-target) |
| Unlock | Research: `economic_forecasting` (tier 2 espionage) |
| Intel Duration | Until event triggers |

**Reward on success**: Name and effect of the next upcoming market event for one resource category. Allows you to buy/sell before the price shift. This does not target a specific player but is still gated by the espionage system and daily action limit.

---

## 3. Intelligence Gathering

### What Intel Reveals (and What It Does NOT)

| Intel Type | Reveals | Does NOT Reveal |
|------------|---------|-----------------|
| Market Recon | Resources inventory, recent trades | Bank balance, total earned |
| Research Probe | Completed & active research | Planned future research |
| Facility Survey | Buildings at one location | Buildings at other locations |
| Contract Intel | Active contract progress | Personal (non-competitive) contracts |
| Headhunting | Workforce composition | Individual worker details |
| Fleet Tracking | Ship positions, cargo, routes | Ship combat stats (N/A) |
| Alliance Dossier | Members, roles, shared facilities | Alliance chat, private strategies |
| Trade Intercept | Open bounties, trade patterns | Private negotiations |
| Strategic Assessment | Net worth breakdown, revenue | Exact bank balance |
| Insider Tip | Upcoming market event | Other players' positions |

### Intel Freshness and Decay

All intelligence has a **duration** (listed per action above). After that duration expires:
- The intel report is marked as "STALE" in the UI
- Stale intel remains visible for another 48 hours but is grayed out with a warning
- After 48 hours of staleness, the report is archived (still accessible in history, but not displayed on dashboard)

Intel reflects the target's state at the **moment of the successful espionage action**, not live-updating data. If you probe someone's research at 3pm and they complete it at 5pm, your report still shows it as in-progress until you probe again.

### Intelligence Accuracy

Not all intel is 100% accurate. Accuracy scales with espionage tech level and is reduced by the target's security level.

```
accuracy = base_accuracy * (1 + attacker_tech_bonus) * (1 - defender_security_reduction)

base_accuracy per action:
  Market Recon:          95%
  Research Probe:        90%
  Facility Survey:       90%
  Contract Intel:        85%
  Headhunting:           95%
  Fleet Tracking:        80%
  Alliance Dossier:      85%
  Trade Intercept:       90%
  Strategic Assessment:  75%
  Insider Tip:           95%
  Disinformation:        N/A (binary success/fail)
```

When accuracy is below 100%, some data points may be omitted or slightly randomized. For example, at 80% accuracy on Market Recon, resource quantities may be shown as a range (450-550 instead of exact 500) and 1-2 resources may be hidden entirely.

---

## 4. Corporate Security System

### Security Levels

Every `GameProfile` has a `securityLevel` (integer 0-10) representing corporate counter-intelligence capability.

| Level | Name | Monthly Cost | Defense Bonus | Detection Chance | Unlock Requirement |
|-------|------|-------------|---------------|------------------|--------------------|
| 0 | None | $0 | 0% | 5% | Default |
| 1 | Basic Firewall | $500K/mo | +5% | 10% | $500M net worth |
| 2 | Perimeter Security | $1.5M/mo | +10% | 18% | Security Level 1 |
| 3 | Encrypted Comms | $4M/mo | +16% | 26% | Research: `encrypted_communications` |
| 4 | Secure Facilities | $10M/mo | +22% | 34% | Research: `corporate_security` |
| 5 | Counter-Intel Division | $25M/mo | +28% | 42% | Research: `counterintelligence_ops` |
| 6 | AI Threat Detection | $60M/mo | +34% | 52% | Research: `ai_threat_analysis` |
| 7 | Quantum Encryption | $120M/mo | +40% | 62% | Research: `quantum_encryption` |
| 8 | Zero-Trust Architecture | $250M/mo | +46% | 72% | Security Level 7 + $10B net worth |
| 9 | Autonomous Countermeasures | $500M/mo | +52% | 80% | Research: `autonomous_defense` |
| 10 | Fortress Protocol | $1B/mo | +58% | 88% | Security Level 9 + $50B net worth |

### Security Upgrade Costs

Upgrading security requires a one-time payment plus the ongoing monthly cost:

```
upgrade_cost = base_upgrade_cost * (1.5 ^ target_level)

base_upgrade_cost = $10,000,000

Examples:
  Level 0 -> 1: $15M one-time  + $500K/mo
  Level 4 -> 5: $75.9M one-time + $25M/mo
  Level 9 -> 10: $384.4M one-time + $1B/mo
```

### Defense Bonus Application

The defense bonus reduces the attacker's success probability:

```
effective_success_rate = base_success_rate * (1 - defense_bonus) * bracket_modifier

bracket_modifier:
  Same bracket:        1.0
  Attacking up 1:      0.85  (harder to spy on bigger companies)
  Attacking down 1:    1.10  (easier to spy on smaller companies)
```

Example: Market Recon (75% base) against a Security Level 5 target (28% defense):
```
effective = 0.75 * (1 - 0.28) * 1.0 = 0.54 = 54% success rate
```

### Security Maintenance

Security is paid from the existing monthly maintenance cycle in `game-engine.ts`. If the player cannot afford security maintenance, their security level does NOT decrease, but they receive a **Security Lapse** debuff:

- Detection chance drops to Level 0 values (5%)
- Defense bonus drops to 50% of normal
- Lapse continues until maintenance is paid
- A notification warns the player: "Security systems offline -- maintenance overdue!"

This prevents the "never take things away" rule from being violated (they do not lose their security level), but creates real consequences for not paying.

---

## 5. Employee Loyalty Mechanics

### Loyalty Score

Each worker type in the workforce has an implicit **loyalty score** from 0 to 100. Loyalty is tracked per worker type (not per individual worker, since workers are fungible counts).

```typescript
// Loyalty is stored on the workforce state
interface WorkforceLoyalty {
  engineers: number;   // 0-100
  scientists: number;
  miners: number;
  operators: number;
}

// Default loyalty for newly hired workers
DEFAULT_LOYALTY = 50
```

### Loyalty Changes

Loyalty drifts based on the player's behavior:

| Event | Loyalty Change | Frequency |
|-------|---------------|-----------|
| Paying full maintenance | +1 per worker type | Per game month |
| Loyalty program active (Level 1) | +2 per worker type | Per game month |
| Loyalty program active (Level 2) | +4 per worker type | Per game month |
| Loyalty program active (Level 3) | +6 per worker type | Per game month |
| Missed payroll (no money for salary) | -10 per worker type | Per game month |
| Completed a contract | +3 all types | Per completion |
| Completed a research | +2 to scientists | Per completion |
| Lost a risk decision | -5 all types | Per failure |
| Alliance victory (colony contest) | +5 all types | Per event |
| Prestige reset | Reset to 50 | Per prestige |

**Loyalty cap**: 100 (max), 0 (min). Loyalty cannot go negative.

### Loyalty Programs

Players can invest in loyalty programs (not individual workers, but company-wide policies):

| Program | Monthly Cost | Effect | Requirement |
|---------|-------------|--------|-------------|
| Basic Benefits | $1M/mo | +2 loyalty/month, +5% poaching resistance | None |
| Competitive Compensation | $5M/mo | +4 loyalty/month, +15% poaching resistance, +5% worker output | Research: `talent_retention` |
| Elite Retention Package | $15M/mo | +6 loyalty/month, +30% poaching resistance, +10% worker output, immune to mass poaching | Research: `corporate_culture` |

### Poaching Resistance

When an attacker uses `esp_headhunting`, in addition to gathering intel, there is a secondary "poach attempt" if the attacker opts in. This does NOT remove workers from the target. Instead, it gives the attacker a **discount** on their next hire that scales inversely with the target's loyalty.

```
poach_discount = base_discount * (1 - target_loyalty / 100) * (1 - loyalty_program_resistance)

base_discount = 0.5 (50% off hiring cost)

Example: Target has 80 loyalty, Basic Benefits (5% resistance)
  discount = 0.5 * (1 - 0.80) * (1 - 0.05) = 0.5 * 0.20 * 0.95 = 0.095 = 9.5% off

Example: Target has 30 loyalty, no program
  discount = 0.5 * (1 - 0.30) * (1 - 0.00) = 0.5 * 0.70 * 1.0 = 0.35 = 35% off
```

The target never loses workers. The mechanic is purely about giving the attacker a hiring advantage.

---

## 6. Success/Failure Probability Formulas

### Core Formula

```
P(success) = clamp(base_rate * attack_modifier * defense_modifier * bracket_modifier, 0.05, 0.95)

Where:
  base_rate       = action-specific base success rate (see Section 2)
  attack_modifier = 1.0 + espionage_tech_bonus (from research, 0.0 to 0.30)
  defense_modifier = 1.0 - target_security_defense_bonus (0.0 to 0.58)
  bracket_modifier = { same: 1.0, up_1: 0.85, down_1: 1.10 }

  clamp ensures minimum 5% and maximum 95% success rate
```

### Espionage Tech Bonus (from Research)

| Research Completed | Cumulative Bonus |
|-------------------|-----------------|
| `signals_intelligence` | +5% |
| `corporate_infiltration` | +8% |
| `deep_space_surveillance` | +12% |
| `counterintelligence_ops` | +16% |
| `intelligence_directorate` | +22% |
| `cyber_warfare_suite` | +26% |
| `quantum_cryptanalysis` | +30% |

### Worked Examples

**Example 1: New player vs. New player**
- Action: Market Recon (base 75%)
- Attacker: No espionage research (+0%)
- Target: Security Level 0 (0% defense)
- Same bracket
```
P = 0.75 * 1.00 * 1.00 * 1.0 = 75%
```

**Example 2: Mid-game attacker vs. Fortified target**
- Action: Contract Intel (base 60%)
- Attacker: `signals_intelligence` + `corporate_infiltration` (+8%)
- Target: Security Level 5 (28% defense)
- Attacker one bracket below target
```
P = 0.60 * 1.08 * 0.72 * 0.85 = 0.60 * 1.08 * 0.72 * 0.85 = 0.396 = 39.6%
```

**Example 3: Elite spy vs. Undefended target**
- Action: Strategic Assessment (base 35%)
- Attacker: All espionage research (+30%)
- Target: Security Level 1 (5% defense)
- Attacker one bracket above
```
P = 0.35 * 1.30 * 0.95 * 1.10 = 0.475 = 47.5%
```

### Repeated Attempt Penalty

Targeting the same player with the same action type within 24 hours incurs a stacking penalty:

```
repeat_penalty = 0.8 ^ (same_action_same_target_in_24h - 1)

1st attempt: 0.8^0 = 1.0 (no penalty)
2nd attempt: 0.8^1 = 0.8 (-20%)
3rd attempt: 0.8^2 = 0.64 (-36%)
```

This discourages repeatedly harassing a single player. Combined with the 3/day limit, a player can target the same person at most 3 times/day with diminishing returns.

---

## 7. Cooldowns and Limits

### Global Limits

| Limit | Value | Reset |
|-------|-------|-------|
| Total espionage actions per day | 3 | Midnight UTC |
| Maximum intel reports stored | 50 | Oldest auto-archived |
| Maximum active disinformation campaigns | 1 | When current expires |
| Minimum net worth to use espionage | $200M | N/A |

### Per-Action Cooldowns

| Action | Per-Target Cooldown | Global Cooldown |
|--------|-------------------|-----------------|
| Market Recon | 4 hours | None |
| Research Probe | 6 hours | None |
| Facility Survey | 8 hours | None |
| Contract Intel | 12 hours | None |
| Headhunting | 24 hours | None |
| Fleet Tracking | 12 hours | None |
| Alliance Dossier | 48 hours | None |
| Trade Intercept | 6 hours | None |
| Strategic Assessment | 72 hours | 24 hours |
| Disinformation | 48 hours | 48 hours |
| Insider Tip | N/A (no target) | 24 hours |

### Per-Target Limits

A single target can be espionaged by all attackers combined at most **5 times per 24 hours**. After that, the target is "on high alert" and immune to further espionage for the remainder of the period. This prevents pile-on griefing.

### Newcomer Shield Integration

Players within their first 7 real-time days of account creation (aligning with the existing `catchup-mechanics.ts` newcomer shield) are **immune to all espionage**. They also cannot perform espionage actions during this period. This gives new players time to learn the game without PvP pressure.

---

## 8. Counter-Espionage

### Detection

When an espionage action is performed against a target, the target has a chance to detect it:

```
P(detection) = base_detection + security_detection_bonus

base_detection = 5% (everyone has a small chance)
security_detection_bonus = from Security Level table (Section 4)
```

Detection occurs regardless of whether the espionage succeeded or failed.

### Detection Outcomes

| Detection Level | Information Revealed to Target |
|-----------------|-------------------------------|
| Basic (Security 0-2) | "An espionage attempt was detected against your company." (no details) |
| Moderate (Security 3-5) | Above + action type ("Market Reconnaissance detected") |
| Advanced (Security 6-8) | Above + attacker's bracket ("by a LEO Ops company") |
| Elite (Security 9-10) | Above + attacker's company name |

### Counter-Espionage Actions

Players with sufficient security and research can perform active counter-espionage:

#### 8.1 Security Audit

**Passive ability** unlocked at Security Level 3. Whenever an espionage attempt is detected, automatically applies a 4-hour "Heightened Alert" buff that gives +15% defense bonus to all actions.

#### 8.2 Trace Operation

**Active ability** unlocked by research `counterintelligence_ops`. When espionage is detected, the target can spend $20M to launch a trace. If successful (base 50%, modified by security level), reveals the attacker's company name and alliance.

```
P(trace_success) = 0.50 + (security_level * 0.05)

At Security Level 5: 75% trace success
At Security Level 10: 100% trace success
```

#### 8.3 Feed False Intel

**Active ability** unlocked by research `deception_protocols`. Instead of blocking detected espionage, the target can choose to let it succeed but feed the attacker deliberately misleading information. The attacker receives plausible but incorrect intel and does not know it is false.

Cost: $30M per use. Cooldown: 24 hours.

The false intel is generated by randomizing true values:
- Resource quantities: +/-30-50% from actual
- Research: shows 2-3 plausible but uncompleted researches as "completed"
- Fleet positions: shows ships at adjacent locations to their real positions

#### 8.4 Blacklist

**Passive ability** at Security Level 6+. The player can maintain a blacklist of up to 5 company names. Espionage from blacklisted companies has its success rate halved (applied as an additional multiplier of 0.5).

---

## 9. Rewards for Successful Espionage

### Direct Rewards

| Action | Tangible Reward |
|--------|----------------|
| Market Recon | Intel report (see Section 3) |
| Research Probe | Intel report |
| Facility Survey | Intel report |
| Contract Intel | Intel report |
| Headhunting | Intel report + **Headhunting Voucher** (50% off next hire, 72h expiry) |
| Fleet Tracking | Intel report |
| Alliance Dossier | Intel report |
| Trade Intercept | Intel report + **10% market fee discount** for revealed resources (24h) |
| Strategic Assessment | Comprehensive intel report |
| Disinformation | Display distortion applied to target (24h) |
| Insider Tip | Preview of upcoming market event (4h advance) |

### Strategic Value of Intel

Intel is most valuable when acted upon quickly. The real reward is **better decision-making**:

1. **Market timing**: Knowing a rival's resource stockpile lets you predict their sell timing and front-run or avoid market moves.
2. **Contract racing**: Knowing a rival's contract progress lets you decide whether to compete or pivot.
3. **Expansion blocking**: Knowing where a rival is building lets you claim adjacent colony locations first.
4. **Alliance targeting**: Knowing alliance composition lets you target the weakest member or identify the alliance's economic center of gravity.
5. **Research pivots**: Knowing a rival's research path lets you pursue complementary or counter-strategies.

### Reputation Integration

Successful espionage operations earn **reputation points** (integrating with the existing `REPUTATION_EVENTS` system in `competitive-engine.ts`):

| Event | Reputation |
|-------|-----------|
| Successful espionage action | +3 |
| Successful strategic assessment | +10 |
| Detected AND traced back to you | -5 |
| Fed false intel (discovered later) | -3 for the feeder (if attacker has high security) |

---

## 10. Impact on Target (Soft PvP Guarantee)

### What Can NEVER Happen

The following outcomes are hard-coded prohibitions in the espionage system:

1. Target NEVER loses money from espionage
2. Target NEVER loses resources from espionage
3. Target NEVER loses buildings, ships, or workers from espionage
4. Target NEVER has contracts cancelled from espionage
5. Target NEVER has research interrupted from espionage
6. Target NEVER has security downgraded from espionage
7. Target NEVER has alliance membership affected by espionage
8. Target NEVER has production rates reduced by espionage

### What CAN Happen to a Target

1. **Information asymmetry**: The attacker knows things about you that you do not know they know. This is a strategic disadvantage, not a material one.
2. **Disinformation display distortion**: Market prices may appear slightly wrong in the target's UI for 24 hours. Real transactions are unaffected.
3. **Heightened alert notifications**: Target receives notifications about detected attempts, which can be distracting but are also informative.
4. **Reputation tracking**: Being repeatedly spied on has no negative reputation effect on the target. Only the attacker's actions affect their own reputation.

### Design Rationale

In an async game, players log in irregularly. If espionage could damage them while offline, it would feel unfair and punishing. By restricting espionage to information-only effects, we ensure:

- Players never log in to find their empire damaged by espionage
- Casual players are not disproportionately punished
- The competitive advantage from espionage requires ACTING on the intel, not just gathering it
- The system encourages strategic thinking, not griefing

---

## 11. Espionage Tech Tree

### New Research Category: `espionage`

These researches are added to the existing 300+ research tree. They integrate with the existing `ResearchDefinition` interface.

```
TIER 1 (Espionage Fundamentals)
  |
  +-- signals_intelligence
  |     Cost: $50M | Time: 600s (10 min) | Prereqs: none
  |     Effect: Unlocks Market Recon, Research Probe, Facility Survey, Trade Intercept
  |     Desc: "Establish a signals intelligence division to intercept competitor communications."
  |
  +-- basic_tradecraft
        Cost: $80M | Time: 900s (15 min) | Prereqs: none
        Effect: +5% espionage success rate (all actions)
        Desc: "Train operatives in basic intelligence gathering techniques."

TIER 2 (Operational Capability)
  |
  +-- corporate_infiltration
  |     Cost: $200M | Time: 1800s (30 min) | Prereqs: signals_intelligence
  |     Effect: Unlocks Contract Intel; +3% espionage success rate
  |     Desc: "Place informants inside rival corporations to monitor contract activity."
  |
  +-- talent_acquisition
  |     Cost: $250M | Time: 1800s (30 min) | Prereqs: basic_tradecraft
  |     Effect: Unlocks Headhunting
  |     Desc: "Develop a covert talent scouting network across the industry."
  |
  +-- economic_forecasting
  |     Cost: $300M | Time: 2400s (40 min) | Prereqs: signals_intelligence
  |     Effect: Unlocks Insider Tip
  |     Desc: "Build AI models to predict market movements from intercepted trade data."
  |
  +-- encrypted_communications
  |     Cost: $150M | Time: 1200s (20 min) | Prereqs: basic_tradecraft
  |     Effect: Unlocks Security Level 3; +10% detection chance
  |     Desc: "End-to-end encryption for all corporate communications."
  |
  +-- talent_retention
        Cost: $180M | Time: 1500s (25 min) | Prereqs: basic_tradecraft
        Effect: Unlocks Competitive Compensation loyalty program
        Desc: "Implement industry-leading benefits to retain top talent."

TIER 3 (Advanced Operations)
  |
  +-- deep_space_surveillance
  |     Cost: $800M | Time: 5400s (90 min) | Prereqs: corporate_infiltration
  |     Effect: Unlocks Fleet Tracking; +4% espionage success rate
  |     Desc: "Deploy covert sensor networks to track rival fleet movements."
  |
  +-- counterintelligence_ops
  |     Cost: $1B | Time: 5400s (90 min) | Prereqs: encrypted_communications
  |     Effect: Unlocks Alliance Dossier, Trace Operation, Security Level 5
  |     Desc: "Establish a dedicated counterintelligence division."
  |
  +-- psychological_operations
  |     Cost: $1.2B | Time: 7200s (2 hr) | Prereqs: corporate_infiltration
  |     Effect: Unlocks Disinformation Campaign
  |     Desc: "Develop capability to plant misleading information in rival systems."
  |
  +-- corporate_security
  |     Cost: $500M | Time: 3600s (1 hr) | Prereqs: encrypted_communications
  |     Effect: Unlocks Security Level 4; +5% detection chance
  |     Desc: "Comprehensive physical and digital security for all facilities."
  |
  +-- corporate_culture
        Cost: $600M | Time: 4200s (70 min) | Prereqs: talent_retention
        Effect: Unlocks Elite Retention Package loyalty program
        Desc: "Build a company culture so strong that rivals cannot poach your people."

TIER 4 (Intelligence Mastery)
  |
  +-- intelligence_directorate
  |     Cost: $5B | Time: 14400s (4 hr) | Prereqs: deep_space_surveillance, counterintelligence_ops
  |     Effect: Unlocks Strategic Assessment; +6% espionage success rate
  |     Desc: "Centralized intelligence command integrating all espionage operations."
  |
  +-- ai_threat_analysis
  |     Cost: $8B | Time: 14400s (4 hr) | Prereqs: counterintelligence_ops
  |     Effect: Unlocks Security Level 6; auto-detect all actions at 60%+ probability
  |     Desc: "AI systems that predict and flag espionage attempts in real-time."
  |
  +-- deception_protocols
  |     Cost: $6B | Time: 10800s (3 hr) | Prereqs: psychological_operations
  |     Effect: Unlocks Feed False Intel counter-espionage ability
  |     Desc: "Sophisticated systems to feed convincing false data to enemy agents."
  |
  +-- quantum_encryption
        Cost: $10B | Time: 14400s (4 hr) | Prereqs: ai_threat_analysis
        Effect: Unlocks Security Level 7
        Desc: "Quantum key distribution makes communications virtually unbreakable."

TIER 5 (Apex Espionage)
  |
  +-- cyber_warfare_suite
  |     Cost: $50B | Time: 43200s (12 hr) | Prereqs: intelligence_directorate
  |     Effect: +4% espionage success rate (total +30%); reduces all cooldowns by 25%
  |     Desc: "Full-spectrum cyber warfare capability for total information dominance."
  |
  +-- autonomous_defense
  |     Cost: $40B | Time: 43200s (12 hr) | Prereqs: quantum_encryption
  |     Effect: Unlocks Security Level 9; auto-trace all detected attempts
  |     Desc: "Self-adapting AI defense systems that evolve faster than attackers."
  |
  +-- ghost_protocol
        Cost: $75B | Time: 43200s (12 hr) | Prereqs: cyber_warfare_suite
        Effect: Failed espionage attempts are never detected by the target
        Desc: "Perfect operational security. Your agents leave no trace, even on failure."
```

### Tech Tree Summary

- **Total new researches**: 18
- **Offense-focused**: 10 (signals_intelligence through cyber_warfare_suite)
- **Defense-focused**: 8 (encrypted_communications through autonomous_defense)
- **Both**: ghost_protocol (offensive advantage via stealth)

---

## 12. Alliance Espionage

### Alliance-Level Operations

Alliances can pool espionage actions for more powerful operations. These require coordination and cost alliance treasury funds (future feature) or contributions from members.

#### 12.1 Alliance Intelligence Sweep

**What**: All members contribute 1 espionage action each (minimum 3 members, maximum 5). The combined operation produces intelligence on ALL members of a target alliance simultaneously.

| Property | Value |
|----------|-------|
| ID | `esp_alliance_sweep` |
| Cost | $100M per contributing member |
| Base Success Rate | 55% (modified by average security of target alliance) |
| Cooldown | 7 days per target alliance |
| Unlock | Alliance leader/officer + `counterintelligence_ops` research |

**Result on success**: One intel report per target alliance member (equivalent to Market Recon level). The alliance treasury (or each contributor) pays the cost.

#### 12.2 Economic Warfare Campaign

**What**: A sustained operation lasting 72 hours that provides real-time intel updates on a target alliance's aggregate market activity. Updated every 4 hours.

| Property | Value |
|----------|-------|
| ID | `esp_economic_warfare` |
| Cost | $500M (split among contributors) |
| Base Success Rate | 40% |
| Cooldown | 14 days per target alliance |
| Unlock | `intelligence_directorate` research + alliance officer role |

**Result on success**: Dashboard widget showing target alliance's aggregate buy/sell volume per resource over the 72-hour window. Updated every 4 hours. Does not show individual member activity, only totals.

#### 12.3 Defection Encouragement

**What**: Attempt to incentivize a specific member of a rival alliance to consider leaving. On success, the target member sees a notification: "A rival corporation has expressed interest in your talents. Your alliance may not be maximizing your potential."

| Property | Value |
|----------|-------|
| ID | `esp_defection_encourage` |
| Cost | $200M |
| Base Success Rate | 30% (modified by target member's loyalty and position) |
| Cooldown | 30 days per target member |
| Unlock | `psychological_operations` research |

**Soft PvP guarantee**: This does NOT force anyone to leave an alliance. It sends a notification. The target player decides what to do with it. The notification makes clear it was generated by a rival's espionage action, not an organic event.

### Alliance Espionage Limits

- Alliance operations count against each contributing member's daily 3-action limit
- Only alliance leaders and officers can initiate alliance operations
- Target alliance must be different from the attacker's alliance (no self-espionage)
- Alliance operations cannot target alliances more than 1 bracket above the average bracket of contributing members

---

## 13. Database Schema (Prisma Models)

```prisma
// ─── Espionage System Models ────────────────────────────────────────────────

// Tracks a player's espionage capability and defense
model EspionageProfile {
  id                String       @id @default(cuid())
  profileId         String       @unique
  profile           GameProfile  @relation(fields: [profileId], references: [id], onDelete: Cascade)

  // Defense
  securityLevel     Int          @default(0)    // 0-10
  securityLapsed    Boolean      @default(false) // true if maintenance unpaid

  // Loyalty programs
  loyaltyProgramId  String?      // null, 'basic', 'competitive', 'elite'

  // Workforce loyalty scores (0-100 each)
  loyaltyEngineers  Int          @default(50)
  loyaltyScientists Int          @default(50)
  loyaltyMiners     Int          @default(50)
  loyaltyOperators  Int          @default(50)

  // Counter-espionage
  blacklist         String[]     @default([])  // Array of GameProfile IDs (max 5)
  heightenedAlertUntil DateTime? // Timestamp when alert expires

  // Usage tracking
  actionsToday      Int          @default(0)
  lastActionReset   DateTime     @default(now()) // UTC midnight reset

  // Vouchers / active bonuses
  headhuntVoucherExpiry   DateTime?  // When the 50% hire discount expires
  marketDiscountExpiry    DateTime?  // When 10% market discount expires
  marketDiscountResources String[]   @default([]) // Which resources get the discount

  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  // Relations
  launchedMissions  EspionageMission[] @relation("attacker")
  receivedMissions  EspionageMission[] @relation("target")
  intelReports      IntelReport[]
  disinfoEffects    DisinformationEffect[] @relation("disinfoTarget")

  @@index([profileId])
  @@index([securityLevel])
}

// A single espionage action attempt
model EspionageMission {
  id              String            @id @default(cuid())
  actionType      String            // esp_market_recon, esp_research_probe, etc.

  // Participants
  attackerId      String
  attacker        EspionageProfile  @relation("attacker", fields: [attackerId], references: [id], onDelete: Cascade)
  targetId        String
  target          EspionageProfile  @relation("target", fields: [targetId], references: [id], onDelete: Cascade)

  // Optional: for Facility Survey, which location was targeted
  targetLocationId String?

  // Outcome
  status          String            @default("pending") // pending, success, failure, detected
  wasDetected     Boolean           @default(false)
  detectionLevel  String?           // basic, moderate, advanced, elite
  wasTraced       Boolean           @default(false)

  // Probability tracking (for transparency/debugging)
  calculatedSuccessRate Float?
  calculatedDetectionRate Float?

  // Cost paid
  costPaid        Float             @default(0)

  // Timing
  launchedAt      DateTime          @default(now())
  resolvedAt      DateTime?         // When outcome was determined
  cooldownUntil   DateTime?         // When this action type can be used vs this target again

  // Result
  intelReportId   String?           @unique
  intelReport     IntelReport?

  @@index([attackerId])
  @@index([targetId])
  @@index([actionType])
  @@index([launchedAt])
  @@index([targetId, launchedAt]) // For per-target daily limits
  @@index([attackerId, actionType, targetId]) // For cooldown checks
}

// The intelligence gathered from a successful mission
model IntelReport {
  id              String            @id @default(cuid())
  profileId       String            // Owner (the attacker who gathered it)
  profile         EspionageProfile  @relation(fields: [profileId], references: [id], onDelete: Cascade)

  // Source mission
  missionId       String            @unique
  mission         EspionageMission  @relation(fields: [missionId], references: [id], onDelete: Cascade)

  // Report content
  reportType      String            // matches actionType
  targetCompanyName String
  data            Json              // The actual intelligence data (structure varies by type)
  accuracy        Float             @default(1.0) // 0.0-1.0, affects data reliability

  // Freshness
  gatheredAt      DateTime          @default(now())
  expiresAt       DateTime          // When intel goes stale
  isStale         Boolean           @default(false)
  archivedAt      DateTime?         // When moved to archive (48h after stale)

  // For Insider Tip: the market event preview
  marketEventPreview Json?

  @@index([profileId])
  @@index([reportType])
  @@index([expiresAt])
  @@index([profileId, isStale])
}

// Active disinformation effect on a target
model DisinformationEffect {
  id              String            @id @default(cuid())
  targetId        String
  target          EspionageProfile  @relation("disinfoTarget", fields: [targetId], references: [id], onDelete: Cascade)
  attackerProfileId String          // GameProfile ID of attacker (for audit)

  // Effect details
  priceDistortions Json             // { resourceSlug: multiplier } e.g. { "titanium": 1.06, "iron": 0.94 }
  appliedAt       DateTime          @default(now())
  expiresAt       DateTime

  @@index([targetId])
  @@index([expiresAt])
}

// Alliance-level espionage operations
model AllianceEspionageOp {
  id                String   @id @default(cuid())
  operationType     String   // alliance_sweep, economic_warfare, defection_encourage
  attackerAllianceId String
  targetAllianceId  String?  // null for defection_encourage (targets individual)
  targetProfileId   String?  // for defection_encourage

  // Contributors (members who donated their action)
  contributorIds    String[] @default([])
  totalCost         Float    @default(0)

  // Outcome
  status            String   @default("pending") // pending, success, failure
  resultData        Json?    // Aggregate intel results

  launchedAt        DateTime @default(now())
  resolvedAt        DateTime?
  expiresAt         DateTime? // For time-limited intel (economic_warfare 72h)
  cooldownUntil     DateTime? // When this op can be used vs this target again

  @@index([attackerAllianceId])
  @@index([targetAllianceId])
  @@index([launchedAt])
}

// Espionage notification log (separate from community Notification model)
model EspionageNotification {
  id              String   @id @default(cuid())
  profileId       String   // GameProfile ID of the recipient
  type            String   // attempt_detected, trace_result, intel_gathered, mission_failed,
                           // disinformation_suspected, defection_message, security_lapse, alert_triggered
  title           String
  message         String
  metadata        Json?    // Additional context (attacker info if traced, action type, etc.)
  read            Boolean  @default(false)
  createdAt       DateTime @default(now())

  @@index([profileId, read])
  @@index([profileId, createdAt])
}
```

### Schema Integration with Existing Models

Add to the existing `GameProfile` model:

```prisma
model GameProfile {
  // ... existing fields ...

  // Espionage
  espionageProfile  EspionageProfile?
}
```

Add to the existing `Alliance` model:

```prisma
model Alliance {
  // ... existing fields ...

  // Espionage operations launched by this alliance
  espionageOps  AllianceEspionageOp[] @relation("allianceAttacker")
  // Espionage operations targeting this alliance
  targetedByOps AllianceEspionageOp[] @relation("allianceTarget")
}
```

---

## 14. API Endpoints

### Espionage Actions

#### `POST /api/space-tycoon/espionage/launch`

Launch an espionage action against a target.

**Request body:**
```json
{
  "actionType": "esp_market_recon",
  "targetProfileId": "clxyz...",
  "targetLocationId": "mars_surface"  // Only for esp_facility_survey
}
```

**Response (success):**
```json
{
  "missionId": "clxyz...",
  "status": "success",
  "costPaid": 15000000,
  "intelReport": {
    "id": "clxyz...",
    "reportType": "esp_market_recon",
    "targetCompanyName": "Mars Industries",
    "data": { "resources": { "iron": 450, "titanium": 120 }, "recentOrders": [...] },
    "accuracy": 0.92,
    "expiresAt": "2026-03-24T15:00:00Z"
  },
  "remainingActionsToday": 2
}
```

**Response (failure):**
```json
{
  "missionId": "clxyz...",
  "status": "failure",
  "costPaid": 15000000,
  "message": "Your agent was unable to gather intelligence. The cost has been deducted.",
  "remainingActionsToday": 2
}
```

**Validation:**
- Player must be authenticated and have a GameProfile
- Player must have >= $200M net worth
- Action type must be valid and unlocked (research prereqs met)
- Target must be in valid bracket range (within 1)
- Cooldown for this action/target must have expired
- Daily action limit not exceeded (3/day)
- Target daily incoming limit not exceeded (5/day)
- Player must have enough money to pay the cost
- Target is not within newcomer shield period

---

#### `GET /api/space-tycoon/espionage/reports`

Retrieve the player's intel reports.

**Query params:**
- `status`: `active` | `stale` | `archived` | `all` (default: `active`)
- `type`: Filter by report type (optional)
- `limit`: Max results (default: 20, max: 50)

**Response:**
```json
{
  "reports": [
    {
      "id": "clxyz...",
      "reportType": "esp_market_recon",
      "targetCompanyName": "Mars Industries",
      "accuracy": 0.92,
      "gatheredAt": "2026-03-23T15:00:00Z",
      "expiresAt": "2026-03-24T15:00:00Z",
      "isStale": false,
      "data": { ... }
    }
  ],
  "total": 12
}
```

---

#### `GET /api/space-tycoon/espionage/targets`

Get a list of valid espionage targets (players within bracket range).

**Query params:**
- `limit`: Max results (default: 20, max: 50)
- `search`: Search by company name (optional)

**Response:**
```json
{
  "targets": [
    {
      "profileId": "clxyz...",
      "companyName": "Mars Industries",
      "bracket": 2,
      "bracketName": "Interplanetary",
      "allianceTag": "[SOL]",
      "isOnline": false,
      "recentlyTargeted": false,
      "cooldowns": {
        "esp_market_recon": null,
        "esp_research_probe": "2026-03-23T18:00:00Z"
      }
    }
  ],
  "myBracket": 1,
  "myBracketName": "LEO Ops"
}
```

---

#### `GET /api/space-tycoon/espionage/profile`

Get the player's espionage profile (security level, loyalty, cooldowns, limits).

**Response:**
```json
{
  "securityLevel": 5,
  "securityLapsed": false,
  "securityMonthlyCost": 25000000,
  "loyaltyProgramId": "competitive",
  "loyaltyScores": {
    "engineers": 78,
    "scientists": 82,
    "miners": 65,
    "operators": 71
  },
  "blacklist": ["clxyz..."],
  "actionsToday": 1,
  "maxActionsPerDay": 3,
  "heightenedAlertUntil": null,
  "activeVouchers": {
    "headhuntDiscount": null,
    "marketDiscount": { "expiresAt": "2026-03-24T10:00:00Z", "resources": ["titanium"] }
  },
  "activeMissions": 0,
  "unlockedActions": ["esp_market_recon", "esp_research_probe", "esp_facility_survey", "esp_trade_intercept", "esp_contract_intel"]
}
```

---

#### `POST /api/space-tycoon/espionage/security/upgrade`

Upgrade the player's security level.

**Request body:**
```json
{
  "targetLevel": 3
}
```

**Response:**
```json
{
  "newSecurityLevel": 3,
  "upgradeCost": 33750000,
  "newMonthlyCost": 4000000,
  "newDefenseBonus": 0.16,
  "newDetectionChance": 0.26
}
```

---

#### `POST /api/space-tycoon/espionage/security/blacklist`

Add or remove a player from your blacklist.

**Request body:**
```json
{
  "targetProfileId": "clxyz...",
  "action": "add"
}
```

---

#### `POST /api/space-tycoon/espionage/counter/trace`

Launch a trace operation against a detected espionage attempt.

**Request body:**
```json
{
  "missionId": "clxyz..."
}
```

---

#### `POST /api/space-tycoon/espionage/counter/feed-false`

Feed false intel to a detected espionage attempt.

**Request body:**
```json
{
  "missionId": "clxyz..."
}
```

---

#### `POST /api/space-tycoon/espionage/alliance/launch`

Launch an alliance-level espionage operation.

**Request body:**
```json
{
  "operationType": "alliance_sweep",
  "targetAllianceId": "clxyz...",
  "contributorIds": ["clxyz...", "clxyz...", "clxyz..."]
}
```

---

#### `GET /api/space-tycoon/espionage/notifications`

Get espionage notifications (separate from community notifications).

**Query params:**
- `unreadOnly`: `true` | `false` (default: `false`)
- `limit`: Max results (default: 20)

---

#### `POST /api/space-tycoon/espionage/notifications/read`

Mark espionage notifications as read.

**Request body:**
```json
{
  "notificationIds": ["clxyz...", "clxyz..."]
}
```

---

## 15. UI Design

### 15.1 New Game Tab: "Intel"

Add `'intel'` to the `GameTab` type. This is the primary hub for all espionage activity.

The Intel tab has 4 sub-sections accessible via horizontal tabs:

```
[ Operations ]  [ Reports ]  [ Security ]  [ Notifications ]
```

### 15.2 Operations Sub-Tab

**Layout**: Two-column. Left column is the target selector, right column is the action panel.

**Target Selector (Left Column)**:
- Search bar at top: "Search companies..."
- Filter chips: `Same Bracket` | `One Below` | `One Above`
- Scrollable list of valid targets, each showing:
  - Company name
  - Alliance tag (if any)
  - Bracket badge (color-coded)
  - Online indicator (green dot if synced in last 5 min)
  - "Recently targeted" indicator if any cooldown is active
- Selected target is highlighted

**Action Panel (Right Column)**:
When a target is selected, shows available actions as cards:

```
+------------------------------------------------------+
| [icon] MARKET RECONNAISSANCE                     $15M |
| Reveal resource inventory and recent market trades     |
| Success: 54%  |  Cooldown: Ready  |  Duration: 24h   |
|                                                        |
|  [ LAUNCH OPERATION ]                                  |
+------------------------------------------------------+
```

Each card shows:
- Action name and icon
- Cost (calculated for current bracket)
- Success probability (calculated against selected target)
- Cooldown status (Ready / X hours remaining)
- Intel duration
- Lock icon + "Requires: [research name]" if not unlocked
- Greyed out if on cooldown, insufficient funds, or daily limit reached

**Top bar** shows: `Actions Today: 2/3  |  Bracket: LEO Ops ($2.1B)`

### 15.3 Reports Sub-Tab

**Layout**: Card grid showing intel reports.

Each report card:
```
+------------------------------------------------------+
| MARKET RECON: Mars Industries          [Interplanetary] |
| Gathered: 2h ago  |  Expires in: 22h  |  Accuracy: 92% |
|------------------------------------------------------|
| RESOURCES:                                             |
|   Iron: ~450  |  Titanium: ~120  |  Rare Earth: ~35   |
|                                                        |
| RECENT TRADES:                                         |
|   SELL 200 iron @ $52K/unit   (3h ago)                |
|   BUY 50 titanium @ $180K/unit (8h ago)               |
|                                                        |
| [View Full Report]  [Archive]                          |
+------------------------------------------------------+
```

Reports have color-coded freshness:
- **Green border**: Fresh (> 50% time remaining)
- **Yellow border**: Aging (< 50% time remaining)
- **Red border/grayed**: Stale (expired, in 48h archive window)

Filter options: `All` | `Market` | `Research` | `Facilities` | `Contracts` | `Fleet` | `Alliance` | `Stale`

### 15.4 Security Sub-Tab

**Layout**: Dashboard showing defensive posture.

**Security Level Panel:**
```
+------------------------------------------------------+
| CORPORATE SECURITY                         Level 5/10 |
| ████████████░░░░░░░░                                   |
|                                                        |
| Defense Bonus: +28%   |   Detection: 42%              |
| Monthly Cost: $25M/mo |   Status: ACTIVE              |
|                                                        |
| [ UPGRADE TO LEVEL 6 — $60M/mo — Requires: AI Threat  |
|   Analysis research ]                                  |
+------------------------------------------------------+
```

**Loyalty Overview:**
```
+------------------------------------------------------+
| WORKFORCE LOYALTY          Program: Competitive Comp. |
|                                                        |
| Engineers:  ████████░░  78/100                          |
| Scientists: █████████░  82/100                         |
| Miners:     ██████░░░░  65/100                         |
| Operators:  ███████░░░  71/100                         |
|                                                        |
| Poaching Resistance: +15%                              |
| [ Upgrade to Elite Retention — $15M/mo ]              |
+------------------------------------------------------+
```

**Blacklist Panel:**
```
+------------------------------------------------------+
| BLACKLIST (3/5)                                        |
|                                                        |
| 1. Titan Corp          [Remove]                        |
| 2. Red Planet Mining    [Remove]                       |
| 3. Orbital Dynamics     [Remove]                       |
|                                                        |
| [ + Add Company ]                                      |
+------------------------------------------------------+
```

**Recent Detections Panel:**
```
+------------------------------------------------------+
| DETECTED ESPIONAGE ATTEMPTS                            |
|                                                        |
| 3h ago: Contract Intel attempt detected                |
|   By: LEO Ops company  |  [Trace — $20M]             |
|                                                        |
| 8h ago: Market Recon attempt detected                  |
|   By: Unknown  |  [Trace — $20M]                       |
|                                                        |
| 1d ago: Fleet Tracking BLOCKED                         |
|   By: "Titan Corp" (traced)  |  On blacklist          |
+------------------------------------------------------+
```

### 15.5 Notifications Sub-Tab

Chronological list of espionage-related notifications:

```
[!] 2h ago — ESPIONAGE DETECTED
    A Contract Intelligence operation was detected targeting your company.
    Attacker bracket: LEO Ops  |  [Trace for $20M]  [Dismiss]

[✓] 5h ago — INTEL GATHERED
    Market Reconnaissance on "Red Planet Mining" successful.
    Report available for 24 hours.  [View Report]

[✗] 8h ago — MISSION FAILED
    Research Probe against "Orbital Dynamics" failed.
    $23M cost was not refunded.  [Dismiss]

[⚡] 12h ago — HEIGHTENED ALERT
    Security systems triggered heightened alert (+15% defense for 4h).
    Alert expires at 16:00 UTC.

[🔔] 1d ago — INTEL EXPIRING
    Your Market Recon report on "Mars Industries" expires in 2 hours.
    [View Report]
```

### 15.6 Disinformation Indicator (Target-Side)

When a player is affected by a disinformation campaign, a subtle indicator appears on their Market panel:

```
⚠ Market data may be unreliable — suspected signal interference
```

This appears only if the target has Security Level 4+ (they can detect the distortion). Below that, no indicator is shown. The indicator does NOT reveal who launched the disinformation.

### 15.7 Leaderboard Integration

Add an "Intel Rating" column to the leaderboard (optional, toggleable):
- Calculated as: `(successful_missions * 10) + (security_level * 5) - (times_detected * 3)`
- Displayed as a rank title: Novice Agent, Field Operative, Intelligence Officer, Spymaster, Shadow Director

---

## 16. Notification System

### Notification Types

| Type | Recipient | Trigger | Priority |
|------|-----------|---------|----------|
| `espionage_detected` | Target | Espionage detected by security | High |
| `trace_result` | Target | Trace operation completed | High |
| `intel_gathered` | Attacker | Successful espionage mission | Medium |
| `mission_failed` | Attacker | Failed espionage mission | Medium |
| `intel_expiring` | Attacker | Intel report expires in 2 hours | Low |
| `intel_expired` | Attacker | Intel report has gone stale | Low |
| `security_lapse` | Self | Security maintenance unpaid | High |
| `alert_triggered` | Target | Heightened Alert activated | Medium |
| `blacklist_blocked` | Target | Blacklisted attacker blocked | Low |
| `disinformation_suspected` | Target | Disinformation detected (Level 4+ security) | High |
| `defection_message` | Target | Defection encouragement received | Medium |
| `counter_intel_success` | Target | False intel successfully fed | Medium |
| `voucher_received` | Attacker | Headhunt voucher or market discount active | Medium |
| `voucher_expiring` | Attacker | Voucher expires in 1 hour | Low |
| `alliance_op_result` | Contributors | Alliance operation resolved | High |

### Notification Delivery

1. **In-game**: All notifications appear in the Intel tab's Notifications sub-tab
2. **Game notification bell**: High-priority notifications show a badge on the Intel tab icon in the game tab bar
3. **Community notification integration**: Optionally (per NotificationPreference), espionage notifications of High priority can also appear in the main site notification system
4. **Push notification** (if enabled): Only `espionage_detected` and `security_lapse` types, to avoid spam

### Notification Copy Examples

**Espionage Detected (Basic):**
> "Your security systems detected an unauthorized intelligence gathering attempt. Consider upgrading your security level for better protection."

**Espionage Detected (Elite):**
> "ALERT: 'Titan Corp' attempted a Fleet Tracking operation against your company. The attempt was unsuccessful. Your AI defense systems have activated Heightened Alert for 4 hours."

**Intel Gathered:**
> "Your agent has returned with intelligence from Mars Industries. Market Recon report available for 24 hours. Review it in your Intel dashboard."

**Mission Failed:**
> "Your Market Reconnaissance operation against Red Planet Mining was unsuccessful. The $15M operational cost has been deducted. The target may or may not have detected the attempt."

**Disinformation Suspected:**
> "WARNING: Anomalous readings detected in market data feeds. Possible disinformation campaign. Market prices displayed may be inaccurate. Cross-reference with alliance members. Effect may last up to 24 hours."

**Defection Encouragement:**
> "INCOMING TRANSMISSION: A rival corporation has taken interest in your capabilities. They suggest your current alliance may not be leveraging your full potential. [This message was generated by a rival's Defection Encouragement operation.]"

---

## 17. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

**Goal**: Core infrastructure, basic espionage, and security.

**Tasks**:
1. Add Prisma models: `EspionageProfile`, `EspionageMission`, `IntelReport`, `EspionageNotification`
2. Add `espionageProfile` relation to `GameProfile`
3. Create `src/lib/game/espionage.ts` with:
   - Bracket calculation function
   - Success probability formula
   - Cost calculation per bracket
   - Action definitions (types, base rates, costs, cooldowns)
4. Create `src/lib/game/corporate-security.ts` with:
   - Security level definitions and costs
   - Defense bonus calculations
   - Detection chance calculations
5. Implement API endpoints:
   - `POST /api/space-tycoon/espionage/launch` (Market Recon only)
   - `GET /api/space-tycoon/espionage/profile`
   - `GET /api/space-tycoon/espionage/targets`
   - `POST /api/space-tycoon/espionage/security/upgrade`
6. Add espionage cost to monthly maintenance in `game-engine.ts`
7. Add `'intel'` to `GameTab` type
8. Create `IntelPanel` component with Operations and Security sub-tabs
9. Add 2 tier-1 espionage researches to research tree: `signals_intelligence`, `basic_tradecraft`

**Deliverable**: Players can perform Market Recon, upgrade security, and view intel reports.

---

### Phase 2: Core Actions (Weeks 3-4)

**Goal**: All 11 espionage action types working.

**Tasks**:
1. Implement remaining action handlers in espionage API:
   - Research Probe, Facility Survey, Contract Intel
   - Headhunting (with voucher system)
   - Fleet Tracking, Trade Intercept (with discount)
   - Alliance Dossier, Strategic Assessment
   - Disinformation Campaign
   - Insider Tip
2. Add `DisinformationEffect` model and API
3. Implement per-target cooldown tracking
4. Implement daily action limit with UTC reset
5. Implement per-target incoming limit (5/day)
6. Implement newcomer shield integration
7. Add tier 2-3 espionage researches to research tree
8. Create `IntelReportCard` component for all report types
9. Create Reports sub-tab with filtering and expiry indicators

**Deliverable**: Full espionage action catalog operational.

---

### Phase 3: Counter-Espionage & Loyalty (Weeks 5-6)

**Goal**: Defense, counter-espionage, and workforce loyalty.

**Tasks**:
1. Implement detection system (tied to security level)
2. Implement Trace Operation API and UI
3. Implement Feed False Intel API and UI
4. Implement Blacklist API and UI
5. Implement Heightened Alert buff
6. Add loyalty mechanics to `EspionageProfile`:
   - Loyalty score tracking per worker type
   - Monthly loyalty drift in game engine
   - Loyalty program subscription
7. Implement poaching resistance calculation
8. Add loyalty programs to the Security sub-tab UI
9. Add tier 4 espionage researches
10. Implement `EspionageNotification` delivery system
11. Create Notifications sub-tab

**Deliverable**: Full defensive and counter-espionage toolkit, workforce loyalty system.

---

### Phase 4: Alliance & Polish (Weeks 7-8)

**Goal**: Alliance espionage, notifications, leaderboard integration.

**Tasks**:
1. Add `AllianceEspionageOp` model
2. Implement Alliance Intelligence Sweep
3. Implement Economic Warfare Campaign
4. Implement Defection Encouragement
5. Add alliance espionage UI to Alliance panel (or Intel tab)
6. Add tier 5 espionage researches
7. Integrate Intel Rating into leaderboard
8. Add push notification support for high-priority espionage events
9. Implement intel accuracy degradation system
10. Add "stale" and "archived" intel lifecycle management
11. Comprehensive testing:
    - Unit tests for probability formulas
    - Integration tests for all API endpoints
    - Edge cases: bracket boundary, exact cooldown timing, daily limit reset
12. Performance: index optimization, query efficiency for target listing
13. Balance pass: run Monte Carlo simulations with 100 simulated players to validate:
    - Average espionage success rates per bracket matchup
    - Average intel gathered per day at each security level
    - Cost-benefit of security investment at each bracket
    - Whether disinformation actually changes behavior (requires playtesting)

**Deliverable**: Complete espionage system shipped.

---

### Balance Validation Metrics

After Phase 4, validate against these targets:

| Metric | Target | Acceptable Range |
|--------|--------|-----------------|
| Average success rate (no security) | 65% | 55-75% |
| Average success rate (max security) | 20% | 15-30% |
| Actions per player per day (active players) | 1.5 | 0.5-2.5 |
| % of players who invest in security | 40% | 25-60% |
| Average intel duration before action taken | 8 hours | 2-24 hours |
| % of espionage that gets detected | 35% | 20-50% |
| Monthly espionage cost as % of income | 5% | 2-10% |
| Monthly security cost as % of income | 8% | 3-15% |
| Player complaints about unfairness | < 5% | < 10% |

---

## Appendix: Configuration Constants

```typescript
// src/lib/game/espionage-constants.ts

export const ESPIONAGE_CONSTANTS = {
  // Daily limits
  MAX_ACTIONS_PER_DAY: 3,
  MAX_INCOMING_PER_TARGET_PER_DAY: 5,
  DAILY_RESET_HOUR_UTC: 0, // Midnight UTC

  // Minimum requirements
  MIN_NET_WORTH_TO_ESPIONAGE: 200_000_000,
  NEWCOMER_SHIELD_DAYS: 7,

  // Bracket definitions
  BRACKETS: [
    { id: 0, name: 'Startup', minNetWorth: 0, maxNetWorth: 500_000_000 },
    { id: 1, name: 'LEO Ops', minNetWorth: 500_000_000, maxNetWorth: 5_000_000_000 },
    { id: 2, name: 'Interplanetary', minNetWorth: 5_000_000_000, maxNetWorth: 50_000_000_000 },
    { id: 3, name: 'Deep Space', minNetWorth: 50_000_000_000, maxNetWorth: Infinity },
  ],
  MAX_BRACKET_DISTANCE: 1,

  // Bracket modifiers
  BRACKET_MOD_SAME: 1.0,
  BRACKET_MOD_ATTACK_UP: 0.85,
  BRACKET_MOD_ATTACK_DOWN: 1.10,

  // Repeat penalty
  REPEAT_PENALTY_BASE: 0.8, // 0.8^(n-1) for nth attempt

  // Success rate clamps
  MIN_SUCCESS_RATE: 0.05,
  MAX_SUCCESS_RATE: 0.95,

  // Security upgrade base cost
  SECURITY_UPGRADE_BASE_COST: 10_000_000,
  SECURITY_UPGRADE_EXPONENT: 1.5,

  // Intel durations (hours)
  INTEL_STALE_GRACE_HOURS: 48,
  MAX_STORED_REPORTS: 50,

  // Loyalty
  DEFAULT_LOYALTY: 50,
  MAX_LOYALTY: 100,
  MIN_LOYALTY: 0,

  // Disinformation
  DISINFO_PRICE_DISTORTION_RANGE: 0.08, // +/- 8%
  DISINFO_DURATION_HOURS: 24,

  // Insider tip advance notice
  INSIDER_TIP_ADVANCE_HOURS: 4,

  // Trace operation
  TRACE_COST: 20_000_000,
  TRACE_BASE_SUCCESS: 0.50,
  TRACE_SECURITY_BONUS_PER_LEVEL: 0.05,

  // Feed false intel
  FEED_FALSE_COST: 30_000_000,
  FALSE_INTEL_RESOURCE_DISTORTION: 0.40, // +/- 40% from real values

  // Blacklist
  MAX_BLACKLIST_SIZE: 5,
  BLACKLIST_SUCCESS_RATE_MULTIPLIER: 0.5,

  // Heightened alert
  HEIGHTENED_ALERT_DURATION_HOURS: 4,
  HEIGHTENED_ALERT_DEFENSE_BONUS: 0.15,

  // Headhunt voucher
  HEADHUNT_VOUCHER_DISCOUNT: 0.50,
  HEADHUNT_VOUCHER_DURATION_HOURS: 72,

  // Market discount from trade intercept
  TRADE_INTERCEPT_DISCOUNT: 0.10,
  TRADE_INTERCEPT_DISCOUNT_DURATION_HOURS: 24,

  // Alliance operations
  ALLIANCE_SWEEP_MIN_CONTRIBUTORS: 3,
  ALLIANCE_SWEEP_MAX_CONTRIBUTORS: 5,
  ECONOMIC_WARFARE_DURATION_HOURS: 72,
  ECONOMIC_WARFARE_UPDATE_INTERVAL_HOURS: 4,
  DEFECTION_COOLDOWN_DAYS: 30,
} as const;
```

---

## Appendix: Security Level Cost Table (Exact Values)

| From | To | One-Time Cost | Monthly Cost | Cumulative Monthly |
|------|-----|--------------|-------------|-------------------|
| 0 | 1 | $15.0M | $500K | $500K |
| 1 | 2 | $22.5M | $1.5M | $1.5M |
| 2 | 3 | $33.8M | $4.0M | $4.0M |
| 3 | 4 | $50.6M | $10.0M | $10.0M |
| 4 | 5 | $75.9M | $25.0M | $25.0M |
| 5 | 6 | $113.9M | $60.0M | $60.0M |
| 6 | 7 | $170.9M | $120.0M | $120.0M |
| 7 | 8 | $256.3M | $250.0M | $250.0M |
| 8 | 9 | $384.4M | $500.0M | $500.0M |
| 9 | 10 | $576.7M | $1.0B | $1.0B |

(Formula: `one_time = $10M * (1.5 ^ target_level)`)

Total investment to reach Level 10: ~$1.7B one-time + $1B/month ongoing.

At Deep Space bracket ($50B+ net worth), $1B/month is 1-2% of monthly income -- significant but affordable. At LEO Ops ($500M-$5B), Level 5 at $25M/month represents 5-15% of income -- a meaningful choice.

---

## Appendix: Action Cost Table by Bracket

| Action | Startup ($) | LEO Ops ($) | Interplanetary ($) | Deep Space ($) |
|--------|------------|------------|-------------------|---------------|
| Market Recon | $5M | $15M | $25M | $35M |
| Research Probe | $8M | $23M | $38M | $53M |
| Facility Survey | $10M | $30M | $50M | $70M |
| Contract Intel | $12M | $37M | $62M | $87M |
| Headhunting | $15M | $30M | $45M | $60M |
| Fleet Tracking | $20M | $50M | $80M | $110M |
| Alliance Dossier | $50M | $100M | $150M | $200M |
| Trade Intercept | $8M | $20M | $32M | $44M |
| Strategic Assessment | $100M | $200M | $300M | $400M |
| Disinformation | $25M | $65M | $105M | $145M |
| Insider Tip | $30M | $60M | $90M | $120M |

(Formula: `cost = base_cost + (bracket_id * bracket_multiplier)`)
