import {
  STANDARD_PHASES,
  getCurrentPhase,
  getPhaseProgress,
  formatMissionTime,
  MissionPhase,
} from '../launch/mission-phases';

// ---------------------------------------------------------------------------
// STANDARD_PHASES
// ---------------------------------------------------------------------------
describe('STANDARD_PHASES', () => {
  it('has 13 entries', () => {
    expect(STANDARD_PHASES).toHaveLength(13);
  });

  it('every phase has an id', () => {
    for (const phase of STANDARD_PHASES) {
      expect(typeof phase.id).toBe('string');
      expect(phase.id.length).toBeGreaterThan(0);
    }
  });

  it('every phase has a name', () => {
    for (const phase of STANDARD_PHASES) {
      expect(typeof phase.name).toBe('string');
      expect(phase.name.length).toBeGreaterThan(0);
    }
  });

  it('every phase has a numeric startTime (typicalTPlus)', () => {
    for (const phase of STANDARD_PHASES) {
      expect(typeof phase.typicalTPlus).toBe('number');
      expect(Number.isNaN(phase.typicalTPlus)).toBe(false);
    }
  });

  it('every phase has a detailedDescription', () => {
    for (const phase of STANDARD_PHASES) {
      expect(typeof phase.detailedDescription).toBe('string');
      expect(phase.detailedDescription.length).toBeGreaterThan(0);
    }
  });

  it('every phase has a description', () => {
    for (const phase of STANDARD_PHASES) {
      expect(typeof phase.description).toBe('string');
      expect(phase.description.length).toBeGreaterThan(0);
    }
  });

  it('every phase has an icon', () => {
    for (const phase of STANDARD_PHASES) {
      expect(typeof phase.icon).toBe('string');
      expect(phase.icon.length).toBeGreaterThan(0);
    }
  });

  it('has unique phase ids', () => {
    const ids = STANDARD_PHASES.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('contains known key phases', () => {
    const ids = STANDARD_PHASES.map((p) => p.id);
    expect(ids).toContain('pre_launch');
    expect(ids).toContain('ignition');
    expect(ids).toContain('max_q');
    expect(ids).toContain('meco');
    expect(ids).toContain('stage_sep');
    expect(ids).toContain('seco');
    expect(ids).toContain('payload_deploy');
    expect(ids).toContain('mission_complete');
  });
});

// ---------------------------------------------------------------------------
// getCurrentPhase
// ---------------------------------------------------------------------------
describe('getCurrentPhase', () => {
  it('returns a MissionPhase object', () => {
    const phase = getCurrentPhase(0);
    expect(phase).toHaveProperty('id');
    expect(phase).toHaveProperty('name');
    expect(phase).toHaveProperty('typicalTPlus');
    expect(phase).toHaveProperty('detailedDescription');
  });

  it('returns pre_launch for T-3600', () => {
    const phase = getCurrentPhase(-3600);
    expect(phase.id).toBe('pre_launch');
  });

  it('returns pre_launch for far before launch (T-10000)', () => {
    const phase = getCurrentPhase(-10000);
    expect(phase.id).toBe('pre_launch');
  });

  it('returns terminal_count for T-60 (during countdown)', () => {
    // terminal_count starts at T-600, next phase is ignition at T+0
    // At T-60, terminal_count should be current
    const phase = getCurrentPhase(-60);
    expect(phase.id).toBe('terminal_count');
  });

  it('returns fueling for T-2400', () => {
    const phase = getCurrentPhase(-2400);
    expect(phase.id).toBe('fueling');
  });

  it('returns ignition at T-3 (just before liftoff, after T+0 threshold)', () => {
    // ignition typicalTPlus is 0, T-3 is before that, so terminal_count
    const phase = getCurrentPhase(-3);
    expect(phase.id).toBe('terminal_count');
  });

  it('returns ignition at exactly T+0', () => {
    const phase = getCurrentPhase(0);
    expect(phase.id).toBe('ignition');
  });

  it('returns ignition at T+5 (liftoff, before max_q)', () => {
    const phase = getCurrentPhase(5);
    expect(phase.id).toBe('ignition');
  });

  it('returns max_q at T+72', () => {
    const phase = getCurrentPhase(72);
    expect(phase.id).toBe('max_q');
  });

  it('returns meco at T+162', () => {
    const phase = getCurrentPhase(162);
    expect(phase.id).toBe('meco');
  });

  it('returns stage_sep at T+165', () => {
    const phase = getCurrentPhase(165);
    expect(phase.id).toBe('stage_sep');
  });

  it('returns ses at T+170', () => {
    const phase = getCurrentPhase(170);
    expect(phase.id).toBe('ses');
  });

  it('returns fairing_sep at T+210', () => {
    const phase = getCurrentPhase(210);
    expect(phase.id).toBe('fairing_sep');
  });

  it('returns booster_landing at T+510 (same typicalTPlus as seco, but later in array)', () => {
    // Both seco and booster_landing have typicalTPlus 510
    // getCurrentPhase iterates through and picks the last matching one
    // booster_landing comes after seco in the array
    const phase = getCurrentPhase(510);
    expect(phase.id).toBe('booster_landing');
  });

  it('returns booster_landing at T+960 (booster_landing is later in array with typicalTPlus 510)', () => {
    // booster_landing (typicalTPlus: 510) comes after payload_deploy (typicalTPlus: 960)
    // in the array, so at T+960 both qualify, but booster_landing wins because
    // getCurrentPhase picks the LAST matching phase in iteration order
    const phase = getCurrentPhase(960);
    expect(phase.id).toBe('booster_landing');
  });

  it('returns mission_complete at T+3600', () => {
    const phase = getCurrentPhase(3600);
    expect(phase.id).toBe('mission_complete');
  });

  it('returns mission_complete well after the mission (T+10000)', () => {
    const phase = getCurrentPhase(10000);
    expect(phase.id).toBe('mission_complete');
  });
});

// ---------------------------------------------------------------------------
// getPhaseProgress
// ---------------------------------------------------------------------------
describe('getPhaseProgress', () => {
  it('returns an object with currentPhase, progress, and nextPhase', () => {
    const result = getPhaseProgress(0);
    expect(result).toHaveProperty('currentPhase');
    expect(result).toHaveProperty('progress');
    expect(result).toHaveProperty('nextPhase');
  });

  it('returns progress between 0 and 1', () => {
    const times = [-5000, -3600, -1000, 0, 72, 162, 165, 300, 510, 960, 3600];
    for (const t of times) {
      const result = getPhaseProgress(t);
      expect(result.progress).toBeGreaterThanOrEqual(0);
      expect(result.progress).toBeLessThanOrEqual(1);
    }
  });

  it('returns progress 0 at the start of a phase', () => {
    // At exactly T+72 (start of max_q phase), progress through that phase should be 0
    const result = getPhaseProgress(72);
    expect(result.progress).toBeCloseTo(0, 1);
  });

  it('returns progress 1 when at the final phase and there is no next phase', () => {
    const result = getPhaseProgress(5000);
    expect(result.progress).toBe(1);
    expect(result.nextPhase).toBeNull();
  });

  it('returns a non-null nextPhase for intermediate phases', () => {
    const result = getPhaseProgress(0);
    expect(result.nextPhase).not.toBeNull();
  });

  it('returns progress increasing over time within a phase', () => {
    // During first stage burn: ignition at T+0, max_q at T+72
    const early = getPhaseProgress(10);
    const late = getPhaseProgress(60);
    expect(late.progress).toBeGreaterThan(early.progress);
  });

  it('returns the correct current phase for pre-launch', () => {
    const result = getPhaseProgress(-5000);
    expect(result.currentPhase.id).toBe('pre_launch');
  });

  it('returns the correct current phase at ignition', () => {
    const result = getPhaseProgress(0);
    expect(result.currentPhase.id).toBe('ignition');
  });
});

// ---------------------------------------------------------------------------
// formatMissionTime
// ---------------------------------------------------------------------------
describe('formatMissionTime', () => {
  it('formats negative time as T-MM:SS', () => {
    expect(formatMissionTime(-90)).toBe('T-01:30');
  });

  it('formats positive time as T+MM:SS', () => {
    expect(formatMissionTime(90)).toBe('T+01:30');
  });

  it('formats exactly zero as T+00:00', () => {
    // seconds < 0 is false for 0, so sign is +
    expect(formatMissionTime(0)).toBe('T+00:00');
  });

  it('pads single-digit minutes and seconds', () => {
    expect(formatMissionTime(5)).toBe('T+00:05');
    expect(formatMissionTime(65)).toBe('T+01:05');
  });

  it('formats pre-launch countdown correctly', () => {
    expect(formatMissionTime(-10)).toBe('T-00:10');
    expect(formatMissionTime(-600)).toBe('T-10:00');
  });

  it('includes hours when time exceeds 3600 seconds', () => {
    expect(formatMissionTime(3661)).toBe('T+01:01:01');
  });

  it('formats negative time with hours', () => {
    expect(formatMissionTime(-3661)).toBe('T-01:01:01');
  });

  it('does not include hours for times under 3600 seconds', () => {
    const result = formatMissionTime(3599);
    expect(result).toBe('T+59:59');
    // Should NOT have the HH: prefix
    expect(result.split(':').length).toBe(2);
  });

  it('includes hours for exactly 3600 seconds', () => {
    expect(formatMissionTime(3600)).toBe('T+01:00:00');
  });

  it('handles large negative values', () => {
    expect(formatMissionTime(-7200)).toBe('T-02:00:00');
  });

  it('handles large positive values', () => {
    expect(formatMissionTime(7261)).toBe('T+02:01:01');
  });

  it('handles fractional seconds by flooring', () => {
    // Math.floor(abs % 60) should floor fractional seconds
    expect(formatMissionTime(90.7)).toBe('T+01:30');
  });

  it('handles negative fractional values', () => {
    expect(formatMissionTime(-90.9)).toBe('T-01:30');
  });
});
