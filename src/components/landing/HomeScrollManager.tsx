'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

/**
 * Manages initial scroll position on the homepage:
 * - Non-subscribers: scroll to top (see the full hero)
 * - Subscribers: scroll to the trending content section
 */
export default function HomeScrollManager() {
  const { data: session } = useSession();

  useEffect(() => {
    // Only run on initial page load, not on navigation
    if (typeof window === 'undefined') return;

    // Small delay to let the page render
    const timer = setTimeout(() => {
      if (session?.user) {
        // Subscriber: scroll to the trending content area
        const contentSection = document.getElementById('hero-content-cards');
        if (contentSection) {
          contentSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        // Non-subscriber: ensure we're at the top
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [session]);

  return null; // This component renders nothing
}
