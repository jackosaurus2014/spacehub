/**
 * Entry rendering: newest first, an honest empty state, and a hydration-safe
 * timestamp (fixed UTC on the first render, relative only after mount).
 */
import { render, screen, waitFor } from '@testing-library/react';
import LaunchLiveBlog, { relativeStamp, utcStamp } from '@/components/launch/LaunchLiveBlog';
import type { SerializedLiveEntry } from '@/lib/launch-live-blog';

jest.mock('next-auth/react', () => ({ useSession: () => ({ data: null, status: 'unauthenticated' }) }));

const entry = (id: string, at: string, body = `entry ${id}`): SerializedLiveEntry => ({
  id, body, linkUrl: null, linkLabel: null, imageUrl: null, kind: 'update', at,
});

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: { entries: [], latestAt: null } }),
  }) as unknown as typeof fetch;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('LaunchLiveBlog', () => {
  it('renders an empty blog honestly', async () => {
    render(<LaunchLiveBlog eventId="e1" initialEntries={[]} />);
    expect(await screen.findByText('Updates will appear here.')).toBeInTheDocument();
  });

  it('renders seeded entries newest first', async () => {
    const entries = [
      entry('c', '2026-09-14T18:00:00.000Z'),
      entry('b', '2026-09-14T17:30:00.000Z'),
      entry('a', '2026-09-14T17:00:00.000Z'),
    ];
    // The poll returns the same rows so the list does not empty out.
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { entries, latestAt: entries[0].at } }),
    });
    const { container } = render(<LaunchLiveBlog eventId="e1" initialEntries={entries} />);
    await waitFor(() => expect(container.querySelectorAll('li')).toHaveLength(3));
    const texts = Array.from(container.querySelectorAll('li p')).map((p) => p.textContent);
    expect(texts).toEqual(['entry c', 'entry b', 'entry a']);
  });

  it('puts suppressHydrationWarning on the element that owns the clock text', async () => {
    const entries = [entry('a', '2026-09-14T17:00:00.000Z')];
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { entries, latestAt: entries[0].at } }),
    });
    const { container } = render(<LaunchLiveBlog eventId="e1" initialEntries={entries} />);
    const time = await waitFor(() => {
      const el = container.querySelector('time');
      expect(el).not.toBeNull();
      return el!;
    });
    // The <time> element is the direct parent of the timestamp text node.
    expect(time.childNodes).toHaveLength(1);
    expect(time.childNodes[0].nodeType).toBe(Node.TEXT_NODE);
    expect(time.getAttribute('datetime')).toBe('2026-09-14T17:00:00.000Z');
  });
});

describe('timestamp helpers', () => {
  it('utcStamp is zone-free and identical on both sides of hydration', () => {
    expect(utcStamp('2026-09-14T17:05:00.000Z')).toBe('17:05 UTC');
    expect(utcStamp('not a date')).toBe('--:--');
  });

  it('relativeStamp counts up from the entry', () => {
    const at = Date.parse('2026-09-14T17:00:00.000Z');
    expect(relativeStamp('2026-09-14T17:00:00.000Z', at + 10_000)).toBe('just now');
    expect(relativeStamp('2026-09-14T17:00:00.000Z', at + 5 * 60_000)).toBe('5m ago');
    expect(relativeStamp('2026-09-14T17:00:00.000Z', at + 3 * 3600_000)).toBe('3h ago');
    expect(relativeStamp('2026-09-14T17:00:00.000Z', at + 2 * 86_400_000)).toBe('2d ago');
    expect(relativeStamp('2026-09-14T17:00:00.000Z', at - 60_000)).toBe('just now');
  });
});
