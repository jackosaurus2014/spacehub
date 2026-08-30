/**
 * Deck — the italic standfirst that sits under a headline (SYNTHESIS.md §2.4,
 * Editorial graft C3). DM Sans 400 italic, 1.25rem/1.5, --ink-2, capped at the
 * 68ch reading measure. The difference between a scraped directory and a
 * publication.
 *
 * Server-safe: no state, no effects.
 */

import React from 'react';

export interface DeckProps {
  children: React.ReactNode;
  className?: string;
  /** Element to render as. Defaults to <p>. */
  as?: React.ElementType;
}

export default function Deck({ children, className = '', as: Tag = 'p' }: DeckProps) {
  return (
    <Tag
      className={`font-body text-[1.25rem] italic leading-[1.5] text-[var(--ink-2)] ${className}`}
      style={{ maxWidth: '68ch' }}
    >
      {children}
    </Tag>
  );
}
