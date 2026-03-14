'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';

interface MarkdownContentProps {
  content: string;
  className?: string;
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
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-white underline transition-colors"
            >
              {children}
            </a>
          ),
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
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-slate-100 mt-4 mb-2">{children}</h1>
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
          img: ({ src, alt }) => (
            <Image
              src={src || ''}
              alt={alt || ''}
              width={800}
              height={400}
              className="max-w-full h-auto rounded-lg border border-white/[0.06] my-2"
              unoptimized
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
