'use client';
import { useState, useEffect } from 'react';
import { formatCompact, formatCurrency } from '@/lib/format-number';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export function useCompactNumber(value: number, options?: { currency?: boolean; prefix?: string }) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return options?.currency
      ? formatCurrency(value, true)
      : `${options?.prefix || ''}${formatCompact(value)}`;
  }
  return options?.currency
    ? formatCurrency(value)
    : `${options?.prefix || ''}${value.toLocaleString()}`;
}
