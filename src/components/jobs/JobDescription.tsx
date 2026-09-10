'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Employer-authored job description (2026-09-10). Direct postings are
 * written in Markdown (bold, bullets, headings, links) on the Hire form;
 * react-markdown escapes raw HTML, so nothing an employer pastes can inject
 * markup. Synced ATS rows keep the plain pre-wrap rendering on the job page.
 * Also used for the live preview on the posting form and the portal editor.
 */
export default function JobDescription({ markdown, compact = false }: { markdown: string; compact?: boolean }) {
  const p = compact ? 'text-sm text-slate-200 leading-relaxed mb-3' : 'text-sm text-slate-200 leading-relaxed mb-4';
  return (
    <div className="job-description">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h3 className="text-base font-semibold text-white mt-5 mb-2">{children}</h3>,
          h2: ({ children }) => <h3 className="text-base font-semibold text-white mt-5 mb-2">{children}</h3>,
          h3: ({ children }) => <h4 className="text-sm font-semibold text-white mt-4 mb-2">{children}</h4>,
          h4: ({ children }) => <h4 className="text-sm font-semibold text-white/90 mt-3 mb-1">{children}</h4>,
          p: ({ children }) => <p className={p}>{children}</p>,
          a: ({ href, children }) => <a href={href} className="text-cyan-300 hover:underline" target="_blank" rel="noopener noreferrer nofollow">{children}</a>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 text-sm text-slate-200 mb-4">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-200 mb-4">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-white/15 pl-3 my-3 text-slate-400">{children}</blockquote>,
          strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          hr: () => <hr className="border-white/[0.08] my-4" />,
          code: ({ children }) => <code className="bg-white/[0.05] px-1 py-0.5 rounded text-xs">{children}</code>,
          img: () => null,
          table: ({ children }) => <div className="overflow-x-auto my-3"><table className="min-w-full border-collapse text-sm">{children}</table></div>,
          th: ({ children }) => <th className="border border-white/[0.1] px-3 py-1.5 bg-white/[0.04] text-left text-white">{children}</th>,
          td: ({ children }) => <td className="border border-white/[0.08] px-3 py-1.5 text-slate-200">{children}</td>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
