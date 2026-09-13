/**
 * Guard: the hero clock on /mission-control must suppress its hydration
 * mismatch on the element that DIRECTLY wraps the ticking text.
 *
 * Background (2026-09-13). After every date on /mission-control was made
 * hydration-safe, a headless probe still saw minified React error #418 on
 * 2 of 6 loads. At the instant the error fired, the server-rendered
 * `<time role="timer">` read e.g. "T−17:53:51" while the client computed
 * "T−17:53:50": the hero `Countdown` prints seconds when the next launch is
 * under 24 h away, and the server and browser `Math.floor` the remaining
 * seconds a few hundred milliseconds apart. That is the same accepted
 * divergence LiveRailClock has — but Countdown.tsx puts
 * `suppressHydrationWarning` on `<time>` while the text sits inside a nested
 * `<span aria-hidden>`. React consults ONLY the nearest host parent's props
 * when it hydrates a text node (react-dom-client.production.js:
 * `newProps = hostParent.memoizedProps; ... newProps.suppressHydrationWarning`),
 * so the attribute one level up does nothing and the page falls back to a
 * client re-render of the whole Suspense boundary.
 *
 * This test renders the component the way the page does and asserts the rule
 * react-dom actually applies: every digit-bearing text node inside the timer
 * has `suppressHydrationWarning` on its own parent element. It reads the
 * React props off the DOM node (`__reactProps$…`), which is what hydration
 * compares against; the attribute never reaches the HTML.
 *
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import Countdown from '@/components/ui/Countdown';

function reactProps(el: Element): Record<string, unknown> {
  const key = Object.keys(el).find((k) => k.startsWith('__reactProps$'));
  return key ? ((el as unknown as Record<string, Record<string, unknown>>)[key] ?? {}) : {};
}

function digitTextNodes(root: Element): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    if (/\d/.test(n.nodeValue ?? '')) out.push(n as Text);
  }
  return out;
}

describe('hydration guard: hero Countdown (src/components/ui/Countdown.tsx)', () => {
  const cases: Array<[string, number]> = [
    ['under 24 h (prints seconds — mismatches on most loads)', 17 * 3600 * 1000 + 53 * 60 * 1000 + 51 * 1000],
    ['over 24 h (prints minutes — mismatches when the minute rolls)', 3 * 86400 * 1000 + 4 * 3600 * 1000],
  ];

  it.each(cases)('%s: every digit text node has suppressHydrationWarning on its own parent', (_label, msAhead) => {
    const to = new Date(Date.now() + msAhead).toISOString();
    const { container } = render(<Countdown to={to} size="lg" />);
    const timer = container.querySelector('time[role="timer"]');
    expect(timer).not.toBeNull();

    const nodes = digitTextNodes(timer as Element);
    expect(nodes.length).toBeGreaterThan(0);

    const unsuppressed = nodes
      .filter((t) => reactProps(t.parentElement as Element).suppressHydrationWarning !== true)
      .map((t) => `<${t.parentElement!.tagName.toLowerCase()}> ${JSON.stringify(t.nodeValue)}`);

    // Fix when this fails: in Countdown.tsx move (or add) suppressHydrationWarning
    // onto the <span aria-hidden="true"> that wraps the digits — the attribute on
    // <time> is one level too high for React to honour it.
    expect(unsuppressed).toEqual([]);
  });
});
