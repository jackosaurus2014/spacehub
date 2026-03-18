'use client';

import { useState, useEffect, useCallback } from 'react';

interface TocItem {
  id: string;
  text: string;
}

interface BlogTableOfContentsProps {
  contentHtml: string;
}

/**
 * Parses H2 headings from the blog article HTML and renders a "Jump to section"
 * list. Only renders when there are 3+ H2 headings. On desktop, renders as a
 * sticky sidebar; on mobile, renders as a collapsible section at the top.
 *
 * After mount, it also injects `id` attributes into the rendered H2 elements
 * in the DOM so the anchor links work.
 */
export default function BlogTableOfContents({ contentHtml }: BlogTableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  // Parse H2 headings from the HTML string
  const tocItems: TocItem[] = (() => {
    const items: TocItem[] = [];
    // Match <h2> tags, optionally with an existing id attribute
    const regex = /<h2[^>]*?(?:id="([^"]*)")?[^>]*>(.*?)<\/h2>/gi;
    let match;
    while ((match = regex.exec(contentHtml)) !== null) {
      const existingId = match[1];
      // Strip HTML tags from the heading text
      const text = match[2].replace(/<[^>]+>/g, '').trim();
      const id = existingId || text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      items.push({ id, text });
    }
    return items;
  })();

  // Inject id attributes into rendered H2 elements and observe them
  useEffect(() => {
    if (tocItems.length < 3) return;

    // Find the prose container and inject IDs into H2s
    const proseContainer = document.querySelector('.prose');
    if (!proseContainer) return;

    const h2Elements = proseContainer.querySelectorAll('h2');
    h2Elements.forEach((h2, index) => {
      if (tocItems[index]) {
        h2.id = tocItems[index].id;
      }
    });

    // Set up Intersection Observer for active heading tracking
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );

    h2Elements.forEach((h2) => {
      if (h2.id) observer.observe(h2);
    });

    return () => observer.disconnect();
  }, [tocItems]);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
    }
    setIsOpen(false);
  }, []);

  // Only render for articles with 3+ H2 headings
  if (tocItems.length < 3) return null;

  return (
    <>
      {/* Mobile: collapsible section at top */}
      <div className="lg:hidden mb-8">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-white/[0.04] border border-white/[0.06] rounded-xl text-sm font-medium text-white/80 hover:bg-white/[0.06] transition-colors"
          aria-expanded={isOpen}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            Jump to section ({tocItems.length})
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <nav className="mt-2 bg-white/[0.03] border border-white/[0.06] rounded-xl p-3" aria-label="Table of contents">
            <ul className="space-y-1">
              {tocItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleClick(item.id)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                      activeId === item.id
                        ? 'text-white bg-white/[0.08]'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {item.text}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      {/* Desktop: sticky sidebar */}
      <aside className="hidden lg:block fixed top-24 right-[max(1rem,calc((100vw-48rem)/2-18rem))] w-56 max-h-[calc(100vh-8rem)] overflow-y-auto z-30" aria-label="Table of contents">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            On this page
          </h3>
          <nav>
            <ul className="space-y-0.5">
              {tocItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleClick(item.id)}
                    className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md transition-colors leading-relaxed ${
                      activeId === item.id
                        ? 'text-white bg-white/[0.08] font-medium'
                        : 'text-slate-400 hover:text-white/80 hover:bg-white/[0.04]'
                    }`}
                  >
                    {item.text}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
}
