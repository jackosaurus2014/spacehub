interface ReadingTimeProps {
  /** Raw text content to calculate reading time from */
  text?: string;
  /** Pre-calculated word count (alternative to text) */
  wordCount?: number;
  /** Reading speed in words per minute (default: 200) */
  wordsPerMinute?: number;
  /** Optional CSS class override (defaults to "text-sm text-slate-400 flex items-center gap-1.5") */
  className?: string;
}

export default function ReadingTime({ text, wordCount, wordsPerMinute = 200, className }: ReadingTimeProps) {
  const words = wordCount ?? (text ? text.trim().split(/\s+/).length : 0);
  const minutes = Math.max(1, Math.ceil(words / wordsPerMinute));

  return (
    <span className={className ?? 'text-sm text-slate-400 flex items-center gap-1.5'}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {minutes} min read
    </span>
  );
}
