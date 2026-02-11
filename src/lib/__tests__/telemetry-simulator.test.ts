import {
  generateTelemetryPoint,
  getTypicalProfile,
  generateTelemetryBatch,
  TelemetryPoint,
} from '../launch/telemetry-simulator';

// ---------------------------------------------------------------------------
// Helper: assert all numeric fields are not NaN
// ---------------------------------------------------------------------------
function assertNoNaN(point: TelemetryPoint) {
  const numericKeys: (keyof TelemetryPoint)[] = [
    'missionTime', 'altitude', 'velocity', 'downrange',
    'acceleration', 'throttle', 'latitude', 'longitude',
    'dynamicPressure', 'fuelRemaining',
  ];
  for (const key of numericKeys) {
    expect(typeof point[key]).toBe('number');
    expect(Number.isNaN(point[key])).toBe(false);
  }
}

// ---------------------------------------------------------------------------
// generateTelemetryPoint
// ---------------------------------------------------------------------------
describe('generateTelemetryPoint', () => {
  describe('pre-launch (T-100)', () => {
    it('returns zero velocity, altitude, and acceleration', () => {
      const point = generateTelemetryPoint(-100, 'falcon9');
      expect(point.velocity).toBe(0);
      expect(point.altitude).toBe(0);
      expect(point.acceleration).toBe(0);
      expect(point.downrange).toBe(0);
    });

    it('returns 100% fuel remaining', () => {
      const point = generateTelemetryPoint(-100, 'falcon9');
      expect(point.fuelRemaining).toBe(100);
    });

    it('returns attached stage and fairing', () => {
      const point = generateTelemetryPoint(-100, 'falcon9');
      expect(point.stageStatus).toBe('attached');
      expect(point.fairingStatus).toBe('attached');
    });

    it('returns isMaxQ false', () => {
      const point = generateTelemetryPoint(-100, 'falcon9');
      expect(point.isMaxQ).toBe(false);
    });

    it('has zero throttle far before launch', () => {
      const point = generateTelemetryPoint(-100, 'falcon9');
      expect(point.throttle).toBe(0);
    });

    it('ramps throttle in the final 10 seconds before launch', () => {
      const point = generateTelemetryPoint(-5, 'falcon9');
      expect(point.throttle).toBe(100);
    });

    it('has no NaN values', () => {
      assertNoNaN(generateTelemetryPoint(-100, 'falcon9'));
    });
  });

  describe('liftoff (T+0 to T+10)', () => {
    it('starts climbing in altitude and velocity', () => {
      // Run a few iterations to account for noise, check that at T+10 values are positive
      const point = generateTelemetryPoint(10, 'falcon9');
      expect(point.altitude).toBeGreaterThan(0);
      expect(point.velocity).toBeGreaterThan(0);
    });

    it('has positive acceleration', () => {
      const point = generateTelemetryPoint(10, 'falcon9');
      expect(point.acceleration).toBeGreaterThan(1);
    });

    it('has stage and fairing still attached', () => {
      const point = generateTelemetryPoint(10, 'falcon9');
      expect(point.stageStatus).toBe('attached');
      expect(point.fairingStatus).toBe('attached');
    });

    it('has no NaN values', () => {
      assertNoNaN(generateTelemetryPoint(5, 'falcon9'));
    });
  });

  describe('Max-Q (T+72)', () => {
    it('has dynamic pressure near peak (30-40 kPa range)', () => {
      // getTypicalProfile gives noise-free value; use that for exact check
      const profile = getTypicalProfile(72);
      expect(profile.dynamicPressure).toBeGreaterThanOrEqual(30);
      expect(profile.dynamicPressure).toBeLessThanOrEqual(40);
    });

    it('marks isMaxQ as true at T+72', () => {
      const point = generateTelemetryPoint(72, 'falcon9');
      expect(point.isMaxQ).toBe(true);
    });

    it('marks isMaxQ as true within the T+67 to T+77 window', () => {
      expect(generateTelemetryPoint(67, 'falcon9').isMaxQ).toBe(true);
      expect(generateTelemetryPoint(77, 'falcon9').isMaxQ).toBe(true);
    });

    it('marks isMaxQ as false outside the window', () => {
      expect(generateTelemetryPoint(60, 'falcon9').isMaxQ).toBe(false);
      expect(generateTelemetryPoint(85, 'falcon9').isMaxQ).toBe(false);
    });

    it('throttles down during Max-Q window (T+50 to T+80)', () => {
      // Typical profile does not expose throttle, but we can use the noisy point
      // Throttle should be around 70% (± noise) during this window
      const point = generateTelemetryPoint(65, 'falcon9');
      expect(point.throttle).toBeLessThan(90);
      expect(point.throttle).toBeGreaterThan(50);
    });

    it('has no NaN values', () => {
      assertNoNaN(generateTelemetryPoint(72, 'falcon9'));
    });
  });

  describe('MECO (T+162)', () => {
    it('has high velocity (~2+ km/s)', () => {
      const point = generateTelemetryPoint(162, 'falcon9');
      expect(point.velocity).toBeGreaterThan(2);
    });

    it('has stage 1 fuel near 0%', () => {
      const point = generateTelemetryPoint(162, 'falcon9');
      // tNorm = 1.0, so fuelRemaining = 100*(1-1) + noise ≈ 0
      expect(point.fuelRemaining).toBeLessThan(5);
    });

    it('has altitude around 80 km', () => {
      const point = generateTelemetryPoint(162, 'falcon9');
      expect(point.altitude).toBeGreaterThan(70);
      expect(point.altitude).toBeLessThan(90);
    });

    it('has no NaN values', () => {
      assertNoNaN(generateTelemetryPoint(162, 'falcon9'));
    });
  });

  describe('stage separation (T+163 to T+165)', () => {
    it('has stageStatus as separated', () => {
      const point = generateTelemetryPoint(163, 'falcon9');
      expect(point.stageStatus).toBe('separated');
    });

    it('has fairing still attached', () => {
      const point = generateTelemetryPoint(163, 'falcon9');
      expect(point.fairingStatus).toBe('attached');
    });

    it('has zero throttle during coast', () => {
      const point = generateTelemetryPoint(164, 'falcon9');
      expect(point.throttle).toBe(0);
    });

    it('has fuel remaining at 0', () => {
      const point = generateTelemetryPoint(163, 'falcon9');
      expect(point.fuelRemaining).toBe(0);
    });

    it('has no NaN values', () => {
      assertNoNaN(generateTelemetryPoint(164, 'falcon9'));
    });
  });

  describe('fairing separation (T+210+)', () => {
    it('has fairingStatus as separated after T+210', () => {
      const point = generateTelemetryPoint(220, 'falcon9');
      expect(point.fairingStatus).toBe('separated');
    });

    it('has fairingStatus as attached just before T+210', () => {
      const point = generateTelemetryPoint(200, 'falcon9');
      expect(point.fairingStatus).toBe('attached');
    });
  });

  describe('SECO (T+510)', () => {
    it('has near orbital velocity (~7.5+ km/s)', () => {
      const point = generateTelemetryPoint(510, 'falcon9');
      expect(point.velocity).toBeGreaterThan(7.5);
    });

    it('has altitude above 200 km', () => {
      const point = generateTelemetryPoint(510, 'falcon9');
      expect(point.altitude).toBeGreaterThan(200);
    });

    it('has fairingStatus as separated', () => {
      const point = generateTelemetryPoint(510, 'falcon9');
      expect(point.fairingStatus).toBe('separated');
    });

    it('has no NaN values', () => {
      assertNoNaN(generateTelemetryPoint(510, 'falcon9'));
    });
  });

  describe('orbital coast (T+1000)', () => {
    it('has altitude around 250 km (reasonable orbital altitude)', () => {
      const point = generateTelemetryPoint(1000, 'falcon9');
      expect(point.altitude).toBeGreaterThan(230);
      expect(point.altitude).toBeLessThan(270);
    });

    it('has near orbital velocity', () => {
      const point = generateTelemetryPoint(1000, 'falcon9');
      expect(point.velocity).toBeGreaterThan(7.5);
      expect(point.velocity).toBeLessThan(8.5);
    });

    it('has zero throttle', () => {
      const point = generateTelemetryPoint(1000, 'falcon9');
      expect(point.throttle).toBe(0);
    });

    it('has zero dynamic pressure', () => {
      const point = generateTelemetryPoint(1000, 'falcon9');
      expect(point.dynamicPressure).toBe(0);
    });

    it('has fairingStatus as separated', () => {
      const point = generateTelemetryPoint(1000, 'falcon9');
      expect(point.fairingStatus).toBe('separated');
    });

    it('has no NaN values', () => {
      assertNoNaN(generateTelemetryPoint(1000, 'falcon9'));
    });
  });

  describe('vehicle type variants', () => {
    it('returns a valid telemetry point for falcon9', () => {
      const point = generateTelemetryPoint(100, 'falcon9');
      assertNoNaN(point);
      expect(point.missionTime).toBe(100);
    });

    it('returns a valid telemetry point for generic vehicle type', () => {
      const point = generateTelemetryPoint(100, 'generic');
      assertNoNaN(point);
      expect(point.missionTime).toBe(100);
    });

    it('defaults to falcon9 when no vehicle type is provided', () => {
      const point = generateTelemetryPoint(100);
      assertNoNaN(point);
      expect(point.missionTime).toBe(100);
    });
  });

  describe('value clamping', () => {
    it('never returns negative altitude', () => {
      for (let t = -200; t <= 1000; t += 50) {
        const point = generateTelemetryPoint(t);
        expect(point.altitude).toBeGreaterThanOrEqual(0);
      }
    });

    it('never returns negative velocity', () => {
      for (let t = -200; t <= 1000; t += 50) {
        const point = generateTelemetryPoint(t);
        expect(point.velocity).toBeGreaterThanOrEqual(0);
      }
    });

    it('keeps throttle in 0-100 range', () => {
      for (let t = -200; t <= 1000; t += 50) {
        const point = generateTelemetryPoint(t);
        expect(point.throttle).toBeGreaterThanOrEqual(0);
        expect(point.throttle).toBeLessThanOrEqual(100);
      }
    });

    it('keeps fuelRemaining in 0-100 range', () => {
      for (let t = -200; t <= 1000; t += 50) {
        const point = generateTelemetryPoint(t);
        expect(point.fuelRemaining).toBeGreaterThanOrEqual(0);
        expect(point.fuelRemaining).toBeLessThanOrEqual(100);
      }
    });

    it('never returns negative dynamicPressure', () => {
      for (let t = -200; t <= 1000; t += 50) {
        const point = generateTelemetryPoint(t);
        expect(point.dynamicPressure).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('return value structure', () => {
    it('includes all expected TelemetryPoint fields', () => {
      const point = generateTelemetryPoint(100);
      expect(point).toHaveProperty('missionTime');
      expect(point).toHaveProperty('altitude');
      expect(point).toHaveProperty('velocity');
      expect(point).toHaveProperty('downrange');
      expect(point).toHaveProperty('acceleration');
      expect(point).toHaveProperty('throttle');
      expect(point).toHaveProperty('latitude');
      expect(point).toHaveProperty('longitude');
      expect(point).toHaveProperty('phase');
      expect(point).toHaveProperty('dynamicPressure');
      expect(point).toHaveProperty('fuelRemaining');
      expect(point).toHaveProperty('stageStatus');
      expect(point).toHaveProperty('fairingStatus');
      expect(point).toHaveProperty('isMaxQ');
    });

    it('sets missionTime to the input value', () => {
      expect(generateTelemetryPoint(42).missionTime).toBe(42);
      expect(generateTelemetryPoint(-300).missionTime).toBe(-300);
      expect(generateTelemetryPoint(0).missionTime).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// getTypicalProfile
// ---------------------------------------------------------------------------
describe('getTypicalProfile', () => {
  it('returns zero values for pre-launch', () => {
    const profile = getTypicalProfile(-100);
    expect(profile.altitude).toBe(0);
    expect(profile.velocity).toBe(0);
    expect(profile.downrange).toBe(0);
    expect(profile.acceleration).toBe(0);
    expect(profile.dynamicPressure).toBe(0);
  });

  it('returns all required fields', () => {
    const profile = getTypicalProfile(100);
    expect(profile).toHaveProperty('altitude');
    expect(profile).toHaveProperty('velocity');
    expect(profile).toHaveProperty('downrange');
    expect(profile).toHaveProperty('acceleration');
    expect(profile).toHaveProperty('dynamicPressure');
  });

  it('returns numeric values at every flight phase', () => {
    const times = [-100, 0, 72, 162, 164, 300, 510, 1000];
    for (const t of times) {
      const profile = getTypicalProfile(t);
      expect(Number.isNaN(profile.altitude)).toBe(false);
      expect(Number.isNaN(profile.velocity)).toBe(false);
      expect(Number.isNaN(profile.downrange)).toBe(false);
      expect(Number.isNaN(profile.acceleration)).toBe(false);
      expect(Number.isNaN(profile.dynamicPressure)).toBe(false);
    }
  });

  it('returns deterministic values (no noise)', () => {
    const a = getTypicalProfile(100);
    const b = getTypicalProfile(100);
    expect(a.altitude).toBe(b.altitude);
    expect(a.velocity).toBe(b.velocity);
    expect(a.downrange).toBe(b.downrange);
    expect(a.acceleration).toBe(b.acceleration);
    expect(a.dynamicPressure).toBe(b.dynamicPressure);
  });

  describe('first stage burn (T+0 to T+162)', () => {
    it('starts with zero altitude and velocity at T+0', () => {
      const profile = getTypicalProfile(0);
      expect(profile.altitude).toBe(0);
      expect(profile.velocity).toBe(0);
      expect(profile.downrange).toBe(0);
    });

    it('reaches ~80 km altitude by T+162', () => {
      const profile = getTypicalProfile(162);
      expect(profile.altitude).toBeCloseTo(80, 0);
    });

    it('reaches ~2.3 km/s velocity by T+162', () => {
      const profile = getTypicalProfile(162);
      expect(profile.velocity).toBeCloseTo(2.3, 1);
    });

    it('has peak dynamic pressure near T+72 (~35 kPa)', () => {
      const profile = getTypicalProfile(72);
      expect(profile.dynamicPressure).toBeCloseTo(35, 0);
    });

    it('has acceleration ramping from ~1.3g to ~3.5g', () => {
      const start = getTypicalProfile(0);
      const end = getTypicalProfile(162);
      expect(start.acceleration).toBeCloseTo(1.3, 1);
      expect(end.acceleration).toBeCloseTo(3.5, 1);
    });
  });

  describe('stage separation coast (T+162 to T+165)', () => {
    it('has approximately 80 km altitude', () => {
      const profile = getTypicalProfile(163);
      expect(profile.altitude).toBeGreaterThan(79);
      expect(profile.altitude).toBeLessThan(82);
    });

    it('has velocity at 2.3 km/s', () => {
      const profile = getTypicalProfile(163);
      expect(profile.velocity).toBe(2.3);
    });

    it('has zero acceleration', () => {
      const profile = getTypicalProfile(163);
      expect(profile.acceleration).toBe(0);
    });
  });

  describe('second stage burn (T+165 to T+510)', () => {
    it('reaches ~250 km altitude by T+510', () => {
      const profile = getTypicalProfile(510);
      expect(profile.altitude).toBeCloseTo(250, 0);
    });

    it('reaches ~7.8 km/s velocity by T+510', () => {
      const profile = getTypicalProfile(510);
      expect(profile.velocity).toBeCloseTo(7.8, 1);
    });

    it('reaches ~2000 km downrange by T+510', () => {
      const profile = getTypicalProfile(510);
      expect(profile.downrange).toBeCloseTo(2000, -1);
    });
  });

  describe('orbital coast (T+510+)', () => {
    it('maintains ~250 km altitude', () => {
      const profile = getTypicalProfile(600);
      expect(profile.altitude).toBe(250);
    });

    it('maintains ~7.8 km/s velocity', () => {
      const profile = getTypicalProfile(600);
      expect(profile.velocity).toBe(7.8);
    });

    it('has zero acceleration', () => {
      const profile = getTypicalProfile(600);
      expect(profile.acceleration).toBe(0);
    });

    it('has zero dynamic pressure', () => {
      const profile = getTypicalProfile(600);
      expect(profile.dynamicPressure).toBe(0);
    });

    it('continues accumulating downrange distance', () => {
      const p600 = getTypicalProfile(600);
      const p1000 = getTypicalProfile(1000);
      expect(p1000.downrange).toBeGreaterThan(p600.downrange);
    });
  });
});

// ---------------------------------------------------------------------------
// generateTelemetryBatch
// ---------------------------------------------------------------------------
describe('generateTelemetryBatch', () => {
  it('generates the expected number of points', () => {
    const batch = generateTelemetryBatch(0, 10, 1);
    // 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 = 11 points
    expect(batch).toHaveLength(11);
  });

  it('respects the interval parameter', () => {
    const batch = generateTelemetryBatch(0, 10, 5);
    // 0, 5, 10 = 3 points
    expect(batch).toHaveLength(3);
    expect(batch[0].missionTime).toBe(0);
    expect(batch[1].missionTime).toBe(5);
    expect(batch[2].missionTime).toBe(10);
  });

  it('returns an array of valid TelemetryPoints', () => {
    const batch = generateTelemetryBatch(-10, 10, 5);
    for (const point of batch) {
      assertNoNaN(point);
    }
  });
});
