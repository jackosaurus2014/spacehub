'use client';

import LiveBlog from '@/components/live/LiveBlog';
import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  {
    question: 'When did Artemis II launch?',
    answer:
      'Artemis II launched on April 1, 2026, at 6:24 PM EDT (22:24 UTC) from Launch Complex 39B at Kennedy Space Center, Florida, and flew successfully — a complete success with splashdown roughly 10 days later.',
  },
  {
    question: 'Where can I read the Artemis II live blog archive?',
    answer:
      'This page (spacenexus.us/live/artemis-ii-blog) preserves our full real-time coverage from launch to splashdown. For the next Artemis mission, see Mission Control (spacenexus.us/mission-control) and the Ignition Tracker (spacenexus.us/ignition) for milestone updates.',
  },
  {
    question: 'How long was the Artemis II mission?',
    answer:
      'The Artemis II mission lasted approximately 10 days. The crew launched aboard the Orion spacecraft atop the Space Launch System (SLS), flew around the Moon without entering orbit, and returned to Earth with a splashdown in the Pacific Ocean.',
  },
  {
    question: 'Who was on the Artemis II crew?',
    answer:
      'The Artemis II crew consisted of four astronauts: Commander Reid Wiseman (NASA), Pilot Victor Glover (NASA), Mission Specialist Christina Koch (NASA), and Mission Specialist Jeremy Hansen (CSA — Canadian Space Agency). This was the first crewed flight beyond low Earth orbit since Apollo 17 in 1972.',
  },
  {
    question: 'What rocket was used for Artemis II?',
    answer:
      'Artemis II used NASA\'s Space Launch System (SLS), the most powerful rocket ever built, paired with the Orion crew capsule. The SLS Block 1 configuration produces 8.8 million pounds of thrust at liftoff and sent the Orion spacecraft and its crew on a trajectory around the Moon.',
  },
  {
    question: 'What is the next Artemis mission after Artemis II?',
    answer:
      'Artemis III is next, targeted NET (no earlier than) late 2027. NASA restructured it in February 2026 from a lunar landing into an Earth-orbit demonstration mission, testing rendezvous and docking between Orion and commercial human landing systems from SpaceX (Starship HLS) and Blue Origin (Blue Moon). The first crewed lunar landing since Apollo 17 has shifted to Artemis IV, targeted for 2028. The Artemis III crew was announced June 9, 2026.',
  },
];

export default function ArtemisIIBlogClient() {
  return (
    <>
      <FAQSchema items={FAQ_ITEMS} />
      <section className="max-w-4xl mx-auto pb-8">
        <LiveBlog />
      </section>
    </>
  );
}
