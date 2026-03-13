'use client';

import { useState, useRef, useEffect } from 'react';

interface ReadMoreProps {
  text: string;
  lines?: number;
  className?: string;
}

export default function ReadMore({ text, lines = 3, className = '' }: ReadMoreProps) {
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    // Check if text actually overflows the line-clamp
    setIsTruncated(el.scrollHeight > el.clientHeight + 1);
  }, [text, lines]);

  const clampClass = expanded ? '' : `line-clamp-${lines}`;

  return (
    <div>
      <p ref={textRef} className={`${clampClass} ${className}`}>
        {text}
      </p>
      {isTruncated && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-slate-300 hover:text-white mt-1 transition-colors"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
