'use client';

interface TerminalPanelProps {
  /** Module path shown in the chrome header (e.g., "market-data", "satellites") */
  path: string;
  /** Optional status badge text (e.g., "LIVE", "CONNECTED", "PRO") */
  status?: string;
  /** Badge variant — determines color */
  statusType?: 'live' | 'pro' | 'new' | 'connected';
  /** Panel content */
  children: React.ReactNode;
  /** Additional className on the outer container */
  className?: string;
}

/**
 * V3 Terminal Panel — standardized data panel with chrome header.
 * Used for data tables, system status, live feeds, and comparison matrices.
 *
 * Pattern:
 * ┌ ● ● ●   spacenexus:~/path         [STATUS] ┐
 * │  Content fills to edges                      │
 * └──────────────────────────────────────────────┘
 */
export default function TerminalPanel({ path, status, statusType = 'live', children, className = '' }: TerminalPanelProps) {
  const statusClasses: Record<string, string> = {
    live: 'badge badge-live',
    connected: 'badge badge-live',
    pro: 'badge badge-pro',
    new: 'badge badge-new',
  };

  return (
    <div className={`card-terminal ${className}`}>
      <div className="card-terminal__header">
        <div className="flex items-center gap-2">
          <div className="card-terminal__dots">
            <div className="card-terminal__dot card-terminal__dot--red" />
            <div className="card-terminal__dot card-terminal__dot--amber" />
            <div className="card-terminal__dot card-terminal__dot--green" />
          </div>
          <span className="card-terminal__path">spacenexus:~/{path}</span>
        </div>
        {status && (
          <span className={statusClasses[statusType] || 'badge badge-live'}>{status}</span>
        )}
      </div>
      <div className="card-terminal__body">
        {children}
      </div>
    </div>
  );
}
