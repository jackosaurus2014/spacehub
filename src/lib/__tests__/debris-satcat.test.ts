/**
 * @jest-environment node
 */
/**
 * SATCAT-backed debris statistics. Regression context: the daily snapshot
 * previously wrote totalTracked=593 and totalDebris=0 (hardcoded) while the
 * real catalogue holds ~35k on-orbit objects, ~12.5k of them debris.
 */
import {
  splitCsvLine,
  parseSatcatCsv,
  orbitBucketFromPeriod,
  computeCatalogStats,
} from '../debris-data';

const HEADER = 'OBJECT_NAME,OBJECT_ID,NORAD_CAT_ID,OBJECT_TYPE,OPS_STATUS_CODE,OWNER,LAUNCH_DATE,LAUNCH_SITE,DECAY_DATE,PERIOD,INCLINATION,APOGEE,PERIGEE,RCS,DATA_STATUS_CODE,ORBIT_CENTER,ORBIT_TYPE';

describe('splitCsvLine', () => {
  it('splits plain fields', () => {
    expect(splitCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('respects quoted fields containing commas — object names have them', () => {
    expect(splitCsvLine('"WESTFORD NEEDLES, CLUMP",1963-014XY,x')).toEqual([
      'WESTFORD NEEDLES, CLUMP', '1963-014XY', 'x',
    ]);
  });

  it('keeps empty fields positional', () => {
    expect(splitCsvLine('a,,c,')).toEqual(['a', '', 'c', '']);
  });
});

describe('parseSatcatCsv', () => {
  it('parses rows and skips the header and blanks', () => {
    const csv = [
      HEADER,
      'SL-1 R/B,1957-001A,1,R/B,D,CIS,1957-10-04,TYMSC,1957-12-01,96.19,65.10,938,214,20.4200,,EA,IMP',
      '',
      'ISS (ZARYA),1998-067A,25544,PAY,+,ISS,1998-11-20,TYMSC,,92.90,51.63,424,408,399.1,,EA,ORB',
    ].join('\n');
    const rows = parseSatcatCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].decayed).toBe(true);
    expect(rows[1]).toMatchObject({ noradId: '25544', objectType: 'PAY', decayed: false, periodMinutes: 92.9 });
  });
});

describe('orbitBucketFromPeriod', () => {
  it('classifies the standard bands', () => {
    expect(orbitBucketFromPeriod(92.9)).toBe('LEO');    // ISS
    expect(orbitBucketFromPeriod(718)).toBe('MEO');     // GPS
    expect(orbitBucketFromPeriod(1436)).toBe('GEO');
    expect(orbitBucketFromPeriod(null)).toBeNull();
    expect(orbitBucketFromPeriod(40000)).toBeNull();    // deep space
  });
});

describe('computeCatalogStats', () => {
  const row = (over: Record<string, unknown>) => ({
    name: 'X', noradId: '1', objectType: 'PAY', decayed: false,
    periodMinutes: 95, inclination: 51, apogeeKm: 420, perigeeKm: 410,
    orbitCenter: 'EA', ...over,
  });

  it('counts only on-orbit Earth objects, by class', () => {
    const stats = computeCatalogStats([
      row({ objectType: 'PAY' }),
      row({ objectType: 'DEB' }),
      row({ objectType: 'R/B' }),
      row({ objectType: 'TBA' }),
      row({ objectType: 'DEB', decayed: true }),      // decayed: excluded
      row({ objectType: 'PAY', orbitCenter: 'SU' }),  // heliocentric: excluded
    ] as never);
    expect(stats.totalTracked).toBe(4);
    expect(stats.totalDebris).toBe(1);
    expect(stats.totalRocketBodies).toBe(1);
    expect(stats.totalUnknown).toBe(1);
  });

  it('never reports the pre-fix shape: debris hardcoded to zero', () => {
    const stats = computeCatalogStats([row({ objectType: 'DEB' })] as never);
    expect(stats.totalDebris).toBeGreaterThan(0);
  });
});
