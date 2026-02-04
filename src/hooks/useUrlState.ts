'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

/**
 * Syncs component state with URL search parameters.
 * Reads initial values from the URL and updates the URL when state changes.
 * Supports string, boolean, and number types.
 */
export function useUrlState<T extends Record<string, string | boolean | number | null>>(
  defaults: T
): [T, (updates: Partial<T>) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const state = useMemo(() => {
    const result = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const urlValue = searchParams.get(key);
      if (urlValue !== null) {
        const defaultVal = defaults[key];
        if (typeof defaultVal === 'boolean') {
          (result as Record<string, unknown>)[key] = urlValue === 'true';
        } else if (typeof defaultVal === 'number') {
          const parsed = Number(urlValue);
          (result as Record<string, unknown>)[key] = isNaN(parsed) ? defaultVal : parsed;
        } else {
          (result as Record<string, unknown>)[key] = urlValue;
        }
      }
    }
    return result;
  }, [searchParams, defaults]);

  const setState = useCallback(
    (updates: Partial<T>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        const defaultVal = defaults[key];
        if (
          value === null ||
          value === '' ||
          value === false ||
          value === 0 ||
          value === defaultVal
        ) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname, defaults]
  );

  return [state, setState];
}
