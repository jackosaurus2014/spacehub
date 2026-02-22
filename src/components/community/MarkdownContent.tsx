'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export default function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`prose prose-invert prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline transition-colors"
            >
              {children}
            </a>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName;
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 bg-slate-800 text-cyan-300 rounded text-xs" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={`block bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 text-xs overflow-x-auto ${codeClassName || ''}`} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 overflow-x-auto my-3">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-cyan-500/40 pl-3 my-3 text-slate-400 italic">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 my-2 text-slate-300">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 my-2 text-slate-300">
              {children}
            </ol>
          ),
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-slate-100 mt-4 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-slate-100 mt-3 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-slate-200 mt-3 mb-1">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-slate-300 my-2 leading-relaxed">{children}</p>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border border-slate-700/50 text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-slate-700/50 px-3 py-1.5 bg-slate-800/60 text-left text-slate-300 font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-700/50 px-3 py-1.5 text-slate-400">
              {children}
            </td>
          ),
          hr: () => <hr className="border-slate-700/50 my-4" />,
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || ''}
              className="max-w-full h-auto rounded-lg border border-slate-700/50 my-2"
              loading="lazy"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
