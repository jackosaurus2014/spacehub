'use client';

import React, { ReactNode, useRef, useEffect, useLayoutEffect, useState, useContext, createContext, Children, cloneElement, isValidElement } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
}

/**
 * ScrollReveal — CSS-only entrance animation triggered by IntersectionObserver.
 * Replaces the previous framer-motion implementation with zero JS-animation overhead.
 */
export default function ScrollReveal({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) { setVisible(true); return; }

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    // Check if already in viewport (above-the-fold content)
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Map direction to CSS animation class
  const animClass = direction === 'up' || direction === 'down'
    ? 'animate-reveal-up'
    : 'animate-reveal-left';

  const style = delay > 0 ? { animationDelay: `${delay}s`, animationFillMode: 'both' as const } : undefined;

  return (
    <div
      ref={ref}
      className={`${className} ${reducedMotion ? '' : visible ? animClass : 'opacity-0'}`}
      style={style}
    >
      {children}
    </div>
  );
}

// StaggerItem used to learn its visibility only through cloneElement on a
// `__isStaggerItem` static tag. When the items are rendered by a Server
// Component (e.g. /hire, /guide) the container sees client-reference proxies
// without that tag, cloneElement never runs, and the items stay at opacity 0
// forever (found by the 2026-09-12 phone pass: 11 invisible sections on
// /hire, 32 on /guide). The context below is what StaggerItem reads now; the
// clone path is kept for client-rendered trees so nothing else changes.
const StaggerContext = createContext<{ visible: boolean; staggerDelay: number } | null>(null);

// Content must never stay hidden: if the observer never fires (already in view
// but no intersection callback, SSR-only clients, odd scroll containers),
// reveal anyway after this long.
const REVEAL_FAILSAFE_MS = 2500;

// Staggered container — uses IntersectionObserver to trigger sequential child reveals
export function StaggerContainer({
  children,
  className = '',
  staggerDelay = 0.1,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) { setVisible(true); return; }

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    // Check if already in viewport (above-the-fold content)
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px' }
    );
    observer.observe(el);
    const failsafe = window.setTimeout(() => setVisible(true), REVEAL_FAILSAFE_MS);
    return () => { observer.disconnect(); window.clearTimeout(failsafe); };
  }, []);

  // Inject stagger delay into each StaggerItem child (traverses Fragments)
  let index = 0;
  function processChildren(kids: ReactNode): ReactNode {
    return Children.map(kids, (child) => {
      if (isValidElement(child) && (child.type as any).__isStaggerItem) {
        const i = index++;
        return cloneElement(child as React.ReactElement<any>, {
          _visible: visible,
          _delay: i * staggerDelay,
        });
      }
      // Traverse into Fragment children so StaggerItems inside Fragments are found
      if (isValidElement(child) && child.type === React.Fragment) {
        const fragmentProps = child.props as { children?: ReactNode };
        if (fragmentProps.children) {
          return cloneElement(child, {}, processChildren(fragmentProps.children));
        }
      }
      return child;
    });
  }
  const staggeredChildren = processChildren(children);

  return (
    <StaggerContext.Provider value={{ visible: visible || reducedMotion, staggerDelay }}>
      <div ref={ref} className={className}>
        {staggeredChildren}
      </div>
    </StaggerContext.Provider>
  );
}

// Individual stagger item — receives visibility & delay from StaggerContainer
export function StaggerItem({
  children,
  className = '',
  _visible,
  _delay,
}: {
  children: ReactNode;
  className?: string;
  _visible?: boolean;
  _delay?: number;
}) {
  const ctx = useContext(StaggerContext);
  const ref = useRef<HTMLDivElement>(null);
  const [domIndex, setDomIndex] = useState(0);
  // Position among siblings drives the stagger when the container could not
  // inject a delay (server-rendered children). Runs before paint.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !el.parentElement || _delay !== undefined) return;
    const i = Array.prototype.indexOf.call(el.parentElement.children, el);
    if (i >= 0 && i !== domIndex) setDomIndex(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // No container at all (item used on its own): show it, never hide content.
  const visible = _visible !== undefined ? _visible : ctx ? ctx.visible : true;
  const delay = _delay !== undefined ? _delay : ctx ? domIndex * ctx.staggerDelay : 0;
  return (
    <div
      ref={ref}
      className={`${className} ${visible ? 'animate-reveal-up' : 'opacity-0'}`}
      style={delay > 0 ? { animationDelay: `${delay}s`, animationFillMode: 'both' } : undefined}
    >
      {children}
    </div>
  );
}

// Tag for parent identification
(StaggerItem as any).__isStaggerItem = true;
