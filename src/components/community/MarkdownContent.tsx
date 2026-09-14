'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UGC_LINK_REL } from '@/lib/forum-seo';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Schemes a user-authored link may use. react-markdown sanitises hrefs by
 * default, but this content is stored user input rendered on a public page,
 * so the allowlist is stated here rather than inherited — javascript:,
 * data: and vbscript: never reach an anchor.
 */
function safeHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  const trimmed = href.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  // Relative and same-page links are fine; anything else is dropped.
  if (/^[/#]/.test(trimmed)) return trimmed;
  return undefined;
}

/**
 * Process text content to highlight @mentions with styled spans
 */
function renderWithMentions(text: string): React.ReactNode {
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Add the styled mention
    parts.push(
      <span
        key={`mention-${match.index}`}
        className="text-white/70 font-medium cursor-pointer hover:underline"
      >
        @{match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

/**
 * Recursively process React children to apply mention highlighting to text nodes
 */
function processChildren(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      return renderWithMentions(child);
    }
    return child;
  });
}

export default function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`prose prose-invert prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Every link in user-generated content is rel="ugc nofollow".
          //
          // This is the single most valuable line in the file: nofollow
          // removes the entire economic reason to spam the forum for
          // backlinks, and ugc states honestly what the link is. Without it a
          // public posting surface on a domain with real search authority
          // becomes a link farm within a week. It applies to EVERY post,
          // including on threads good enough to be indexed — there is no tier
          // of member that earns followed links.
          a: ({ href, children }) => {
            const safe = safeHref(href);
            if (!safe) return <>{children}</>;
            return (
              <a
                href={safe}
                target="_blank"
                rel={UGC_LINK_REL}
                className="text-cyan-300/90 hover:text-cyan-200 underline transition-colors"
              >
                {children}
              </a>
            );
          },
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName;
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 bg-white/[0.06] text-white/90 rounded text-xs" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={`block bg-black/80 border border-white/[0.06] rounded-lg p-3 text-xs overflow-x-auto ${codeClassName || ''}`} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-black/80 border border-white/[0.06] rounded-lg p-3 overflow-x-auto my-3">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-white/15 pl-3 my-3 text-slate-400 italic">
              {processChildren(children)}
            </blockquote>
          ),
          li: ({ children }) => (
            <li>{processChildren(children)}</li>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 my-2 text-white/70">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 my-2 text-white/70">
              {children}
            </ol>
          ),
          // The page already owns the <h1>; a "# Title" in the body renders as h2.
          h1: ({ children }) => (
            <h2 className="text-xl font-bold text-slate-100 mt-4 mb-2">{children}</h2>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-slate-100 mt-3 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-white/90 mt-3 mb-1">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-white/70 my-2 leading-relaxed">{processChildren(children)}</p>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border border-white/[0.06] text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-white/[0.06] px-3 py-1.5 bg-white/[0.06]/60 text-left text-white/70 font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-white/[0.06] px-3 py-1.5 text-slate-400">
              {children}
            </td>
          ),
          hr: () => <hr className="border-white/[0.06] my-4" />,
          // Images.
          //
          // A same-origin image embeds. A REMOTE image does not: an <img>
          // whose src a poster controls is a tracking pixel that reports
          // every reader's IP and user agent to a third party, and a way to
          // put a picture nobody reviewed on a public page while the host can
          // swap it after the fact. It renders as a labelled link instead, so
          // the content is still reachable and the reader chooses.
          //
          // @types/react 19 widens <img src> to `string | Blob`, so anything
          // that is not a string is dropped.
          img: ({ src, alt }) => {
            const url = typeof src === 'string' ? src.trim() : '';
            if (!url) return null;

            const isLocal = url.startsWith('/');
            if (isLocal) {
              // eslint-disable-next-line @next/next/no-img-element
              return (
                <img
                  src={url}
                  alt={alt || ''}
                  className="max-w-full h-auto rounded-lg border border-white/[0.06] my-2"
                />
              );
            }

            const safe = safeHref(url);
            if (!safe) return null;
            let host = 'an external site';
            try {
              host = new URL(safe).hostname.replace(/^www./, '');
            } catch {
              // Keep the generic label.
            }
            return (
              <a
                href={safe}
                target="_blank"
                rel={UGC_LINK_REL}
                className="inline-flex items-center gap-1.5 my-2 px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-xs text-cyan-300/90 hover:text-cyan-200"
              >
                <span aria-hidden="true">🖼</span>
                {alt ? `Image: ${alt}` : 'Image'} ({host})
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
