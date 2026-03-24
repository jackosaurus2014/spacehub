'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TickerItem {
  type: 'stock' | 'funding' | 'news' | 'live' | 'launch' | 'blog' | 'preipo';
  label: string;
  value: string;
  change?: string;
  url?: string;
  color: 'green' | 'red' | 'neutral' | 'cyan' | 'amber' | 'indigo' | 'purple';
}

// ─── Color mapping ──────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { text: string; bg: string; border: string; dot?: string }> = {
  green:   { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  red:     { text: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20', dot: 'bg-red-500' },
  neutral: { text: 'text-zinc-400',    bg: '',                   border: '' },
  cyan:    { text: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20' },
  amber:   { text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  indigo:  { text: 'text-indigo-400',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20' },
  purple:  { text: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20' },
};

const TYPE_ICONS: Record<string, string> = {
  stock: '',
  funding: '💰',
  news: '📰',
  live: '●',
  launch: '🚀',
  blog: '📝',
  preipo: '📊',
};

// ─── Ticker Item Component ──────────────────────────────────────────────────

function TickerItemView({ item }: { item: TickerItem }) {
  const colors = COLOR_MAP[item.color] || COLOR_MAP.neutral;
  const icon = TYPE_ICONS[item.type] || '';

  const content = (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {/* Label badge */}
      {item.type === 'live' ? (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
          ● LIVE
        </span>
      ) : item.type === 'stock' ? (
        <span className="text-zinc-500 text-[10px] font-bold">{item.label}</span>
      ) : (
        <span className={`text-[9px] px-1 py-0.5 rounded ${colors.bg} ${colors.text} ${colors.border ? `border ${colors.border}` : ''} font-medium`}>
          {icon} {item.label}
        </span>
      )}

      {/* Value */}
      <span className={`text-[11px] ${item.type === 'stock' ? 'font-mono font-medium text-zinc-200' : 'text-zinc-300'}`}>
        {item.value}
      </span>

      {/* Change indicator (stocks) */}
      {item.change && (
        <span className={`text-[10px] font-mono font-medium ${
          item.change.includes('▲') ? 'text-emerald-400' :
          item.change.includes('▼') ? 'text-red-400' : 'text-zinc-500'
        }`}>
          {item.change}
        </span>
      )}
    </span>
  );

  if (item.url) {
    return (
      <a href={item.url} className="hover:opacity-80 transition-opacity" target={item.url.startsWith('http') ? '_blank' : undefined}>
        {content}
      </a>
    );
  }

  return content;
}

// ─── Separator ──────────────────────────────────────────────────────────────

function Separator() {
  return <span className="text-zinc-700 mx-3 select-none">│</span>;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function IndustryTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Get persona from localStorage
  const getPersona = useCallback(() => {
    if (typeof window === 'undefined') return 'enthusiast';
    try {
      const prefs = localStorage.getItem('spacenexus_preferences');
      if (prefs) {
        const parsed = JSON.parse(prefs);
        return parsed.persona || 'enthusiast';
      }
    } catch {}
    return 'enthusiast';
  }, []);

  // Fetch ticker data
  const fetchTicker = useCallback(async () => {
    try {
      const persona = getPersona();
      const res = await fetch(`/api/ticker?persona=${persona}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.items?.length > 0) {
        setItems(data.items);
      }
    } catch {
      // Silently fail — ticker is non-critical
    } finally {
      setLoading(false);
    }
  }, [getPersona]);

  useEffect(() => {
    fetchTicker();
    // Refresh every 3 minutes
    const interval = setInterval(fetchTicker, 180_000);
    return () => clearInterval(interval);
  }, [fetchTicker]);

  if (loading || items.length === 0) {
    return null; // Don't render empty ticker
  }

  return (
    <div
      className="w-full overflow-hidden border-b"
      style={{
        background: 'linear-gradient(to right, rgba(9,9,11,0.95), rgba(15,15,20,0.95), rgba(9,9,11,0.95))',
        borderColor: 'rgba(99, 102, 241, 0.08)',
      }}
    >
      <div className="relative h-7 flex items-center">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-8 z-10" style={{ background: 'linear-gradient(to right, rgba(9,9,11,1), transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-8 z-10" style={{ background: 'linear-gradient(to left, rgba(9,9,11,1), transparent)' }} />

        {/* Scrolling content — duplicated for seamless loop */}
        <div className="animate-ticker flex items-center whitespace-nowrap">
          {items.map((item, i) => (
            <span key={`a-${i}`} className="inline-flex items-center">
              <TickerItemView item={item} />
              {i < items.length - 1 && <Separator />}
            </span>
          ))}
          <Separator />
          {items.map((item, i) => (
            <span key={`b-${i}`} className="inline-flex items-center">
              <TickerItemView item={item} />
              {i < items.length - 1 && <Separator />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
