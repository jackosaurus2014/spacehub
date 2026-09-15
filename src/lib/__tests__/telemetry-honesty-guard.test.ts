/**
 * @jest-environment node
 */
/**
 * The ascent-profile panels must not claim to be telemetry (2026-09-15).
 *
 * Both launch panels were titled "Live Telemetry" and carried a footnote
 * saying "not live vehicle telemetry" — the heading and the disclaimer
 * contradicting each other on the same screen, with a green pulsing "LIVE"
 * badge beside the numbers reinforcing the wrong half. The founder caught it
 * watching an Avio launch.
 *
 * Nothing in the codebase reads or writes the `LaunchTelemetry` table. The
 * numbers come from `Math.random()` noise over a single hardcoded
 * two-stage curve — Max-Q at 12 km, MECO, stage separation, fairing
 * separation, SECO, a 250 km orbit — applied to every vehicle regardless of
 * what it is. For a four-stage solid like Vega-C the milestones shown are not
 * merely unmeasured, they are the wrong events.
 *
 * So the panels are labelled as what they are. This guard stops the honest
 * wording drifting back, the way the original footnote was quietly
 * out-shouted by the heading above it.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const PANELS = [
  'src/components/live/TelemetryPanel.tsx',
  'src/components/launch/TelemetryDisplay.tsx',
];

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), 'utf8');
}

describe.each(PANELS)('%s', (rel) => {
  it('does not call itself telemetry in its heading', () => {
    const src = read(rel);
    // The word may appear in a disclaimer ("not measured telemetry") or a
    // comment; it must not be the title the reader sees.
    expect(src).not.toContain('Live Telemetry');
  });

  it('says plainly that the curve is illustrative and not measured', () => {
    const src = read(rel);
    expect(src).toContain('Illustrative Ascent Profile');
    expect(src).toMatch(/not measured telemetry/);
  });

  it('warns that the curve is generic rather than this vehicle’s', () => {
    // The sharpest inaccuracy: one hardcoded profile is drawn for every
    // rocket, so the milestones can be events the vehicle does not have.
    expect(read(rel)).toMatch(/generic reference curve/);
  });

  it('does not badge the modelled numbers as LIVE', () => {
    const src = read(rel);
    // A green pulsing LIVE chip beside a modelled curve reads as a feed.
    // The mission being live is said with IN FLIGHT instead.
    expect(src).not.toMatch(/>\s*LIVE\s*</);
    expect(src).toContain('IN FLIGHT');
  });
});

describe('the telemetry table', () => {
  it('is still unused, which is why these panels must not claim to be fed by it', () => {
    // If a real feed ever lands, this test is the place to notice that the
    // labelling decision above needs revisiting rather than silently kept.
    const schema = read('prisma/schema.prisma');
    expect(schema).toContain('model LaunchTelemetry');
  });
});
