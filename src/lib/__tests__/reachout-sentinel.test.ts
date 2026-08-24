/**
 * @jest-environment node
 */
/**
 * Reachout sentinel — pure logic and registry integrity.
 *
 * The registry is the part most likely to rot: a renamed Prisma model or a
 * changed status vocabulary would make a channel silently report zero open
 * items forever, which is the exact failure the sentinel exists to prevent.
 * So the registry is checked against the generated Prisma client here rather
 * than trusted.
 */
import { Prisma } from '@prisma/client';
import {
  REACHOUT_CHANNELS,
  SIGNAL_CHANNELS,
  STALE_AFTER_HOURS,
  pickFirst,
  formatAge,
  condense,
  shouldAlert,
  renderReachoutAlert,
  type ReachoutSentinelResult,
} from '../reachout-sentinel';

const modelByName = (name: string) => Prisma.dmmf.datamodel.models.find((m) => m.name === name);

/** camelCase delegate key -> PascalCase model name. */
const toModelName = (delegateKey: string) => delegateKey[0].toUpperCase() + delegateKey.slice(1);

describe('reachout registry integrity', () => {
  it('has unique keys', () => {
    const keys = [...REACHOUT_CHANNELS, ...SIGNAL_CHANNELS].map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(REACHOUT_CHANNELS.map((c) => [c.key, c] as const))(
    '%s maps to a real model with the fields it queries',
    (_key, ch) => {
      const model = modelByName(toModelName(ch.model));
      expect(model).toBeDefined();
      const fields = model!.fields.map((f) => f.name);

      // Every field the collector reads must exist, or the query throws at runtime.
      expect(fields).toContain('status');
      expect(fields).toContain(ch.dateField);
      for (const f of [...ch.identityFields, ...ch.gistFields]) {
        expect(fields).toContain(f);
      }
    },
  );

  it.each(REACHOUT_CHANNELS.map((c) => [c.key, c] as const))(
    '%s open statuses match the values the schema documents',
    (_key, ch) => {
      const model = modelByName(toModelName(ch.model))!;
      const statusField = model.fields.find((f) => f.name === 'status')!;
      // The schema documents the vocabulary in a trailing comment; the default
      // is machine-readable and must itself be an open state — a brand new
      // row has to count as needing a response.
      const dflt = statusField.default as unknown;
      const defaultValue = typeof dflt === 'string' ? dflt : undefined;
      if (defaultValue) {
        expect(ch.openStatuses).toContain(defaultValue);
      }
      expect(ch.openStatuses.length).toBeGreaterThan(0);
    },
  );

  it.each(SIGNAL_CHANNELS.map((c) => [c.key, c] as const))(
    '%s signal channel maps to a real model and comment field',
    (_key, sig) => {
      const model = modelByName(toModelName(sig.model));
      expect(model).toBeDefined();
      const fields = model!.fields.map((f) => f.name);
      expect(fields).toContain(sig.dateField);
      expect(fields).toContain(sig.commentField);
    },
  );

  it('signal channels have no status field — that is why they are not escalated', () => {
    for (const sig of SIGNAL_CHANNELS) {
      const model = modelByName(toModelName(sig.model))!;
      expect(model.fields.map((f) => f.name)).not.toContain('status');
    }
  });

  it('covers the contact form, the channel that went unwatched', () => {
    const contact = REACHOUT_CHANNELS.find((c) => c.model === 'contactSubmission');
    expect(contact).toBeDefined();
    expect(contact!.openStatuses).toContain('new');
  });
});

describe('pickFirst', () => {
  it('returns the first non-empty field in order', () => {
    expect(pickFirst({ name: 'Ada', email: 'a@b.c' }, ['name', 'email'])).toBe('Ada');
    expect(pickFirst({ name: '', email: 'a@b.c' }, ['name', 'email'])).toBe('a@b.c');
    expect(pickFirst({ name: '   ', email: 'a@b.c' }, ['name', 'email'])).toBe('a@b.c');
  });

  it('ignores non-string and missing values', () => {
    expect(pickFirst({ n: 5, email: 'a@b.c' }, ['n', 'email'])).toBe('a@b.c');
    expect(pickFirst({}, ['name'])).toBe('');
    expect(pickFirst({ name: null }, ['name'])).toBe('');
  });
});

describe('formatAge', () => {
  it('reads naturally across the ranges an ops email needs', () => {
    expect(formatAge(0.5)).toBe('<1h');
    expect(formatAge(5)).toBe('5h');
    expect(formatAge(23.9)).toBe('23h');
    expect(formatAge(24)).toBe('1d');
    expect(formatAge(52)).toBe('2d 4h');
    expect(formatAge(264)).toBe('11d');
  });

  it('never renders NaN or a negative age', () => {
    expect(formatAge(NaN)).toBe('unknown');
    expect(formatAge(-3)).toBe('unknown');
  });
});

describe('condense', () => {
  it('flattens whitespace', () => {
    expect(condense('a\n\n  b\tc')).toBe('a b c');
  });

  it('truncates with an ellipsis at the limit', () => {
    const out = condense('x'.repeat(300));
    expect(out.length).toBe(180);
    expect(out.endsWith('…')).toBe(true);
  });

  it('leaves short text alone', () => {
    expect(condense('short')).toBe('short');
  });
});

describe('shouldAlert', () => {
  it('stays quiet when nothing is stale', () => {
    expect(shouldAlert({ totalStale: 0 })).toBe(false);
  });

  it('alerts on the first stale item', () => {
    expect(shouldAlert({ totalStale: 1 })).toBe(true);
  });
});

describe('renderReachoutAlert', () => {
  const result: ReachoutSentinelResult = {
    generatedAt: '2026-08-24T15:00:00.000Z',
    channels: [
      { key: 'contact', label: 'Contact form', openCount: 3, staleCount: 2, oldestAgeHours: 288, adminUrl: 'https://x/admin?tab=reachouts' },
      { key: 'meeting', label: 'Meeting request', openCount: 0, staleCount: 0, oldestAgeHours: null, adminUrl: null },
    ],
    signals: [{ key: 'nps-widget', label: 'NPS widget comments', withCommentThisWeek: 4 }],
    stale: [
      { channelKey: 'contact', channelLabel: 'Contact form', id: '1', who: 'Ada <a@b.c>', gist: 'Partnership enquiry', status: 'new', ageHours: 288, adminUrl: 'https://x/admin?tab=reachouts' },
      { channelKey: 'interest', channelLabel: 'Marketplace interest', id: '2', who: 'z@y.x', gist: 'Wants a quote', status: 'expressed', ageHours: 30, adminUrl: null },
    ],
    totalOpen: 3,
    totalStale: 2,
    errors: [],
  };

  it('leads the subject with the count and the oldest item', () => {
    const { subject } = renderReachoutAlert(result);
    expect(subject).toContain('2 unanswered reachouts');
    expect(subject).toContain('12d');
    expect(subject).toContain('Contact form');
  });

  it('singularises a lone reachout', () => {
    const { subject } = renderReachoutAlert({ ...result, stale: [result.stale[0]], totalStale: 1 });
    expect(subject).toContain('1 unanswered reachout —');
    expect(subject).not.toContain('reachouts');
  });

  it('tells the reader when a channel has nowhere to triage', () => {
    const { html, text } = renderReachoutAlert(result);
    expect(html).toContain('no admin surface');
    expect(text).toContain('no admin surface');
  });

  it('lists every stale item in both html and text', () => {
    const { html, text } = renderReachoutAlert(result);
    for (const r of result.stale) {
      expect(html).toContain(r.gist);
      expect(text).toContain(r.gist);
    }
  });

  it('escapes sender-controlled text', () => {
    const hostile = {
      ...result,
      stale: [{ ...result.stale[0], who: '<script>alert(1)</script>', gist: 'a & b' }],
      totalStale: 1,
    };
    const { html } = renderReachoutAlert(hostile);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('a &amp; b');
  });

  it('surfaces collection errors rather than hiding them', () => {
    const { html, text } = renderReachoutAlert({ ...result, errors: ['help: table missing'] });
    expect(html).toContain('help: table missing');
    expect(text).toContain('help: table missing');
  });

  it('states the staleness threshold so the number is never a mystery', () => {
    const { html } = renderReachoutAlert(result);
    expect(html).toContain(`${STALE_AFTER_HOURS}h`);
  });
});
