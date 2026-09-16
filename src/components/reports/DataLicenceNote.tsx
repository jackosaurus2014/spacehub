import { RESEARCH_SOURCE_CREDITS } from '@/lib/research-export';

/**
 * Required source attribution, rendered wherever register-derived data is
 * displayed or exported.
 *
 * This is not a credits roll. UK Companies House data is Crown copyright,
 * released under the Open Government Licence v3.0, and the OGL is permissive
 * WITH A CONDITION: "You must ... acknowledge the source of the Information in
 * your product or application ... and, where possible, provide a link to this
 * licence". Its consequence clause is equally plain - "if you fail to comply
 * with them the rights granted to you under this licence ... will end
 * automatically". So the acknowledgement is the consideration that keeps our
 * right to publish alive, and it belongs on the surfaces where the data is
 * read, not only on /data-sources.
 *
 * The register reaches these surfaces indirectly: companies-house-fetcher.ts
 * fills CompanyProfile.foundedYear and .legalName and creates KeyPersonnel
 * rows from official filings, and those profile fields are what the release
 * tables and the exports read. Indirect is still reuse.
 *
 * Single-sourced from src/lib/uk-registry/attribution.ts via
 * RESEARCH_SOURCE_CREDITS so the page and the exported file cannot drift.
 */
export default function DataLicenceNote({ className = '' }: { className?: string }) {
  if (RESEARCH_SOURCE_CREDITS.length === 0) return null;

  return (
    <section
      className={`mt-12 ${className}`}
      aria-labelledby="source-licences-heading"
    >
      <h2 id="source-licences-heading" className="text-xl font-bold text-white mb-1">
        Sources and licences
      </h2>
      <p className="text-sm text-slate-500 mb-4 max-w-3xl">
        The same credits are written into every CSV and JSON export of this data, so a
        downloaded file still names its sources.
      </p>
      <ul className="space-y-3 max-w-3xl">
        {RESEARCH_SOURCE_CREDITS.map((credit) => (
          <li key={credit.source} className="text-sm text-slate-400 leading-relaxed">
            <span className="text-slate-300 font-medium">{credit.source}</span>
            {' — '}
            {credit.statement}{' '}
            <a
              href={credit.licenceUrl}
              target="_blank"
              rel="noopener noreferrer license"
              className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
            >
              {credit.licence}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
