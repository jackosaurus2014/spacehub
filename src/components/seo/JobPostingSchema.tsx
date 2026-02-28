'use client';

interface JobPostingSchemaProps {
  jobs: Array<{
    title: string;
    company: string;
    location: string;
    description: string;
    datePosted: string;
    url?: string;
  }>;
}

export default function JobPostingSchema({ jobs }: JobPostingSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': jobs.slice(0, 50).map((job) => ({
      '@type': 'JobPosting',
      title: job.title,
      description: job.description,
      datePosted: job.datePosted,
      hiringOrganization: {
        '@type': 'Organization',
        name: job.company,
      },
      jobLocation: {
        '@type': 'Place',
        address: job.location,
      },
      ...(job.url && {
        url: job.url.startsWith('http') ? job.url : `https://spacenexus.us${job.url}`,
      }),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  );
}
