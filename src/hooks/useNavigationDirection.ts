'use client';

import { usePathname } from 'next/navigation';
import { useRef, useEffect, useState } from 'react';

/**
 * Returns 1 for forward navigation, -1 for back navigation.
 * Uses a pathname history stack to detect direction.
 */
export function useNavigationDirection(): number {
  const pathname = usePathname();
  const history = useRef<string[]>([]);
  const [direction, setDirection] = useState<number>(1);

  useEffect(() => {
    const stack = history.current;

    // If we're going back to a page already in our history, it's a "back" navigation
    const prevIndex = stack.lastIndexOf(pathname);
    if (prevIndex >= 0 && prevIndex < stack.length - 1) {
      // Pop everything after the found index (going back)
      history.current = stack.slice(0, prevIndex + 1);
      setDirection(-1);
    } else {
      // Forward navigation — push new pathname
      stack.push(pathname);
      setDirection(1);
    }
  }, [pathname]);

  return direction;
}
