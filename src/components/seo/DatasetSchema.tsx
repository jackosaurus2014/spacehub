import JsonLd from './JsonLd';

// schema.org Dataset for the citable data pages and the /datasets catalog.
// Google's Dataset Search indexes these — every page that publishes a table
// worth citing should emit one. Server-safe (no state, no effects), so it
// can sit in server components; it renders fine inside client trees too.

export interface DatasetCreator {
  '@type': 'Organization' | 'Person';
  name: string;
  url?: string;
}

export interface DatasetSchemaProps {
  name: string;
  description: string;
  /** Canonical page URL the dataset lives on (absolute). */
  url: string;
  /** SPDX/CC license URL. Defaults to CC BY 4.0 — matches the /datasets attribution ask. */
  license?: string;
  creator?: DatasetCreator;
  /** ISO 8601 interval, e.g. "2026-08-29/.." for an open-ended live ledger. */
  temporalCoverage?: string;
  /** Absolute URL of a downloadable serialization (usually the CSV endpoint). */
  distributionUrl?: string;
  /** MIME type of the distribution. Defaults to text/csv when a distribution is given. */
  encodingFormat?: string;
  /** ISO date/time of the last refresh — pass a real value, never invent one. */
  dateModified?: string;
  keywords?: string[];
}

export const SPACENEXUS_CREATOR: DatasetCreator = {
  '@type': 'Organization',
  name: 'SpaceNexus',
  url: 'https://spacenexus.us',
};

export const DEFAULT_DATASET_LICENSE = 'https://creativecommons.org/licenses/by/4.0/';

export function datasetJsonLd({
  name,
  description,
  url,
  license = DEFAULT_DATASET_LICENSE,
  creator = SPACENEXUS_CREATOR,
  temporalCoverage,
  distributionUrl,
  encodingFormat,
  dateModified,
  keywords,
}: DatasetSchemaProps): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name,
    description,
    url,
    license,
    isAccessibleForFree: true,
    creator,
    publisher: creator,
    ...(temporalCoverage ? { temporalCoverage } : {}),
    ...(dateModified ? { dateModified } : {}),
    ...(keywords && keywords.length ? { keywords } : {}),
    ...(distributionUrl
      ? {
          distribution: [
            {
              '@type': 'DataDownload',
              contentUrl: distributionUrl,
              encodingFormat: encodingFormat ?? 'text/csv',
            },
          ],
        }
      : {}),
  };
}

export default function DatasetSchema(props: DatasetSchemaProps) {
  return <JsonLd data={datasetJsonLd(props)} />;
}
