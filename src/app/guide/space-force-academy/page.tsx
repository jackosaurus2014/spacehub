import type { Metadata } from 'next';
import Link from 'next/link';
import HeroArt from '@/components/ui/HeroArt';
import ScrollReveal from '@/components/ui/ScrollReveal';
import GuideNavigation from '@/components/guide/GuideNavigation';
import ReadingTime from '@/components/ui/ReadingTime';
import RelatedModules from '@/components/ui/RelatedModules';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import NewsCard from '@/components/NewsCard';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { getSpaceAcademyNewsArticles } from '@/lib/space-academy-news';

// "Space Force Academy" explainer (2026-09-09). The executive order of
// August 28, 2026 creates a commission, not an academy, and the institution
// it describes is a NASA-led federal academy rather than a Department of War
// service academy — most search traffic will arrive with the wrong mental
// model. This page states what the order actually does, what the commission
// must decide by late December, what implementation could look like under
// the three models the order leaves open, and where the site fight stands.
// Everything in the FACTS block is sourced; everything under "What it could
// look like" is labelled as analysis. The news rail keeps the page honest as
// the commission reports.
export const revalidate = 900;

const SLUG = 'space-force-academy';
const CANONICAL = `https://spacenexus.us/guide/${SLUG}`;
const TITLE = 'The U.S. Space Academy Explained: What the Executive Order Does, How a "Space Force Academy" Would Work, and Where It Could Be Built';
const DESCRIPTION =
  'President Trump signed an order on August 28, 2026 creating a commission to design a NASA-led U.S. Space Academy. What the order actually does, the 120-day report due in late December, the three ways it could be built, and the Texas, Florida, Alabama and Colorado bids for the campus.';
/** Bumped by hand when the prose changes. */
const LAST_EDITED = '2026-09-09T12:00:00Z';
/** The order's 120-day clock. */
const ORDER_SIGNED = '2026-08-28';
const REPORT_DUE = '2026-12-26';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['space force academy', 'us space academy', 'space academy executive order', 'space academy location', 'space force academy location', 'space academy commission isaacman', 'space academy florida', 'space academy houston', 'space academy huntsville', 'space academy colorado springs'],
  alternates: { canonical: CANONICAL },
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'article', publishedTime: LAST_EDITED, modifiedTime: LAST_EDITED, authors: ['SpaceNexus Team'], url: CANONICAL },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

const TOC = [
  { id: 'verdict', label: 'The short answer' },
  { id: 'order', label: 'What the executive order actually does' },
  { id: 'commission', label: 'Who is on the commission' },
  { id: 'report', label: 'The nine things the report must decide' },
  { id: 'why', label: 'Why now — and the case against' },
  { id: 'models', label: 'Three ways it could be built' },
  { id: 'timeline', label: 'A realistic timeline' },
  { id: 'locations', label: 'Where it could be built: the bids' },
  { id: 'criteria', label: 'What will decide the site' },
  { id: 'news', label: 'Latest Space Academy news (live)' },
  { id: 'faq', label: 'Space Academy FAQ' },
];

const COMMISSION = [
  { role: 'Chair', who: 'Jared Isaacman', title: 'NASA Administrator' },
  { role: 'Vice Chair', who: 'Michael Kratsios', title: 'Assistant to the President for Science and Technology' },
  { role: 'Vice Chair', who: 'Kevin Hassett', title: 'Assistant to the President for Economic Policy' },
  { role: 'Executive Director', who: 'Matt Anderson', title: 'NASA Deputy Administrator' },
  { role: 'Member', who: 'Pete Hegseth', title: 'Secretary of War' },
  { role: 'Member', who: 'Troy Meink', title: 'Secretary of the Air Force' },
  { role: 'Member', who: '—', title: 'Assistant to the President and Chief of Staff' },
  { role: 'Member', who: '—', title: 'Director of the Office of Management and Budget' },
  { role: 'Member', who: '—', title: 'Assistant to the President for National Security Affairs' },
  { role: 'Members', who: 'at the Chair’s discretion', title: 'Other federal employees' },
];

const REPORT_ITEMS = [
  { t: 'Governance', d: 'A governance framework, organizational structure, legal authorities and accreditation options.' },
  { t: 'Curriculum', d: 'The academic and leadership curriculum, degree programs and experiential training.' },
  { t: 'Service obligation', d: 'What graduates owe afterwards — including service in the Armed Forces and civilian federal service.' },
  { t: 'Who can apply', d: 'Applicant prerequisites, including citizenship, security clearances and employment status.' },
  { t: 'The site', d: 'A process for selecting a permanent physical location — a process, not a place.' },
  { t: 'Executive actions', d: 'What can be done now under existing authorities.' },
  { t: 'Legislation', d: 'What Congress must authorize — and, separately, fund.' },
  { t: 'Coordination', d: 'How the academy fits with existing federal education programs, including the service academies.' },
  { t: 'Implementation', d: 'A strategy with timelines and sequencing.' },
];

type Bid = {
  place: string;
  state: string;
  backers: string;
  pitch: string;
  assets: string;
  drag: string;
  status: string;
};

const BIDS: Bid[] = [
  {
    place: 'Houston — near Johnson Space Center',
    state: 'Texas',
    backers: 'Sen. Ted Cruz and Texas lawmakers',
    pitch: 'The order was signed at JSC, the academy is NASA-led, and JSC is where astronauts are trained and human spaceflight is run.',
    assets: 'Mission Control, the Astronaut Office, Rice and Texas A&M partnerships, a deep human-spaceflight contractor base.',
    drag: 'No launch site, no Space Force operational presence, and Houston land is not federal.',
    status: 'Declared',
  },
  {
    place: 'Space Coast — Kennedy, Cape Canaveral SFS, Patrick SFB',
    state: 'Florida (bid 1 of 2)',
    backers: 'Sen. Ashley Moody, Sen. Rick Scott, Reps. Haridopolos, Franklin, Diaz-Balart, Donalds, Luna, Buchanan, Gimenez, Patronis, Soto and Castor',
    pitch: '“Florida built America’s space program. It should build the next generation.” Moody said on September 8 she will file the CAPE Canaveral Act to put the academy on the Space Coast.',
    assets: 'Active launch pads a few miles away, Space Launch Delta 45, federal land at Kennedy and Patrick, the densest commercial launch cluster on Earth.',
    drag: 'Two Florida bids split the state’s case; hurricane exposure; the delegation’s bill still needs a vote.',
    status: 'Declared, bipartisan delegation letter and pending bill',
  },
  {
    place: 'Orlando — Orange County / University of Central Florida',
    state: 'Florida (bid 2 of 2)',
    backers: 'Orange County leaders',
    pitch: 'UCF was founded in 1963 as Florida Technological University specifically to feed NASA, sits about 35 miles from Kennedy, and Orlando has the airport and housing a campus needs.',
    assets: 'A large existing research university, simulation and training industry, a major airport.',
    drag: 'Competes with its own state’s Space Coast bid; further from the pads and from any federal land.',
    status: 'Declared',
  },
  {
    place: 'Huntsville — Redstone Arsenal',
    state: 'Alabama',
    backers: 'Alabama officials (the state’s delegation has not published a formal bid as of September 9)',
    pitch: 'U.S. Space Command is moving to Redstone — 200 personnel by the end of 2026, a new headquarters breaking ground in 2027 — next door to Marshall Space Flight Center and the Army’s space and missile defense community.',
    assets: 'Federal land at Redstone, Marshall, the Missile Defense Agency, one of the country’s highest concentrations of engineers per capita.',
    drag: 'Space Command is a combatant command, not an education pipeline; no launch site; the state just won one relocation fight and may not win two.',
    status: 'Floated',
  },
  {
    place: 'Colorado Springs — Peterson / Schriever SFB, USAFA',
    state: 'Colorado',
    backers: 'Floated by analysts; Colorado’s delegation has been quiet',
    pitch: 'Space Force headquarters, Space Operations Command, Space Training and Readiness Command and the Air Force Academy — which already commissions about a tenth of each class into the Space Force — are all here.',
    assets: 'The entire Space Force training ecosystem, federal land, an academy-town infrastructure that already exists.',
    drag: 'Being next to the Air Force Academy is the argument against as much as for: a NASA-led civilian academy co-located with a military one invites the duplication critique.',
    status: 'Floated',
  },
];

/** Kept current by hand as bids move; the date is shown on the page. */
const BIDS_CHECKED = 'September 9, 2026';
const BID_TRACKER: Array<{ who: string; status: string; tone: 'up' | 'watch' | 'flat' }> = [
  { who: 'Florida — Space Coast', status: 'Sen. Moody announced the CAPE Canaveral Act on Sept 8 with Sen. Scott and ten House members from both parties; to be filed when the Senate reconvenes. No bill number yet.', tone: 'up' },
  { who: 'Florida — Orlando / UCF', status: 'Orange County bid announced; competes with the Space Coast bid for the same delegation.', tone: 'watch' },
  { who: 'Texas — Houston / JSC', status: 'Sen. Cruz and Texas lawmakers lobbying; no bill filed.', tone: 'watch' },
  { who: 'Alabama — Huntsville', status: 'Floated on the back of the Space Command move; no formal bid published.', tone: 'flat' },
  { who: 'Colorado — Colorado Springs', status: 'Floated by analysts only; the delegation has not made a public case.', tone: 'flat' },
  { who: 'White House', status: 'Location not chosen; commission report due within 120 days of Aug 28.', tone: 'watch' },
];

const CRITERIA = [
  { t: 'Federal land', d: 'A campus on land the government already owns avoids a purchase and years of environmental review. Kennedy, Patrick, Redstone, Peterson and Schriever all qualify; Houston and Orlando would need a land deal or a donated site.' },
  { t: 'What students can touch', d: 'The order wants “experiential training”. Launch pads, a mission control, an operational Space Force delta or an astronaut office within a short drive is the difference between a campus and a field trip.' },
  { t: 'A university partner', d: 'Accreditation is on the report’s list. New institutions usually open under an existing accredited partner before standing alone — the Air Force Academy’s first class started in 1955 at Lowry Air Force Base in Denver, three years before Colorado Springs opened. UCF, Rice, Texas A&M, Florida Tech, Alabama-Huntsville and UCCS are the obvious partners in the bidding regions.' },
  { t: 'Congressional muscle', d: 'The academy needs an authorization and then an appropriation. Florida has filed first and has both senators plus a bipartisan House group; Texas has Cruz, who chairs the Senate committee that oversees NASA.' },
  { t: 'Cost of living and housing', d: 'Cadets are cheap to house; faculty are not. This is Orlando’s and Huntsville’s quiet advantage over Houston and the Space Coast.' },
  { t: 'Politics', d: 'The president said he will choose the site “very shortly” and that “everybody wants it”. The order gives the commission a process to recommend; it does not bind the choice.' },
];

const FAQ = [
  { q: 'Is there a Space Force Academy?', a: 'Not yet. On August 28, 2026 President Trump signed an executive order titled “Establishing the United States Space Academy”. It does not open a school; it creates a presidential commission, chaired by NASA Administrator Jared Isaacman, that must report within 120 days on how to build one. Space Force officers today come from the Air Force Academy, ROTC and Officer Training School.' },
  { q: 'Is the Space Academy a military service academy like West Point?', a: 'Not as written. The order describes “a NASA-led Federal academy”, and a NASA official told CNN it is “a civilian — and a very distinct difference here — federal academy, not a service academy.” The commission must still recommend service obligations “including service in the Armed Forces”, so a commissioning track is possible; the model is closer to the Merchant Marine Academy at Kings Point than to West Point.' },
  { q: 'Where will the U.S. Space Academy be located?', a: 'No site has been chosen. The order asks the commission for a process to select a permanent location, and the president has said he will pick one “very shortly”. Declared or floated bids as of September 9, 2026: Houston near Johnson Space Center (Texas), Florida’s Space Coast and, separately, Orlando/UCF (two Florida bids), Huntsville’s Redstone Arsenal (Alabama) and Colorado Springs (Colorado).' },
  { q: 'When does the commission report?', a: 'Within 120 days of August 28, 2026 — by about December 26, 2026, “by Christmas” in the shorthand of people briefed on it. The report goes to the president through the science and economic policy assistants who serve as the commission’s vice chairs.' },
  { q: 'When could the first class start?', a: 'No official date exists. Our estimate: the earliest plausible first class is 2029–2030, and only if Congress authorizes the academy in the next defense or NASA bill and funds it, and the first cohort starts on a partner campus while a permanent one is built — the path the Air Force Academy took in 1954–1958. A greenfield campus with its own accreditation is a longer road.' },
  { q: 'Who is on the Space Academy commission?', a: 'Chair: NASA Administrator Jared Isaacman. Vice chairs: Michael Kratsios (science and technology) and Kevin Hassett (economic policy). Executive director: NASA Deputy Administrator Matt Anderson. Members: the Secretary of War (Pete Hegseth), the Secretary of the Air Force (Troy Meink), the White House Chief of Staff, the OMB Director, the National Security Advisor and others the chair invites. No members of Congress sit on it, which Rep. Zoe Lofgren has said “is going to have to change”.' },
  { q: 'How much would a Space Academy cost?', a: 'The order does not say and makes everything “subject to the availability of appropriations”. CNN reported the running cost could approach $1 billion a year, comparable to the existing service academies. A campus is a separate capital bill.' },
  { q: 'Does the Space Force need it?', a: 'The Space Force is small — the fiscal 2027 request would take it to 13,200 active-duty Guardians, and Gen. Saltzman has said it needs “thousands more” over the next five to ten years — but it does not lack officer candidates: the Air Force Academy commissioned 93 into the Space Force in May 2026 on top of ROTC and OTS. The fact sheet’s argument is broader: fields across the civil, military and commercial space enterprise “that currently do not have a sufficient amount of programs and graduates”.' },
  { q: 'Would graduates have to serve?', a: 'The commission must recommend a service obligation, explicitly including both Armed Forces service and civilian federal service. Reporting so far suggests graduates could satisfy it at NASA or elsewhere in government rather than only in uniform — the biggest single difference from the Air Force Academy’s five-year active-duty commitment.' },
  { q: 'What did Isaacman propose before?', a: 'Before becoming NASA Administrator, Isaacman floated a “Starfleet Academy” to train operators and certify spaceflight personnel. The order’s language — technical education plus leadership, discipline and public service — reads as that idea widened to the Space Force and the commercial industry.' },
  { q: 'Who is against it?', a: 'Todd Harrison of the American Enterprise Institute called the order “out of left field” and warned against intermingling NASA, the Space Force and the intelligence agencies, which “all have very well-defined lanes”. UCF’s Eric Merriam set the test: it is worth building only if it does something existing universities “do not, can do better, or can do cheaper”. Rep. George Whitesides questioned an administration “war on American science” standing up a science institution.' },
  { q: 'Which bid is favoured?', a: 'Nobody outside the commission knows. Florida has moved fastest and loudest, Texas has the signing venue and the NASA-led framing on its side, Huntsville has Space Command and federal land, and Colorado Springs has the entire Space Force training base — and the strongest duplication objection. The section above scores each on the criteria the commission is likely to weigh.' },
];

export default async function SpaceForceAcademyGuide() {
  const edited = new Date(LAST_EDITED);
  const daysLeft = Math.max(0, Math.ceil((new Date(REPORT_DUE).getTime() - Date.now()) / 86_400_000));
  let articles: Awaited<ReturnType<typeof getSpaceAcademyNewsArticles>> = [];
  try { articles = await getSpaceAcademyNewsArticles(6); } catch { /* the rail is optional */ }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap">
            <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
            <Link href="/guide" className="hover:text-white/80">Guides</Link><span>/</span>
            <span className="text-slate-400">U.S. Space Academy</span>
          </nav>

          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{TITLE}</h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              Most people searching for a &ldquo;Space Force Academy&rdquo; picture West Point with rockets. What the president signed on August 28, 2026 is something else: a commission, chaired by NASA&apos;s administrator, to design a NASA-led federal academy that would feed the Space Force, NASA and the commercial industry at once. This guide separates what the order does from what it promises, lays out the three ways it could actually be built, and scores the five places fighting to host it.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>Updated {edited.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} · news rail live</span>
              <span>|</span>
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <ReadingTime wordCount={3300} className="flex items-center gap-1.5" />
            </div>
          </header>
          <HeroArt src="/art/hero-talent-hub.png" className="mb-8" />

          <nav className="card p-6 mb-10">
            <h2 className="text-lg font-bold text-white mb-3">In this guide</h2>
            <ol className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {TOC.map((item, i) => (
                <li key={item.id}><a href={`#${item.id}`} className="text-slate-300 hover:text-white text-sm transition-colors">{i + 1}. {item.label}</a></li>
              ))}
            </ol>
          </nav>

          <ScrollReveal delay={0.1}>
            <article className="card p-8 space-y-10">
              <section id="verdict">
                <h2 className="text-2xl font-bold text-white mb-4">The short answer</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="text-xs text-slate-500 mb-1">What exists today</div>
                    <div className="text-white font-semibold">A commission</div>
                    <div className="text-xs text-slate-400 mt-1">Not a campus, not a class, not a budget line.</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="text-xs text-slate-500 mb-1">Report due</div>
                    <div className="text-white font-semibold">~Dec 26, 2026</div>
                    <div className="text-xs text-slate-400 mt-1" suppressHydrationWarning>120 days from signing · {daysLeft} days left</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="text-xs text-slate-500 mb-1">Location</div>
                    <div className="text-white font-semibold">Not chosen</div>
                    <div className="text-xs text-slate-400 mt-1">Five bids across four states.</div>
                  </div>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  There is no Space Force Academy yet, and the institution the order describes is not a Space Force academy at all. It is the <strong className="text-white">United States Space Academy</strong>: &ldquo;a NASA-led Federal academy dedicated to combining rigorous technical education with leadership development, discipline, and a durable commitment to public service,&rdquo; meant to turn out &ldquo;astronauts, scientists, engineers, operators, entrepreneurs, civil servants, and warfighters.&rdquo; Whether any graduate ever wears a Space Force uniform is one of the questions the commission has until late December to answer. Whether the academy exists at all is a question for Congress, because the order makes everything &ldquo;subject to the availability of appropriations.&rdquo;
                </p>
              </section>

              <section id="order">
                <h2 className="text-2xl font-bold text-white mb-4">What the executive order actually does</h2>
                <p className="text-slate-300 leading-relaxed mb-4">
                  The order was signed at Johnson Space Center in Houston on Friday, August 28, 2026, at an event honouring the Artemis II crew, and published in the Federal Register on September 3. Its policy section calls space &ldquo;a critical domain for American national security, economic growth, scientific discovery, and technological innovation&rdquo; and commits the administration to &ldquo;strengthen the Nation&apos;s space workforce by expanding opportunities to educate and develop the next generation of leaders across the space domain.&rdquo;
                </p>
                <p className="text-slate-300 leading-relaxed mb-4">
                  Then it does exactly one thing: it establishes the <strong className="text-white">Presidential Commission on the United States Space Academy</strong> and gives it 120 days to send the president a report &ldquo;proposing key details for the establishment of the Space Academy.&rdquo; The report travels through the two vice chairs — the president&apos;s science and economic policy assistants — and the commission&apos;s costs, including publishing the report, are charged to NASA.
                </p>
                <p className="text-slate-300 leading-relaxed">
                  Three things the order does <em>not</em> do are worth stating plainly, because coverage has blurred them. It does not appropriate money. It does not pick a site — it asks for a <em>process</em> to pick one. And it does not create a new military service academy under the Department of War; the White House fact sheet frames the academy as preparing graduates &ldquo;for careers supporting America&apos;s military, civil, and broader space enterprise,&rdquo; and a NASA official described it to CNN as &ldquo;a NASA-led, civilian — and a very distinct difference here — federal academy, not a service academy.&rdquo;
                </p>
              </section>

              <section id="commission">
                <h2 className="text-2xl font-bold text-white mb-4">Who is on the commission</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-white/[0.06]">
                        <th className="pb-2 pr-4">Role</th><th className="pb-2 pr-4">Who</th><th className="pb-2">Office</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMMISSION.map((m) => (
                        <tr key={m.role + m.title} className="border-b border-white/[0.04]">
                          <td className="py-2 pr-4 text-slate-400 whitespace-nowrap">{m.role}</td>
                          <td className="py-2 pr-4 text-white">{m.who}</td>
                          <td className="py-2 text-slate-300">{m.title}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-slate-300 leading-relaxed mt-4">
                  Read the roster as a map of who owns the outcome. NASA chairs and staffs it; the Department of War and the Air Force — which owns the Space Force&apos;s existing officer pipeline — sit on it but do not run it; OMB is in the room because nothing here is funded; and the two vice chairs are the White House policy shops the report is addressed to. No member of Congress is on it. Rep. Zoe Lofgren, the senior Democrat on the House Science Committee, has said that &ldquo;is going to have to change&rdquo; — and since Congress must authorize and fund the school, she is describing a constraint, not a preference.
                </p>
              </section>

              <section id="report">
                <h2 className="text-2xl font-bold text-white mb-4">The nine things the report must decide</h2>
                <ol className="space-y-3">
                  {REPORT_ITEMS.map((r, i) => (
                    <li key={r.t} className="flex gap-3">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-cyan-500/15 text-cyan-300 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <div><span className="text-white font-semibold">{r.t}.</span> <span className="text-slate-300">{r.d}</span></div>
                    </li>
                  ))}
                </ol>
                <p className="text-slate-300 leading-relaxed mt-4">
                  Items three and five are where the politics live. The service obligation decides whether this is a fourth officer pipeline for the Space Force or a federal engineering school with a public-service bond attached. The location item, notably, asks for a selection <em>process</em>; the president has meanwhile said he will choose a site &ldquo;very shortly.&rdquo; If a site is named before the process exists, the commission&apos;s job on that item becomes writing the justification.
                </p>
              </section>

              <section id="why">
                <h2 className="text-2xl font-bold text-white mb-4">Why now — and the case against</h2>
                <p className="text-slate-300 leading-relaxed mb-4">
                  The administration&apos;s case is scale. The Space Force is &ldquo;the first new branch of the Armed Forces since the creation of the Air Force more than 70 years ago&rdquo;; Artemis II took astronauts to lunar orbit in April 2026 for the first time in over fifty years; an August 2026 memorandum targets more than 1,000 launches and reentries on American soil a year by 2030. The fact sheet argues the academy will fill fields &ldquo;that currently do not have a sufficient amount of programs and graduates.&rdquo; The president put it more directly at the signing: given &ldquo;the rapid growth of the U.S. Space Force and commercial space industry,&rdquo; the country will &ldquo;need to educate and train an entire generation.&rdquo;
                </p>
                <p className="text-slate-300 leading-relaxed mb-4">
                  The numbers cut both ways. The Space Force is growing — the fiscal 2027 request adds 2,800 Guardians for an active-duty end strength of 13,200, and Chief of Space Operations Gen. Chance Saltzman has said the service needs &ldquo;thousands more&rdquo; over the next five to ten years — but it is not short of officer candidates. The Air Force Academy commissioned 93 graduates into the Space Force in May 2026, roughly a tenth of the class, on top of ROTC and Officer Training School; Defense One&apos;s reporting was blunt that the service &ldquo;does not lack for recruits.&rdquo; An academy sized like the existing ones would graduate several times the Space Force&apos;s annual officer intake, which is why the order&apos;s list of graduates runs to entrepreneurs and civil servants: the market for this school is mostly outside the military.
                </p>
                <p className="text-slate-300 leading-relaxed">
                  The critics are not fringe. Todd Harrison of the American Enterprise Institute called the order &ldquo;out of left field&rdquo;: &ldquo;NASA, the Space Force, and the intel space agencies — they all have very well-defined lanes and responsibilities and areas of expertise. Intermingling them like this does not sound like a good idea.&rdquo; He also asked why a government academy is needed when &ldquo;world-class private and public universities&rdquo; already produce aerospace talent. The University of Central Florida&apos;s Eric Merriam offered the test any bill will face: the academy is necessary only if it provides something existing institutions &ldquo;do not, can do it better, or can do it cheaper.&rdquo; And CNN reported the running cost could approach $1 billion a year, in line with the existing academies, before a single building goes up.
                </p>
              </section>

              <section id="models">
                <h2 className="text-2xl font-bold text-white mb-4">Three ways it could be built</h2>
                <p className="text-slate-400 text-sm mb-4">This section is analysis. The order leaves all three open; the commission&apos;s governance and service-obligation items will choose between them.</p>
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                    <h3 className="text-white font-semibold mb-1">Model A — the Kings Point model: a civilian federal academy with a service bond</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      The U.S. Merchant Marine Academy is federal, awards accredited degrees, and lets graduates satisfy their obligation in the merchant marine, in industry, or by commissioning into a service. Translated: a NASA-run four-year school whose graduates owe some years to NASA, the Space Force, another agency, or an approved space employer. This is the reading closest to the order&apos;s text (&ldquo;NASA-led&rdquo;, &ldquo;civilian Federal service&rdquo;) and the one a NASA official described to CNN. It needs the least new law — NASA would need an authorization to run a degree-granting institution and money to do it — and the Space Force would treat graduates who commission the way it treats ROTC graduates today.
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                    <h3 className="text-white font-semibold mb-1">Model B — the West Point model: a fifth service academy under the Department of War</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      Cadets in uniform from day one, congressional nominations, a commission and roughly five years of active duty on graduation. This is what &ldquo;Space Force Academy&rdquo; means to most people and it is the model the order conspicuously did not choose: the chair is NASA&apos;s administrator, not the Secretary of the Air Force. It would also collide hardest with the existing pipeline — the Air Force Academy already runs a Space Force detachment, space majors and the &ldquo;Two Services, One Academy&rdquo; program — and hand the duplication argument to every skeptic in Congress. Expect this to survive in the report only as a commissioning <em>track</em> inside Model A or C.
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                    <h3 className="text-white font-semibold mb-1">Model C — the hybrid: two tracks under one roof</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      A NASA-led academy with a civil track (astronaut, flight operations, engineering, policy) and a uniformed track run with the Space Force, sharing a campus, a core curriculum and a leadership program, with obligations set per track. It fits the order&apos;s graduate list — warfighters alongside entrepreneurs — and the presence of the Secretaries of War and the Air Force on the commission. It is also the hardest to govern: two chains of command, two accreditation and honor-code regimes, and a permanent argument about which agency pays for what. If the commission wants both the Space Force and industry to claim the school, this is where it lands.
                    </p>
                  </div>
                </div>
              </section>

              <section id="timeline">
                <h2 className="text-2xl font-bold text-white mb-4">A realistic timeline</h2>
                <p className="text-slate-400 text-sm mb-4">Dated items are official; the rest is our estimate against how the last new academy was built.</p>
                <ol className="relative border-l border-white/[0.08] ml-3 space-y-5">
                  {[
                    { when: 'Aug 28, 2026', what: 'Executive order signed at Johnson Space Center; commission created.', official: true },
                    { when: 'Sep 3, 2026', what: 'Order published in the Federal Register. Florida, Texas, Alabama and Colorado bids surface within two weeks.', official: true },
                    { when: '~Dec 26, 2026', what: 'Commission report due: governance, curriculum, obligations, prerequisites, site-selection process, legislative asks.', official: true },
                    { when: '2027', what: 'Authorization language would have to ride the fiscal 2028 NASA authorization or NDAA, with an appropriation to follow. Site announcement could come any time the president chooses.', official: false },
                    { when: '2028–2029', what: 'A partner-campus start is the only way to open quickly: the Air Force Academy took its first class at Lowry AFB in 1955, a year after the 1954 act, and moved to Colorado Springs in 1958.', official: false },
                    { when: '2029–2030', what: 'Earliest plausible first class on our reading, and only with authorization, money and a partner campus. A greenfield campus with its own accreditation runs longer.', official: false },
                  ].map((s) => (
                    <li key={s.when} className="ml-5">
                      <span className={`absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full ${s.official ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                      <div className="text-xs text-slate-500">{s.when}{s.official ? '' : ' · estimate'}</div>
                      <div className="text-slate-300 text-sm">{s.what}</div>
                    </li>
                  ))}
                </ol>
              </section>

              <section id="locations">
                <h2 className="text-2xl font-bold text-white mb-4">Where it could be built: the bids</h2>
                <p className="text-slate-300 leading-relaxed mb-5">
                  The president said the site would be chosen &ldquo;very shortly&rdquo; and that &ldquo;everybody wants it,&rdquo; and compared the future campus to the academies in New York, Maryland, Colorado and Connecticut. As of September 9, 2026 these are the declared or seriously floated bids. One state has two.
                </p>
                <div className="space-y-4">
                  {BIDS.map((b) => (
                    <div key={b.place} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                        <h3 className="text-white font-semibold">{b.place}</h3>
                        <span className="text-xs text-slate-500">{b.state} · {b.status}</span>
                      </div>
                      <dl className="grid grid-cols-1 md:grid-cols-[110px_1fr] gap-x-4 gap-y-1.5 text-sm">
                        <dt className="text-slate-500">Backers</dt><dd className="text-slate-300">{b.backers}</dd>
                        <dt className="text-slate-500">The pitch</dt><dd className="text-slate-300">{b.pitch}</dd>
                        <dt className="text-slate-500">Assets</dt><dd className="text-slate-300">{b.assets}</dd>
                        <dt className="text-slate-500">The drag</dt><dd className="text-slate-300">{b.drag}</dd>
                      </dl>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                    <h3 className="text-white font-semibold">Bid tracker</h3>
                    <span className="text-xs text-slate-500">Last checked {BIDS_CHECKED}</span>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {BID_TRACKER.map((b) => (
                      <li key={b.who} className="flex gap-3">
                        <span className={`shrink-0 mt-1.5 w-2 h-2 rounded-full ${b.tone === 'up' ? 'bg-emerald-400' : b.tone === 'watch' ? 'bg-amber-400' : 'bg-slate-500'}`} aria-hidden="true" />
                        <span><span className="text-white font-medium">{b.who}:</span> {b.status}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-slate-500 mt-3">Next dated moments: the commission report (~Dec 26, 2026); Interior&apos;s Federal-land list under the launch policy memo (Nov 18); any site announcement, which the president has said will come &ldquo;very shortly.&rdquo; This box is updated as they land.</p>
                </div>
                <p className="text-slate-400 text-sm mt-4">
                  Not (yet) bidding, as far as public reporting shows: California (Vandenberg, JPL, Ames), Ohio (Wright-Patterson), New Mexico (White Sands, Spaceport America) and Virginia (Wallops, NASA headquarters). Any of them could file once the commission&apos;s criteria are public.
                </p>
              </section>

              <section id="criteria">
                <h2 className="text-2xl font-bold text-white mb-4">What will decide the site</h2>
                <p className="text-slate-400 text-sm mb-4">The order asks for a selection process rather than naming criteria. These are the ones any defensible process will contain — and how the bids stack up against them.</p>
                <div className="space-y-4">
                  {CRITERIA.map((c) => (
                    <div key={c.t}>
                      <h3 className="text-white font-semibold text-base mb-1">{c.t}</h3>
                      <p className="text-slate-300 text-sm leading-relaxed">{c.d}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-white/[0.06]">
                        <th className="pb-2 pr-3">Site</th><th className="pb-2 pr-3">Federal land</th><th className="pb-2 pr-3">Hands-on ops</th><th className="pb-2 pr-3">University partner</th><th className="pb-2 pr-3">Congress</th><th className="pb-2">Duplication risk</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {[
                        ['Houston / JSC', 'Weak', 'Strong (human spaceflight)', 'Strong', 'Strong', 'Low'],
                        ['Florida Space Coast', 'Strong', 'Strong (launch + Space Force delta)', 'Medium', 'Strong', 'Low'],
                        ['Orlando / UCF', 'Weak', 'Medium (35 mi to KSC)', 'Strong', 'Strong (shared)', 'Low'],
                        ['Huntsville / Redstone', 'Strong', 'Medium (Marshall, SPACECOM)', 'Medium', 'Medium', 'Low'],
                        ['Colorado Springs', 'Strong', 'Strong (Space Force ops + training)', 'Medium', 'Weak', 'High'],
                      ].map((row) => (
                        <tr key={row[0]} className="border-b border-white/[0.04]">
                          {row.map((cell, i) => <td key={i} className={`py-2 pr-3 ${i === 0 ? 'text-white font-medium whitespace-nowrap' : ''}`}>{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-slate-400 text-xs mt-2">Ratings are SpaceNexus&apos;s assessment against the criteria above, not the commission&apos;s.</p>
              </section>

              <section id="news">
                <h2 className="text-2xl font-bold text-white mb-4">Latest Space Academy news (live)</h2>
                {articles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {articles.map((a) => <NewsCard key={a.id} article={a} />)}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Nothing new has come through the feeds yet. The <Link href="/space-defense" className="text-cyan-400 hover:text-cyan-300">space defense desk</Link> carries the Space Force stories as they land.</p>
                )}
              </section>

              <section id="faq">
                <h2 className="text-2xl font-bold text-white mb-4">Space Academy FAQ</h2>
                <div className="space-y-4">
                  {FAQ.map((f) => (
                    <div key={f.q}>
                      <h3 className="text-base font-semibold text-white mb-1">{f.q}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">{f.a}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="pt-6 border-t border-white/[0.06]">
                <h2 className="text-lg font-bold text-white mb-3">Keep going</h2>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/space-defense" className="text-cyan-400 hover:text-cyan-300">Space defense desk</Link> — Space Force, Space Command and the budget, as it moves.</li>
                  <li><Link href="/guide/how-to-get-a-job-in-the-space-industry" className="text-cyan-400 hover:text-cyan-300">How to get a job in the space industry</Link> — the pipelines that exist today, with live posting counts.</li>
                  <li><Link href="/solutions/educators" className="text-cyan-400 hover:text-cyan-300">For educators</Link> — free classroom resources on launches, orbits and the space economy.</li>
                  <li><Link href="/launches/cape-canaveral" className="text-cyan-400 hover:text-cyan-300">Cape Canaveral launch schedule</Link> — what a Space Coast campus would see from the roof.</li>
                </ul>
                <p className="text-xs text-slate-500 mt-4">
                  Sources: the executive order &ldquo;Establishing the United States Space Academy&rdquo; (White House, Aug 28, 2026; Federal Register, Sep 3, 2026) and its fact sheet; NASA&apos;s Aug 28 release; reporting by CNN, Defense One, TIME, ClearanceJobs, ClickOrlando, Stars and Stripes and Breaking Defense (Aug 28 – Sep 9, 2026). Quotations are as published. The Space Command relocation figures are from U.S. Space Command&apos;s 2026 updates. Everything marked analysis or estimate is SpaceNexus&apos;s reading, not an official position.
                </p>
              </section>
              <GuideNavigation currentSlug={SLUG} />
              <RelatedModules modules={PAGE_RELATIONS[`guide/${SLUG}`]} />
            </article>
          </ScrollReveal>

          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'Article', headline: TITLE, description: DESCRIPTION,
            author: { '@type': 'Organization', name: 'SpaceNexus' }, publisher: { '@type': 'Organization', name: 'SpaceNexus', logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/icons/icon-512x512.png' } },
            datePublished: LAST_EDITED, dateModified: LAST_EDITED, mainEntityOfPage: { '@type': 'WebPage', '@id': CANONICAL },
            about: [{ '@type': 'Event', name: 'Executive order establishing the United States Space Academy', startDate: ORDER_SIGNED }],
          }).replace(/</g, '\\u003c') }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'FAQPage',
            mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          }).replace(/</g, '\\u003c') }} />
          <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Guides', href: '/guide' }, { name: 'U.S. Space Academy' }]} />
        </div>
      </div>
    </div>
  );
}
