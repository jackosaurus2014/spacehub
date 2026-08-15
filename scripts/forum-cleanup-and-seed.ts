/**
 * One-off forum maintenance script (audit fix, 2026-08-14):
 *
 * 1. Deletes the single off-topic spam thread ("HOW TO MAKE GAMES" by
 *    FRANCO, posted 2026-07-05 in launch-tech) — it has nothing to do with
 *    the space industry and is the only thread across all 8 forum
 *    categories, which makes the forums look dead/abandoned.
 * 2. Seeds ~2 genuinely useful, staff-authored starter threads in each of
 *    the 5 most important categories (launch-tech, business-funding,
 *    careers, satellite-ops, space-policy) so the forums have real
 *    conversation starters instead of an empty shell.
 *
 * Threads are authored by a dedicated "SpaceNexus Staff" account (isAdmin:
 * true, so the existing Staff badge in ThreadCard.tsx renders automatically
 * — see src/app/api/community/forums/[slug]/route.ts's
 * `isStaffAuthor: t.author?.isAdmin === true`). No fake user personas.
 *
 * Run with: npx tsx scripts/forum-cleanup-and-seed.ts
 */

import prisma from '@/lib/db';
import crypto from 'crypto';

const STAFF_EMAIL = 'staff@spacenexus.us';
const STAFF_NAME = 'SpaceNexus Staff';

const SPAM_THREAD_TITLE = 'HOW TO MAKE GAMES';

interface SeedThread {
  categorySlug: string;
  title: string;
  content: string;
  tags: string[];
}

const SEED_THREADS: SeedThread[] = [
  // ── Launch Technology ──────────────────────────────────────────────
  {
    categorySlug: 'launch-tech',
    title: 'Starship Flight 14 — what a tower catch would mean for cadence',
    tags: ['starship', 'spacex', 'reusability'],
    content: `Flight 14 is currently tracking NET late August, and the open question we keep coming back to is what happens to launch cadence once (if) the booster and ship recovery process is fully routine — chopstick catches on both ends, minimal turnaround inspection, no barge/downrange recovery logistics.

Falcon 9's reuse curve took years to go from "we caught a booster" to "boosters fly a dozen times with days between flights." Starship is a much bigger, much more complex vehicle, and the ship (second stage) reentry and catch is the harder half of that equation compared to the relatively well-understood booster boostback.

Curious what people here think is the realistic cadence ceiling for Starship in 2027-2028 once catch reliability stabilizes — and separately, whether Super Heavy's turnaround will end up being the actual bottleneck rather than the ship. If you've got a launch-ops or reuse-engineering background, we'd especially like to hear where you think the failure modes still are.`,
  },
  {
    categorySlug: 'launch-tech',
    title: "Reusable second stages: who's actually closest to SpaceX?",
    tags: ['reusability', 'launch-vehicles', 'competition'],
    content: `Fully reusable first stages are now a solved problem for multiple providers. Fully reusable *second* stages are still basically a one-company club, and that's arguably the bigger moat in the launch market right now — the second stage is where most of the per-flight hardware cost lives once the booster is reusable.

Rocket Lab, Blue Origin, Stoke Space, and a handful of others have all talked publicly about second-stage reuse ambitions with very different architectures (Stoke's regeneratively-cooled metallic heat shield is the most structurally different approach we're tracking). None of them are flying an operational reusable upper stage yet.

Who do you think is genuinely closest to a second orbital-class reusable second stage, and on what timeline? And is there a case that reusable second stages actually matter less than people assume, if launch cost is increasingly dominated by cadence and manifest rather than per-vehicle marginal cost?`,
  },

  // ── Business & Funding ─────────────────────────────────────────────
  {
    categorySlug: 'business-funding',
    title: 'Q3 2026 funding environment — reading the tea leaves',
    tags: ['funding', 'venture-capital', 'startups'],
    content: `We track funding rounds across the space startup landscape pretty closely for the Startup Hub module, and the read going into Q3 2026 is a mixed one: mega-rounds are still landing for a handful of category leaders (launch, in-space infrastructure, defense-adjacent), while seed and Series A activity for anything without a clear government or defense revenue path looks noticeably more selective than it did two years ago.

That's consistent with what we're hearing anecdotally from founders — diligence cycles are longer, investors want revenue or a signed anchor contract rather than a roadmap, and down rounds/bridge notes are more common than they were during the 2021-2022 run-up. At the same time, there's real dry powder sitting in space-focused funds that still needs to get deployed.

If you're raising right now, or you're on the investor side of the table: what are you actually seeing in term sheets and diligence asks this quarter? We're especially interested in whether the "must have government revenue" bar has gotten higher or whether that's more perception than reality.`,
  },
  {
    categorySlug: 'business-funding',
    title: "M&A in space: consolidation wave or still too early?",
    tags: ['mergers-acquisitions', 'strategy', 'industry-trends'],
    content: `Every downturn in a capital-intensive industry eventually produces a consolidation wave — undercapitalized players get acquired for their IP, contracts, or team rather than going to zero. The space industry has had scattered M&A activity for a few years now, but it hasn't obviously turned into a wave yet the way, say, the smallsat launch segment probably needs it to.

Our working theory is that a real consolidation wave needs two things to line up: acquirers with dry powder who see the strategic logic (usually the larger primes, or well-funded category leaders buying up a supply chain), and enough distressed-but-valuable targets to make it worth doing systematically rather than opportunistically.

Where do you think we actually are in that cycle right now? Smallsat launch and cubesat manufacturing both feel overcrowded to us — are there other segments you'd flag as ripe for consolidation, or is "too early" still the right read across the board?`,
  },

  // ── Careers & Education ────────────────────────────────────────────
  {
    categorySlug: 'careers',
    title: 'Which ATS do you wish space employers would stop using?',
    tags: ['job-search', 'hiring', 'ats'],
    content: `We sync roughly 6,000+ live space-industry job postings from 16 different ATS boards for the Space Talent module, so we get a pretty unfiltered view of the hiring stack the whole industry runs on — and some of it is rough. Multi-page application forms that re-ask for information already in your résumé, broken redirect links, "apply" buttons that dead-end, postings that have clearly been live for eight months with zero activity.

If you've applied to space-industry roles recently, which ATS platforms gave you the smoothest experience, and which ones made you want to give up halfway through? We're not going to name-and-shame any specific employer here, but the pattern across platforms is genuinely useful for job seekers to know going in — and it's useful signal for us on which boards are worth prioritizing when we widen our sync list.`,
  },
  {
    categorySlug: 'careers',
    title: "Breaking into space without an aerospace degree — what's actually worked?",
    tags: ['career-change', 'education', 'hiring'],
    content: `One of the most common questions we get through the site's feedback form is a version of: "I don't have an aerospace or physics degree — is there actually a path into this industry?" The honest answer is yes, but it depends heavily on which part of "space" you're trying to get into. Software, business development, supply chain, program management, and regulatory/compliance roles all regularly hire people with zero aerospace-specific education, especially at companies building ground systems, software, or mission operations tooling rather than hardware.

If you made a career change into the space industry from an unrelated field, we'd genuinely like to hear what worked: was it a lateral move from a similar function at a non-space company, a portfolio project that got you noticed, a specific certification, or just persistence and networking? This is exactly the kind of thread we'd like to be able to point newcomers to instead of giving generic advice.`,
  },

  // ── Satellite Operations ───────────────────────────────────────────
  {
    categorySlug: 'satellite-ops',
    title: 'LEO conjunction alerts are up again — how is your team triaging them?',
    tags: ['collision-avoidance', 'space-traffic', 'operations'],
    content: `Conjunction alert volume in LEO has continued climbing as more constellations reach operational scale, and from what we're hearing, most ops teams below a certain size are still leaning heavily on manual review for anything above a baseline probability threshold rather than fully automated maneuver decisions. That's a lot of analyst time spent on alerts that resolve to "no action needed" once you factor in updated tracking data.

For teams running anything from a handful of satellites to a few hundred: what does your actual conjunction triage workflow look like today? Are you using a commercial SSA/conjunction-data-message service, leaning on 18th Space Defense Squadron data directly, or some hybrid? And at what point did automated maneuver execution (versus human-in-the-loop sign-off) start to feel necessary rather than optional for your constellation size?`,
  },
  {
    categorySlug: 'satellite-ops',
    title: 'Direct-to-device: real substitute for terrestrial telecom, or overhyped?',
    tags: ['direct-to-device', 'connectivity', 'constellations'],
    content: `Direct-to-device satellite connectivity has moved fast from "interesting demo" to multiple operators claiming near-term commercial texting and voice service straight to unmodified phones. The pitch is compelling — genuine dead-zone coverage without a dedicated satellite handset — but the physics and spectrum-sharing constraints (huge phased-array antennas needed on relatively small satellites, tight coordination with terrestrial spectrum holders) are non-trivial, and actual delivered bandwidth per user is still pretty limited compared to a normal cell connection.

Do you think direct-to-device ends up as a meaningful standalone business, or does it mostly end up as a value-add feature bundled into existing mobile plans for emergency/dead-zone coverage rather than a real substitute for terrestrial connectivity? And separately — how much of the current momentum do you think survives once the regulatory and spectrum-sharing fights fully play out?`,
  },

  // ── Space Policy & Regulation ──────────────────────────────────────
  {
    categorySlug: 'space-policy',
    title: 'FAA Part 450 licensing — is the streamlined process actually faster in practice?',
    tags: ['faa', 'licensing', 'regulation'],
    content: `Part 450 was supposed to be the fix for the old, launch-specific licensing regime — one vehicle-agnostic framework instead of separate license types, with the stated goal of cutting review timelines. In practice, the feedback we hear from smaller launch providers is mixed: some report genuinely faster reviews for straightforward, repeat-flight vehicles, while others describe the process as still slow and document-heavy for anything with a novel trajectory, reentry profile, or new launch site.

If you've been through a Part 450 application — as an applicant, a consultant, or on the regulatory side — how has your experience actually matched (or not matched) the "streamlined" pitch? We track FAA/AST filings and licensing activity on the Regulatory Hub, and firsthand accounts from people who've actually run the process are exactly the kind of signal that's hard to get from the public docket alone.`,
  },
  {
    categorySlug: 'space-policy',
    title: 'Artemis Accords keep adding signatories — does it matter operationally yet?',
    tags: ['artemis-accords', 'international-law', 'policy'],
    content: `The Artemis Accords signatory list has kept growing and is now well past 70 nations, which is a genuine diplomatic win for the framework's stated goal of establishing shared norms for lunar and deep-space activity (resource extraction transparency, safety zones, interoperability commitments, and so on). What's less clear to us is how much that signatory count translates into operational reality yet — most signatories don't have an active lunar program, and the handful of nations actually flying missions or planning ISRU activity are a small subset of the list.

Do you see the Accords as primarily a norms-setting exercise that will matter more once more nations and companies are actually operating on/near the Moon, or is there concrete operational impact already showing up in how missions are planned and coordinated today? Also curious whether non-signatory activity (from nations outside the framework) is shaping up to be a real point of friction, or whether that's overstated.`,
  },
];

async function main() {
  console.log('=== Forum cleanup + seed ===\n');

  // ── 1. Delete the spam thread ──────────────────────────────────────
  const spamThread = await prisma.forumThread.findFirst({
    where: { title: SPAM_THREAD_TITLE },
    include: { posts: true },
  });

  if (spamThread) {
    console.log(`Deleting spam thread "${spamThread.title}" (${spamThread.id}), ${spamThread.posts.length} posts...`);
    // ForumPost, ThreadVote, ThreadSubscription all cascade on ForumThread delete per schema.
    await prisma.forumThread.delete({ where: { id: spamThread.id } });
    console.log('  Deleted.\n');
  } else {
    console.log(`No thread titled "${SPAM_THREAD_TITLE}" found — already deleted or never existed.\n`);
  }

  // ── 2. Ensure the staff author exists ──────────────────────────────
  let staff = await prisma.user.findUnique({ where: { email: STAFF_EMAIL } });
  if (!staff) {
    staff = await prisma.user.create({
      data: {
        email: STAFF_EMAIL,
        name: STAFF_NAME,
        // Password is required by the schema but this is a non-interactive
        // editorial account — unusable random value, same pattern as
        // scripts/seed-gigs.ts's seed user.
        password: `!seed:${crypto.randomBytes(24).toString('hex')}`,
        isAdmin: true,
        adminRole: 'moderator',
      },
    });
    console.log(`Created staff author "${STAFF_NAME}" (${staff.id}).\n`);
  } else if (!staff.isAdmin) {
    staff = await prisma.user.update({ where: { id: staff.id }, data: { isAdmin: true } });
    console.log(`Existing user ${STAFF_EMAIL} found but wasn't admin — granted isAdmin so the Staff badge renders.\n`);
  } else {
    console.log(`Staff author "${staff.name}" (${staff.id}) already exists.\n`);
  }

  // ── 3. Seed starter threads (idempotent by title) ────────────────
  const categories = await prisma.forumCategory.findMany();
  const bySlug = new Map(categories.map((c) => [c.slug, c]));

  let created = 0;
  let skipped = 0;

  for (const t of SEED_THREADS) {
    const category = bySlug.get(t.categorySlug);
    if (!category) {
      console.log(`  ⚠ Category "${t.categorySlug}" not found — skipping "${t.title}"`);
      continue;
    }

    const existing = await prisma.forumThread.findFirst({
      where: { title: t.title, categoryId: category.id },
    });
    if (existing) {
      console.log(`  Skipping (already exists): "${t.title}"`);
      skipped++;
      continue;
    }

    await prisma.forumThread.create({
      data: {
        categoryId: category.id,
        authorId: staff.id,
        title: t.title,
        content: t.content,
        tags: t.tags,
      },
    });
    console.log(`  ✓ Created in [${t.categorySlug}]: "${t.title}"`);
    created++;
  }

  console.log(`\n=== Done: ${created} threads created, ${skipped} skipped (already existed) ===`);
}

main()
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
