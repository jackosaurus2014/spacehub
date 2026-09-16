# LinkedIn post — SpaceNexus — drafted 2026-09-15

**Status:** ready to post. Outbound is gated on Jay.

**Fact-check:** every company detail below was read directly from the UK
Companies House REST API on 2026-09-15, not from a search-result summary and
not from secondary coverage. Company numbers are included here for the record
so any claim can be re-checked in one request; drop them from the posted text
if it reads too dense.

- Orbital Express Launch Limited — 09580714 — status `administration`,
  `has_insolvency_history: true`, accounts and confirmation statement both
  overdue, previous name MOONSPIKE LIMITED until 2016-01-29.
- Rebellion Defence Limited — 11963872 — status `dissolved`, ceased
  2024-09-10, `has_insolvency_history: false`.
- Asteroid Mining Corporation Limited — 10085157 — status `active`, accounts
  overdue since 2025-03-31, confirmation statement overdue since 2025-08-26.

**A claim I had to correct before posting:** my first draft said searching the
former name "Pulsar Fusion" returns nothing. It does not — the register
matches former names and returns PULSAR AEROSPACE LIMITED (11914684,
previously PULSAR FUSION LTD until 2025-08-20) as the top hit. The line now
says what is actually true, which is the subtler and more useful point.

**One caution kept in the copy:** Rebellion Defence Limited is the UK entity.
The post says so explicitly, because a dissolved subsidiary is not the same
claim as a dead company and we should not imply the second.

---

## Post

Search the UK company register for "Orbex" and you will not find Orbex.

The launch company the industry knows by that name is registered as Orbital Express Launch Limited. Until 2016 it was called Moonspike. Search the actual word "Orbex" and your top result is a mail-order retail business incorporated this May at a London formation address, with nothing to do with rockets.

We hit this while rebuilding how SpaceNexus tracks company status, and the detour turned out to be the interesting part.

Company registers are free, official, and updated continuously. They will tell you that a company has entered administration, missed its accounts by eighteen months, quietly changed its name, or been dissolved outright. Almost nobody reads them, for a mundane reason: everything is filed under legal names, and legal names are not the names anyone searches for.

Three things the register told us that our own database had wrong:

Orbex is in administration — a specific legal state with an appointed administrator — rather than the vaguer "ceased trading" most coverage uses. Its accounts and confirmation statement are both overdue.

Rebellion Defence's UK entity was dissolved in September 2024, with no insolvency history recorded against it.

Asteroid Mining Corporation is still listed as active, but its accounts have been overdue since March 2025 and its confirmation statement since last August.

Pulsar Fusion shows where this gets quietly dangerous. It became Pulsar Aerospace Limited in August 2025. Search the old name and the register does find it — but hands back a different name, which is precisely the point at which an automated match gives up and records nothing.

None of this is hidden. It is published by a government registrar and it costs nothing. It is just inconvenient enough that it goes unread, and so an industry keeps citing a company's status from a press release written two years ago.

We were wrong about three of our own until we checked. Which is rather the point of checking.
