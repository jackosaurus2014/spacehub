'use client';

import SaveToReadingListButton from '@/components/ui/SaveToReadingListButton';

/**
 * Compatibility shim (2026-09-13).
 *
 * This button used to write its own 'spacenexus-bookmarks' localStorage key,
 * which /reading-list never read — saving an article on a news card put it
 * somewhere nothing could show it. It now delegates to the shared reading-list
 * store (src/lib/reading-list.ts), which migrates the old key on first read.
 *
 * New call sites should import SaveToReadingListButton directly; this wrapper
 * exists so the existing NewsCard props keep working.
 */
export default function BookmarkButton({
  itemTitle,
  itemUrl,
  itemSource = '',
  itemCategory = '',
  className = '',
}: {
  /** Unused: identity now comes from the URL so local and account rows dedupe. */
  itemId?: string;
  itemTitle: string;
  itemUrl: string;
  itemSource?: string;
  itemCategory?: string;
  className?: string;
}) {
  return (
    <SaveToReadingListButton
      item={{ title: itemTitle, url: itemUrl, source: itemSource, category: itemCategory }}
      variant="icon"
      className={className}
    />
  );
}
