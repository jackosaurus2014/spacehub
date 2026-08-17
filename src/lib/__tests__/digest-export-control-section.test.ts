/**
 * @jest-environment node
 */
import {
  buildExportControlWatchSection,
  renderDigestEmail,
  type DigestExportControlItem,
} from '../newsletter/email-templates';

const DATE = new Date('2026-08-16T00:00:00Z');
const FEATURES = [{ title: 'Feature One', content: 'Analysis content.' }];
const NEWS = {
  'Launches & Missions': [
    { title: 'Falcon 9 launch', summary: 'A launch.', url: 'https://example.com/1', source: 'ExampleWire' },
  ],
};

const WATCH_ITEMS: DigestExportControlItem[] = [
  {
    title: 'Revisions to the Commerce Control List: spacecraft items (ECCN 9x515)',
    whatHappened: 'Final rule published',
    whyItMatters:
      'Changes to the EAR/Commerce Control List affect licensing for commercial satellites, components, and related technology (including 9x515 items).',
    dateLine: 'Comments close 2026-09-15',
    url: 'https://www.federalregister.gov/documents/2026-11111',
    agency: 'Bureau of Industry and Security',
  },
];

describe('buildExportControlWatchSection', () => {
  it('renders empty strings when there are no items', () => {
    expect(buildExportControlWatchSection([], false)).toEqual({ html: '', plain: '' });
  });

  it('renders each item with what-happened, why-it-matters, date line, and link', () => {
    const { html, plain } = buildExportControlWatchSection(WATCH_ITEMS, false);
    expect(html).toContain('Export Control Watch');
    expect(html).toContain('Final rule published');
    expect(html).toContain('Bureau of Industry and Security');
    expect(html).toContain('Comments close 2026-09-15');
    expect(html).toContain('https://www.federalregister.gov/documents/2026-11111');
    expect(html).toContain('/regulatory-radar');
    expect(plain).toContain('EXPORT CONTROL WATCH');
    expect(plain).toContain('Final rule published');
    expect(plain).toContain('/regulatory-radar');
  });

  it('mentions overflow only when more actions qualified than shown', () => {
    expect(buildExportControlWatchSection(WATCH_ITEMS, true).html).toContain('More qualifying actions');
    expect(buildExportControlWatchSection(WATCH_ITEMS, false).html).not.toContain('More qualifying actions');
  });

  it('escapes HTML in item fields', () => {
    const { html } = buildExportControlWatchSection(
      [{ ...WATCH_ITEMS[0], title: 'Rule <script>alert(1)</script>' }],
      false
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('renderDigestEmail with Export Control Watch', () => {
  it('is byte-identical to the legacy signature when there are no watch items', () => {
    const legacy = renderDigestEmail(DATE, FEATURES, NEWS);
    const explicitEmpty = renderDigestEmail(DATE, FEATURES, NEWS, undefined, [], false);
    expect(explicitEmpty.html).toBe(legacy.html);
    expect(explicitEmpty.plain).toBe(legacy.plain);
    expect(explicitEmpty.subject).toBe(legacy.subject);
    expect(legacy.html).not.toContain('Export Control Watch');
    expect(legacy.plain).not.toContain('EXPORT CONTROL WATCH');
  });

  it('includes the watch section (before the news sections) when items are present', () => {
    const { html, plain } = renderDigestEmail(DATE, FEATURES, NEWS, undefined, WATCH_ITEMS, false);
    expect(html).toContain('Export Control Watch');
    expect(plain).toContain('EXPORT CONTROL WATCH');
    // Watch section appears before the first news item
    expect(html.indexOf('Export Control Watch')).toBeGreaterThan(-1);
    expect(html.indexOf('Export Control Watch')).toBeLessThan(html.indexOf('Falcon 9 launch'));
  });
});
