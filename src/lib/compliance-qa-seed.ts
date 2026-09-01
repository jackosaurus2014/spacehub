/**
 * Export Compliance Q&A — curated starter FAQ (2026-08-31 freshness audit,
 * item 3).
 *
 * The /export-compliance-qa funnel shipped 2026-08-17 (ask form + admin
 * answer flow, E2E verified), but no question was ever answered and
 * published, so the public page showed "No answered questions yet" — and the
 * FAQPage JSON-LD never rendered. These are REAL, sourced ITAR/EAR answers
 * (facts verified against ecfr.gov / federalregister.gov / bis.doc.gov /
 * pmddtc.state.gov, 2026-08-31) seeded through the founder-answer flow's own
 * table so the page has honest substance from day one. Reader-submitted
 * questions continue to flow through the normal ask -> founder-answer path.
 *
 * Seeding: POST /api/compliance/questions/init (CRON_SECRET-authed, CSRF
 * exempt via the /init suffix). Idempotent — keyed on exact question text,
 * existing rows are never overwritten (a founder-edited answer wins forever).
 *
 * Editorial rules for this list:
 *  - Stable regulatory citations only (CFR sections, published final rules);
 *    no volatile figures like fee schedules that drift year to year.
 *  - Every answer ends with plain-text sources (the list renders as
 *    whitespace-pre-wrap plain text) and stays general information, never
 *    legal advice — the page carries the standing disclaimer.
 */

export interface ComplianceQaSeedItem {
  question: string;
  answer: string;
  /** Stable date so re-seeding doesn't shuffle the published order. */
  answeredAt: string;
}

export const COMPLIANCE_QA_SEED: ComplianceQaSeedItem[] = [
  {
    question: 'What is the difference between ITAR and EAR, and how do I know which one covers my space product?',
    answer:
      'ITAR (International Traffic in Arms Regulations, 22 CFR parts 120-130) is administered by the State Department’s Directorate of Defense Trade Controls (DDTC) and covers defense articles, defense services, and related technical data enumerated on the U.S. Munitions List (USML). EAR (Export Administration Regulations, 15 CFR parts 730-774) is administered by the Commerce Department’s Bureau of Industry and Security (BIS) and covers commercial and dual-use items on the Commerce Control List (CCL), plus the EAR99 catch-all.\n\nFor space hardware, the dividing line runs through USML Category XV (spacecraft and related articles) versus the CCL’s “500 series” (ECCNs 9A515, 9B515, 9D515, 9E515). If your item is described in Category XV — e.g., spacecraft with certain military, intelligence, or high-end remote-sensing capabilities — it is ITAR. Most commercial satellites and their specially designed parts sit in 9x515 under the EAR. When you are not sure, the formal answer is a Commodity Jurisdiction (CJ) determination from DDTC; for classification within the EAR you can self-classify or request a CCATS ruling from BIS.\n\nSources: ecfr.gov (22 CFR 120-130; 15 CFR 730-774), pmddtc.state.gov (Commodity Jurisdiction), bis.doc.gov (CCL Category 9).',
    answeredAt: '2026-08-31T12:00:00.000Z',
  },
  {
    question: 'Are commercial communications satellites still ITAR-controlled?',
    answer:
      'Mostly no — since the 2014 export control reform, the majority of commercial satellites are controlled under the EAR, not ITAR. The State and Commerce Departments’ final rules of May 13, 2014 (79 FR 27180 and 79 FR 27417) moved commercial communications satellites and many remote-sensing spacecraft from USML Category XV to the new 9x515 ECCNs on the Commerce Control List. The transfer took effect in two stages: June 27, 2014 for radiation-hardened microelectronic circuits and November 10, 2014 for everything else.\n\nWhat stays ITAR: spacecraft described in the revised USML Category XV — for example those with certain military or intelligence missions or capabilities beyond the published performance thresholds — plus defense services related to them. And note that EAR control is not “no control”: 9x515 items generally require a BIS license to most destinations, and launches from or exports to China, Russia, and other restricted destinations face near-blanket prohibitions.\n\nSources: federalregister.gov/documents/2014/05/13/2014-10807 (Commerce final rule), 22 CFR 121.1 Category XV (ecfr.gov), bis.doc.gov.',
    answeredAt: '2026-08-31T12:01:00.000Z',
  },
  {
    question: 'What is EAR99, and does an EAR99 item ever need an export license?',
    answer:
      'EAR99 is the designation for items that are subject to the EAR but not described by any ECCN on the Commerce Control List — the low-technology, mass-market end of the spectrum. Most EAR99 exports ship “NLR” (no license required).\n\nBut EAR99 is not a free pass. A license (or outright prohibition) can still apply based on WHERE it is going, WHO receives it, and WHAT it will be used for: embargoed or sanctioned destinations (e.g., the comprehensive embargoes in 15 CFR part 746), restricted parties (Entity List, Denied Persons List, SDN List — screen every transaction), and prohibited end uses such as missile, nuclear, or chemical/biological weapons activity under 15 CFR part 744. In the space supply chain this matters constantly: an EAR99 fastener is uncontrolled to a French integrator and prohibited to a listed entity.\n\nSources: 15 CFR 734.3 and part 744, part 746 (ecfr.gov), bis.doc.gov Consolidated Screening List.',
    answeredAt: '2026-08-31T12:02:00.000Z',
  },
  {
    question: 'What is a “deemed export,” and why does it matter when hiring engineers?',
    answer:
      'A deemed export is the release of controlled technical data or technology to a foreign person INSIDE the United States — the law treats it as an export to that person’s country (or countries) of citizenship or permanent residency, even though nothing crossed a border. Under ITAR this is part of the definition of “export” at 22 CFR 120.50 (release of technical data to a foreign person in the United States); the EAR equivalent is 15 CFR 734.13(a)(2) and (b).\n\nPractical consequence for space companies: giving a foreign-national employee, intern, or visitor access to ITAR technical data or EAR-controlled technology — through documents, CAD models, oral discussion, or even visual inspection of hardware that reveals technical data — can require a license BEFORE access is granted (DDTC authorization on the ITAR side, a BIS deemed-export license on the EAR side). “U.S. person” for these purposes includes U.S. citizens, lawful permanent residents (green-card holders), and protected individuals under 8 U.S.C. 1324b(a)(3) — visa status alone (H-1B, F-1, etc.) does not make someone a U.S. person. Most companies handle this with technology control plans and access segregation.\n\nSources: 22 CFR 120.50, 120.62-120.63 (ecfr.gov), 15 CFR 734.13 (ecfr.gov), bis.doc.gov deemed-exports FAQ.',
    answeredAt: '2026-08-31T12:03:00.000Z',
  },
  {
    question: 'We manufacture ITAR-controlled hardware but never export anything. Do we still have to register with DDTC?',
    answer:
      'Yes. Registration with DDTC is required for any person in the United States who engages in manufacturing, exporting, temporarily importing, or brokering defense articles or defense services — and the manufacturing prong applies EVEN IF you never export. 22 CFR 122.1(a) is explicit that manufacturers who do not engage in exporting must nevertheless register.\n\nRegistration is an annual obligation with a tiered fee (see DDTC’s current fee schedule — it changes, so check pmddtc.state.gov rather than relying on a number you read somewhere). Registration itself confers no export rights; it is a precondition for licensing and a basic compliance obligation. Failing to register is one of the most common — and most avoidable — ITAR violations among small space-hardware suppliers, machine shops, and startups that build to a prime’s USML spec.\n\nSources: 22 CFR part 122 (ecfr.gov), pmddtc.state.gov registration guidance.',
    answeredAt: '2026-08-31T12:04:00.000Z',
  },
  {
    question: 'Can we launch our U.S.-built satellite on a foreign rocket, or share interface data with a foreign launch provider?',
    answer:
      'Often yes, but the data exchange is itself a controlled export. Providing a foreign launch provider with your satellite’s interface control documents, environmental test data, or integration support involves exporting technical data (ITAR) or technology (EAR) and, for ITAR items, potentially performing or receiving defense services — all of which need authorization first (e.g., a DDTC Technical Assistance Agreement for ITAR programs, or a BIS license for 9x515 technology where required).\n\nDestination matters enormously. Exports of satellites to — or launches from — China are effectively prohibited: 9x515 items face a policy of denial for China under the EAR, and ITAR items are barred by the 22 CFR 126.1 proscribed-destinations policy. Russia is similarly foreclosed under post-2022 sanctions and license requirements. Launching with established partners in ITAR/EAR-friendly jurisdictions (ESA members, Japan, India, New Zealand) is routine but still license-managed. Build the licensing timeline into your launch campaign schedule — agreements can take months.\n\nSources: 22 CFR 124 (agreements) and 126.1 (ecfr.gov), 15 CFR 742.6 and 746.8 (ecfr.gov), pmddtc.state.gov.',
    answeredAt: '2026-08-31T12:05:00.000Z',
  },
  {
    question: 'What are the penalties for ITAR or EAR violations?',
    answer:
      'They are severe, and they apply per violation — a single program can generate dozens.\n\nITAR: criminal penalties under the Arms Export Control Act (22 U.S.C. 2778(c)) run up to $1,000,000 in fines and up to 20 years imprisonment per willful violation. Civil penalties are set by statute and adjusted for inflation annually — currently over $1 million per violation — and DDTC can also debar you from exporting entirely.\n\nEAR: under the Export Control Reform Act (50 U.S.C. 4819), criminal penalties reach $1,000,000 and 20 years per willful violation; civil penalties are the greater of an inflation-adjusted statutory amount (in the $300,000+ range, adjusted annually) or twice the value of the transaction, plus denial of export privileges and Entity List exposure.\n\nBeyond fines: companies lose export privileges, get suspended from government contracting, and carry mandatory compliance monitors for years. Voluntary self-disclosure is a significant mitigating factor under both regimes (22 CFR 127.12; 15 CFR 764.5) — if you find a problem, talk to counsel about disclosing before the government finds it first.\n\nSources: 22 U.S.C. 2778(c), 50 U.S.C. 4819, 22 CFR 127.12, 15 CFR 764.5 (ecfr.gov), bis.doc.gov enforcement.',
    answeredAt: '2026-08-31T12:06:00.000Z',
  },
  {
    question: 'Does publishing our research or posting technical specs online count as an export?',
    answer:
      'Genuinely public information is generally NOT controlled — but the act of making controlled data public without authorization can itself be a violation, so the order of operations matters.\n\nUnder the EAR, “published” information and the results of fundamental research (basic and applied research in science and engineering, performed and ordinarily published without proprietary or government access restrictions) are not subject to the EAR at all (15 CFR 734.7-734.8). Under ITAR, the “public domain” carve-out at 22 CFR 120.34 covers information published through unrestricted channels — but ITAR technical data does not become public just because someone posts it; releasing ITAR technical data onto the open internet without authorization is treated as an unauthorized export.\n\nPractical guidance for space startups: marketing-level specs (mass, orbit, generic performance) are fine; detailed design, build-to specifications, test procedures, and anything revealing how to develop or produce controlled hardware are where trouble lives. University fundamental research keeps its exclusion only while publication is unrestricted — accepting publication-restricted or access-restricted contract clauses can forfeit it.\n\nSources: 15 CFR 734.7, 734.8 (ecfr.gov), 22 CFR 120.33-120.34 (ecfr.gov).',
    answeredAt: '2026-08-31T12:07:00.000Z',
  },
];
