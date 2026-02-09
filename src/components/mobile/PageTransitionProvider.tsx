'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useNavigationDirection } from '@/hooks/useNavigationDirection';
import { useIsMobile } from '@/hooks/useIsMobile';

interface PageTransitionProviderProps {
  children: React.ReactNode;
}

const TRANSITION_DURATION = 0.2;
const TRANSITION_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

export default function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const pathname = usePathname();
  const direction = useNavigationDirection();
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  // On desktop, skip animations entirely
  if (!isMobile) {
    return <>{children}</>;
  }

  // Reduced motion: simple fade
  if (prefersReducedMotion) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait" custom={direction} initial={false}>
      <motion.div
        key={pathname}
        custom={direction}
        initial="enter"
        animate="center"
        exit="exit"
        variants={{
          enter: (d: number) => ({
            x: d > 0 ? '15%' : '-15%',
            opacity: 0,
          }),
          center: {
            x: 0,
            opacity: 1,
          },
          exit: (d: number) => ({
            x: d > 0 ? '-15%' : '15%',
            opacity: 0,
          }),
        }}
        transition={{
          duration: TRANSITION_DURATION,
          ease: TRANSITION_EASE,
        }}
        style={{ willChange: 'transform, opacity' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
