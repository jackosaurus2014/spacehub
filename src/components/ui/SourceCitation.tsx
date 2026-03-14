'use client';

interface Source {
  name: string;
  type: 'database' | 'api' | 'rss' | 'calculation' | 'ai-generated';
  url?: string;
}

interface SourceCitationProps {
  sources: Source[];
}

const typeLabels: Record<string, string> = {
  'database': 'Database',
  'api': 'API',
  'rss': 'RSS Feed',
  'calculation': 'Calculation',
  'ai-generated': 'AI Generated',
};

const typeIcons: Record<string, string> = {
  'database': '\uD83D\uDDC4\uFE0F',
  'api': '\uD83D\uDD17',
  'rss': '\uD83D\uDCE1',
  'calculation': '\uD83E\uDDEE',
  'ai-generated': '\uD83E\uDD16',
};

export type { Source };

export default function SourceCitation({ sources }: SourceCitationProps) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.06]">
      <p className="text-xs text-slate-500 mb-1">Sources:</p>
      <div className="flex flex-wrap gap-2">
        {sources.map((source, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 text-xs text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded"
            title={`Source type: ${typeLabels[source.type] || 'Unknown'}`}
          >
            <span aria-hidden="true">{typeIcons[source.type] || '\uD83D\uDCC4'}</span>
            {source.url ? (
              <a
                href={source.url}
                className="hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                {source.name}
              </a>
            ) : (
              source.name
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
