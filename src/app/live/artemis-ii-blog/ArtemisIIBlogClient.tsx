'use client';

import LiveBlog from '@/components/live/LiveBlog';
import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  {
    question: 'What time does Artemis II launch?',
    answer:
      'Artemis II is scheduled to launch on April 1, 2026, at 6:24 PM EDT (22:24 UTC) from Launch Complex 39B at Kennedy Space Center, Florida. The launch window is instantaneous, meaning there is no flexibility on the exact time.',
  },
  {
    question: 'Where can I follow Artemis II live?',
    answer:
      'You can follow the Artemis II mission live on SpaceNexus at spacenexus.us/live/artemis-ii-blog, which provides real-time updates every 15 seconds during active coverage. You can also watch the live video stream at spacenexus.us/live, or via NASA TV, the NASA app, and NASA\'s YouTube channel.',
  },
  {
    question: 'How long is the Artemis II mission?',
    answer:
      'The Artemis II mission is approximately 10 days long. The crew will launch aboard the Orion spacecraft atop the Space Launch System (SLS), fly around the Moon without entering orbit, and return to Earth with a splashdown in the Pacific Ocean.',
  },
  {
    question: 'Who is on the Artemis II crew?',
    answer:
      'The Artemis II crew consists of four astronauts: Commander Reid Wiseman (NASA), Pilot Victor Glover (NASA), Mission Specialist Christina Koch (NASA), and Mission Specialist Jeremy Hansen (CSA — Canadian Space Agency). This is the first crewed flight beyond low Earth orbit since Apollo 17 in 1972.',
  },
  {
    question: 'What rocket is used for Artemis II?',
    answer:
      'Artemis II uses NASA\'s Space Launch System (SLS), the most powerful rocket ever built, paired with the Orion crew capsule. The SLS Block 1 configuration produces 8.8 million pounds of thrust at liftoff and is capable of sending the Orion spacecraft and its crew on a trajectory around the Moon.',
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
