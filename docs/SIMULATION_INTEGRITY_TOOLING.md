# Simulation Integrity — Admin Tooling Specification

Complement to the "Simulation Integrity" section of [POLICY.md](POLICY.md).

POLICY.md commits us publicly to: quarterly balance reviews, exploit response playbooks with defined SLAs, rollback-and-escrow tooling, anti-RMT enforcement, and public post-mortems. This document is the **engineering specification** for the tooling that fulfills those commitments.

## Scope of this doc

- What needs to be built.
- Rough data model for each piece.
- API surfaces.
- Admin UI shape.
- Phasing / priority.

**Out of scope:** actual implementation. This is a roadmap, not working code. Implementation should land as discrete features after explicit product scoping.

---

## Phase S1 — Exploit Report intake (2-3 hrs)

### Problem
POLICY.md promises P0/P1/P2 triage with hour-measured SLAs. Today there's no place to receive a report.

### Data model

```prisma
model ExploitReport {
  id             String   @id @default(cuid())
  reporterEmail  String?
  reporterUserId String?
  title          String
  description    String   @db.Text
  reproductionSteps String? @db.Text
  severitySuggested String? // 'p0' | 'p1' | 'p2' | 'info'
  severityAssigned  String? // set by staff triage
  status            String   @default("new") // 'new' | 'triaging' | 'reproduced' | 'fixing' | 'resolved' | 'duplicate' | 'invalid'
  relatedCommits    String?  @db.Text // comma-separated SHA list
  relatedPostMortemUrl String?
  discoveredAt   DateTime @default(now())
  triagedAt      DateTime?
  resolvedAt     DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([status])
  @@index([severityAssigned])
  @@index([discoveredAt])
}
```

### API surface

- `POST /api/admin/exploits` — public-ish (rate-limited), accepts a report. Authenticated submissions (logged-in players) get a reputation-weighted priority bump.
- `GET /api/admin/exploits?status=<>` — admin-only list.
- `PATCH /api/admin/exploits/[id]` — admin-only update (status, severity, related commits, post-mortem URL).
- `POST /api/admin/exploits/[id]/post-mortem` — admin-only, marks resolved and publishes a public post-mortem URL.

### Admin UI

- `/admin/exploits` — Kanban-style board with 6 columns: new, triaging, reproduced, fixing, resolved, closed. Badges show SLA remaining (P0: 2h, P1: 24h, P2: 72h). Overdue items turn red.
- `/admin/exploits/[id]` — detail view with reporter info, description, repro, triage notes, related-commits input, post-mortem field.

### Public-facing

- `/security` — landing page listing responsible disclosure instructions and a link to submit a report. Also lists public post-mortems.

---

## Phase S2 — Balance Health Report (3-4 hrs)

### Problem
POLICY.md promises a **quarterly published economic health report** covering median corp net worth, inequality (Gini), price stability of core commodities, faction balance, new-player retention, P&L distribution. Today no such report exists.

### Data model

```prisma
model BalanceReport {
  id               String   @id @default(cuid())
  generatedAt      DateTime @default(now())
  periodStart      DateTime
  periodEnd        DateTime
  activePlayerCount Int
  medianNetWorth   BigInt
  p90NetWorth      BigInt
  giniCoefficient  Float    // 0-1, economic inequality
  corpTierDistribution Json // { tier1: count, ..., tier7: count }
  commodityStability Json   // { iron: { minPrice, maxPrice, volatility }, ... }
  factionBalance   Json     // { dominion: avgRep, ..., remnants: avgRep }
  newPlayerRetention7d Float // 0-1
  newPlayerRetention30d Float // 0-1
  exploitCount     Int
  rmtBans          Int
  publishedAt      DateTime?
  publicUrl        String?

  @@index([generatedAt])
  @@index([publishedAt])
}
```

### Generation

- A scheduled cron job (`balance-report-quarterly: 0 12 1 */3 *` — noon on 1st of every 3rd month) runs a materialization query over the prior 90 days of GameProfile + MarketResource + MarketPriceCandle + exploit records, computes the Gini, writes a row.
- Staff review, add commentary, then `publishedAt` is set and the report becomes public at `/balance/YYYY-Qn`.

### Admin UI

- `/admin/balance-reports` — list of generated reports, drafts vs published, edit commentary.

### Public-facing

- `/balance` — archive of all published balance reports. Each report shows the quantitative tables + staff commentary on notable shifts, concentrations, and planned adjustments.

---

## Phase S3 — Rollback & Escrow toolkit (4-6 hrs)

### Problem
POLICY.md promises 72-hour rollback windows for P0 exploits. Today there's no mechanism to reverse an individual player's economic state to a prior snapshot.

### Data model

```prisma
model EconomicSnapshot {
  id           String   @id @default(cuid())
  gameProfileId String
  takenAt      DateTime @default(now())
  trigger      String   // 'daily_auto' | 'pre_rollback' | 'manual_admin'
  snapshot     Json     // full GameState serialization
  diskBytes    Int      // for retention budgeting

  @@index([gameProfileId, takenAt])
  @@index([takenAt])
}

model RollbackAction {
  id              String   @id @default(cuid())
  reason          String
  relatedExploitId String?
  targetedProfileIds String[] // profiles to roll back
  snapshotTimestamp DateTime // restore to this cutoff
  status          String   @default("proposed") // 'proposed' | 'approved' | 'executing' | 'completed' | 'rejected' | 'rolled_forward'
  proposedByUserId String
  approvedByUserId String?
  executedAt      DateTime?
  publicNoticeText String? @db.Text
  publicNoticePublishedAt DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([status])
  @@index([relatedExploitId])
}
```

### Operational flow

1. Exploit reported, P0 severity confirmed.
2. Engineer identifies affected-profile set (via server logs or market anomaly detection).
3. Engineer drafts RollbackAction with proposed snapshot timestamp and profile list.
4. A second staff member approves (dual-control for reversibility).
5. Public notice is drafted and approved.
6. Public notice is published 24 hours before execution.
7. Execution: iterate affected profiles, load snapshot, replace current state.
8. Status → completed; public notice → "executed" confirmation appended.

### API surface

- `POST /api/admin/rollback/propose` — authenticated, requires exploit ID.
- `POST /api/admin/rollback/[id]/approve` — different staff member required.
- `POST /api/admin/rollback/[id]/execute` — only after public notice + 24h window.

### Snapshot retention policy

- Daily auto-snapshots retained 14 days.
- Pre-rollback snapshots retained 90 days (forensic requirement).
- Manual admin snapshots retained 1 year.

---

## Phase S4 — RMT detection + enforcement (4-5 hrs)

### Problem
POLICY.md commits to **active detection** of real-money trading. Today there's no detection.

### Detection heuristics (candidate list)

1. **Asymmetric trade partners:** Account A consistently sells to Account B below market price; Account B consistently pays above-market. (Signature of RMT fulfillment.)
2. **New-account liquidity drop:** Fresh accounts that receive large resource transfers in their first 24 hours without a plausible earning trajectory.
3. **Time-synced activity:** Pairs of accounts that log in within the same 90-second window consistently across days. (Fulfillment workflow signature.)
4. **IP pooling:** Multiple accounts from the same IP + the same game-state patterns. (Farmer network signature.)
5. **External reporting channel:** Players can flag suspected RMT counterparties.

### Data model

```prisma
model RmtSignal {
  id           String   @id @default(cuid())
  profileId    String
  signalType   String   // one of the heuristics above
  score        Float    // 0-100 confidence
  evidence     Json
  generatedAt  DateTime @default(now())
  reviewed     Boolean  @default(false)
  reviewedAt   DateTime?
  outcome      String?  // 'confirmed_rmt' | 'false_positive' | 'needs_more_data'

  @@index([profileId])
  @@index([reviewed, score])
}

model RmtEnforcementAction {
  id          String   @id @default(cuid())
  profileId   String
  action      String   // 'warning' | 'suspension_7d' | 'suspension_30d' | 'ban_permanent'
  reason      String
  evidenceIds String[]
  enactedByUserId String
  enactedAt   DateTime @default(now())
  appealStatus String? // 'none' | 'pending' | 'denied' | 'upheld'

  @@index([profileId])
}
```

### Admin UI

- `/admin/rmt/signals` — table of pending RMT signals by score, reviewer assignment, evidence.
- `/admin/rmt/actions` — record of enforcement actions, appeal review queue.

---

## Phase S5 — Public post-mortem page (1-2 hrs)

### Problem
POLICY.md commits to a **post-mortem within 14 days** of any exploit resolution. No public page.

### Implementation

- Simple static route at `/post-mortems` and `/post-mortems/[slug]`.
- Each post-mortem is a Markdown file in `public/post-mortems/*.md` or a DB-stored record.
- Pulled from `ExploitReport.relatedPostMortemUrl` when status is `resolved`.

### Template (in `docs/post-mortem-template.md` — not created yet)

```markdown
# [Short title]

**Severity:** P[0|1|2]
**Reported:** YYYY-MM-DD
**Resolved:** YYYY-MM-DD
**Affected players:** [number or "unknown, estimated N"]

## Summary

One-paragraph description.

## Timeline

- YYYY-MM-DD HH:MM — discovery
- YYYY-MM-DD HH:MM — triage
- YYYY-MM-DD HH:MM — fix deployed
- YYYY-MM-DD HH:MM — rollback executed (if applicable)

## Root cause

Technical explanation.

## What changed

- Code changes (with commit links).
- Process changes (if any).

## Compensation

If affected-player compensation was issued, describe the amount and criteria.

## Prevention

What we're doing to prevent recurrence.
```

---

## Phasing recommendation

| Phase | Title | Effort | Priority |
|---|---|---|---|
| S1 | Exploit Report intake | 2-3 hrs | **Now** — can't receive reports without it |
| S5 | Public post-mortem page | 1-2 hrs | Alongside S1 — credibility requires transparency |
| S2 | Balance Health Report | 3-4 hrs | Quarterly cadence; first report target Q1 post-launch |
| S4 | RMT detection | 4-5 hrs | Before monetization opens at scale |
| S3 | Rollback toolkit | 4-6 hrs | Only needed once a real P0 has happened or is likely |

## Checklist for simulation-integrity work

- [ ] Does this build on or extend the existing Prisma schema additively (no column removals without migration plan)?
- [ ] Is every admin action gated by admin-role authentication (existing `User.isAdmin`)?
- [ ] Is every destructive action double-confirmed (e.g. rollback requires two staff)?
- [ ] Is every public-facing surface (reports, post-mortems) linked from `/security` for easy audit trails?
- [ ] Does the feature respect data/privacy commitments in POLICY.md?
