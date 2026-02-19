'use client';

interface EventSchemaProps {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location?: string;
  url?: string;
  image?: string;
  organizer?: string;
  status?: 'EventScheduled' | 'EventPostponed' | 'EventCancelled' | 'EventMovedOnline';
}

export default function EventSchema({
  name,
  description,
  startDate,
  endDate,
  location,
  url,
  image,
  organizer,
  status = 'EventScheduled',
}: EventSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name,
    description,
    startDate,
    ...(endDate && { endDate }),
    eventStatus: `https://schema.org/${status}`,
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: location
      ? {
          '@type': 'Place',
          name: location,
        }
      : {
          '@type': 'VirtualLocation',
          url: url || 'https://spacenexus.us/mission-control',
        },
    ...(url && { url }),
    ...(image && {
      image: image.startsWith('http') ? image : `https://spacenexus.us${image}`,
    }),
    organizer: {
      '@type': 'Organization',
      name: organizer || 'SpaceNexus',
      url: 'https://spacenexus.us',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  );
}
