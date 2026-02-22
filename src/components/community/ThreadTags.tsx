'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { FORUM_TAGS } from '@/lib/validations';

type ForumTag = (typeof FORUM_TAGS)[number];

const TAG_COLORS: Record<ForumTag, string> = {
  discussion: 'blue',
  question: 'purple',
  announcement: 'amber',
  technical: 'cyan',
  business: 'green',
  regulatory: 'red',
  itar: 'red',
  launch: 'orange',
  satellite: 'sky',
  funding: 'emerald',
  career: 'indigo',
  news: 'slate',
};

// Pre-computed Tailwind classes to ensure they are included in the bundle.
// Tailwind cannot detect dynamically constructed class names, so we map
// each color token to its concrete utility classes explicitly.
const COLOR_CLASSES: Record<string, { bg: string; text: string; ring: string }> = {
  blue:    { bg: 'bg-blue-500/20',    text: 'text-blue-400',    ring: 'ring-blue-500/30' },
  purple:  { bg: 'bg-purple-500/20',  text: 'text-purple-400',  ring: 'ring-purple-500/30' },
  amber:   { bg: 'bg-amber-500/20',   text: 'text-amber-400',   ring: 'ring-amber-500/30' },
  cyan:    { bg: 'bg-cyan-500/20',    text: 'text-cyan-400',    ring: 'ring-cyan-500/30' },
  green:   { bg: 'bg-green-500/20',   text: 'text-green-400',   ring: 'ring-green-500/30' },
  red:     { bg: 'bg-red-500/20',     text: 'text-red-400',     ring: 'ring-red-500/30' },
  orange:  { bg: 'bg-orange-500/20',  text: 'text-orange-400',  ring: 'ring-orange-500/30' },
  sky:     { bg: 'bg-sky-500/20',     text: 'text-sky-400',     ring: 'ring-sky-500/30' },
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
  indigo:  { bg: 'bg-indigo-500/20',  text: 'text-indigo-400',  ring: 'ring-indigo-500/30' },
  slate:   { bg: 'bg-slate-500/20',   text: 'text-slate-400',   ring: 'ring-slate-500/30' },
};

function getTagClasses(tag: string) {
  const color = TAG_COLORS[tag as ForumTag] ?? 'slate';
  return COLOR_CLASSES[color] ?? COLOR_CLASSES.slate;
}

interface ThreadTagsProps {
  tags: string[];
  editable?: boolean;
  onChange?: (tags: string[]) => void;
  availableTags?: readonly string[];
}

export default function ThreadTags({
  tags,
  editable = false,
  onChange,
  availableTags = FORUM_TAGS,
}: ThreadTagsProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const remainingTags = availableTags.filter((t) => !tags.includes(t));
  const canAddMore = tags.length < 5 && remainingTags.length > 0;

  // Close dropdown on outside click
  useEffect(() => {
    if (!isDropdownOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const handleRemove = useCallback(
    (tag: string) => {
      onChange?.(tags.filter((t) => t !== tag));
    },
    [tags, onChange]
  );

  const handleAdd = useCallback(
    (tag: string) => {
      if (tags.length >= 5) return;
      onChange?.([...tags, tag]);
      setIsDropdownOpen(false);
    },
    [tags, onChange]
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => {
        const classes = getTagClasses(tag);
        return (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${classes.bg} ${classes.text}`}
          >
            {tag}
            {editable && (
              <button
                onClick={() => handleRemove(tag)}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-white/10"
                aria-label={`Remove ${tag} tag`}
                type="button"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3 h-3"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </span>
        );
      })}

      {/* Add tag dropdown */}
      {editable && canAddMore && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-400 border border-dashed border-slate-600 hover:border-slate-500 hover:text-slate-300 transition-colors"
            type="button"
            aria-label="Add tag"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3 h-3"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add tag
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 w-44 max-h-52 overflow-y-auto rounded-lg bg-slate-800 border border-slate-700 shadow-xl shadow-black/30">
              <div className="p-1">
                {remainingTags.map((tag) => {
                  const classes = getTagClasses(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => handleAdd(tag)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-sm hover:bg-slate-700/70 transition-colors"
                      type="button"
                    >
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${classes.bg} ring-1 ${classes.ring}`}
                      />
                      <span className={`text-xs font-medium ${classes.text}`}>
                        {tag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tag limit indicator in editable mode */}
      {editable && (
        <span className="text-[10px] text-slate-600 ml-1">
          {tags.length}/5
        </span>
      )}
    </div>
  );
}
