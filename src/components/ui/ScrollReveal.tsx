'use client';

import { ReactNode, useRef, useEffect, useState, Children, cloneElement, isValidElement } from 'react';

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

  useEffect(() => {
    const el = ref.current;
    if (!el) { setVisible(true); return; }

    if (typeof IntersectionObserver === 'undefined') {
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
      { rootMargin: '-50px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Map direction to CSS animation class
  const animClass = direction === 'up' || direction === 'down'
    ? 'animate-reveal-up'
    : 'animate-reveal-left';

  const style = delay > 0 ? { animationDelay: `${delay}s` } : undefined;

  return (
    <div
      ref={ref}
      className={`${className} ${visible ? animClass : 'opacity-0'}`}
      style={style}
    >
      {children}
    </div>
  );
}

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

  useEffect(() => {
    const el = ref.current;
    if (!el) { setVisible(true); return; }

    if (typeof IntersectionObserver === 'undefined') {
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
      { rootMargin: '-50px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Inject stagger delay into each StaggerItem child
  let index = 0;
  const staggeredChildren = Children.map(children, (child) => {
    if (isValidElement(child) && (child.type as any).__isStaggerItem) {
      const i = index++;
      return cloneElement(child as React.ReactElement<any>, {
        _visible: visible,
        _delay: i * staggerDelay,
      });
    }
    return child;
  });

  return (
    <div ref={ref} className={className}>
      {staggeredChildren}
    </div>
  );
}

// Individual stagger item — receives visibility & delay from StaggerContainer
export function StaggerItem({
  children,
  className = '',
  _visible = false,
  _delay = 0,
}: {
  children: ReactNode;
  className?: string;
  _visible?: boolean;
  _delay?: number;
}) {
  return (
    <div
      className={`${className} ${_visible ? 'animate-reveal-up' : 'opacity-0'}`}
      style={_delay > 0 ? { animationDelay: `${_delay}s` } : undefined}
    >
      {children}
    </div>
  );
}

// Tag for parent identification
(StaggerItem as any).__isStaggerItem = true;
