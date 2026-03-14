import { type ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom';
}

export default function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const posClasses = position === 'top'
    ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
    : 'top-full left-1/2 -translate-x-1/2 mt-2';

  return (
    <span className="relative inline-flex group/tip">
      <button
        type="button"
        className="inline-flex items-center cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-white/15 rounded"
      >
        {children}
      </button>
      <span
        role="tooltip"
        className={`absolute ${posClasses} z-50 px-3 py-2 text-sm text-white bg-white/[0.06] rounded-lg shadow-lg max-w-[250px] w-max pointer-events-none opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100 group-focus-within/tip:opacity-100 group-focus-within/tip:scale-100 transition-all duration-150 ease-out`}
      >
        {content}
      </span>
    </span>
  );
}
