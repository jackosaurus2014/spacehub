'use client';

import { useIsMobile } from '@/hooks/useIsMobile';
import MobileDataCard from './MobileDataCard';
import { ReactNode } from 'react';

interface ColumnDef<T> {
  header: string;
  accessor: keyof T | ((item: T) => ReactNode);
  className?: string;
}

interface MobileCardConfig<T> {
  title: (item: T) => string;
  subtitle?: (item: T) => string;
  icon?: (item: T) => ReactNode;
  primaryValue: (item: T) => string | number;
  primaryLabel: string;
  secondaryFields?: (item: T) => { label: string; value: string | number }[];
  trend?: (item: T) => 'up' | 'down' | 'neutral' | undefined;
  trendValue?: (item: T) => string | undefined;
  onClick?: (item: T) => void;
}

interface MobileTableViewProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  mobileCard: MobileCardConfig<T>;
  keyExtractor: (item: T) => string | number;
  className?: string;
}

export default function MobileTableView<T>({
  data,
  columns,
  mobileCard,
  keyExtractor,
  className = '',
}: MobileTableViewProps<T>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className={`space-y-3 ${className}`}>
        {data.map((item) => (
          <MobileDataCard
            key={keyExtractor(item)}
            title={mobileCard.title(item)}
            subtitle={mobileCard.subtitle?.(item)}
            icon={mobileCard.icon?.(item)}
            primaryValue={mobileCard.primaryValue(item)}
            primaryLabel={mobileCard.primaryLabel}
            secondaryFields={mobileCard.secondaryFields?.(item)}
            trend={mobileCard.trend?.(item)}
            trendValue={mobileCard.trendValue?.(item)}
            onClick={mobileCard.onClick ? () => mobileCard.onClick!(item) : undefined}
          />
        ))}
      </div>
    );
  }

  // Desktop: standard table
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-slate-700/50">
            {columns.map((col) => (
              <th
                key={col.header}
                className={`px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
            >
              {columns.map((col) => (
                <td key={col.header} className={`px-4 py-3 text-slate-300 ${col.className || ''}`}>
                  {typeof col.accessor === 'function'
                    ? col.accessor(item)
                    : (item[col.accessor] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
