import {
  MAJOR_ISSUES_PREFIX,
  isMisheld,
  resolveFactCheckGate,
  type FactCheckResult,
} from '../fact-check-gate';

const pass: FactCheckResult = {
  overallVerdict: 'pass',
  notes: "The article's core facts align with the cited sources and are internally consistent.",
  corrections: [],
};

const minor: FactCheckResult = {
  overallVerdict: 'minor_issues',
  notes: 'The article is internally consistent and well-sourced.',
  corrections: ['Clarify the underwriting-fee gap'],
};

const major: FactCheckResult = {
  overallVerdict: 'major_issues',
  notes: 'Could not parse fact-check response — requires manual review',
  corrections: [],
};

describe('resolveFactCheckGate', () => {
  it('auto-publishes a pass verdict with an unprefixed note', () => {
    const gate = resolveFactCheckGate(pass);
    expect(gate.status).toBe('published');
    expect(gate.note).toBe(pass.notes);
    expect(gate.note.startsWith(MAJOR_ISSUES_PREFIX)).toBe(false);
  });

  it('auto-publishes a minor_issues verdict (founder decision 2026-08-15)', () => {
    const gate = resolveFactCheckGate(minor);
    expect(gate.status).toBe('published');
    expect(gate.note).toContain('Minor notes:');
    expect(gate.note).toContain('Suggestions: Clarify the underwriting-fee gap');
  });

  it('holds ONLY a major_issues verdict, and marks the note', () => {
    const gate = resolveFactCheckGate(major);
    expect(gate.status).toBe('pending_review');
    expect(gate.note.startsWith(MAJOR_ISSUES_PREFIX)).toBe(true);
  });

  it('INVARIANT: pending_review <=> note starts with the MAJOR ISSUES prefix', () => {
    const verdicts: Array<Partial<FactCheckResult> | null | undefined> = [
      pass,
      minor,
      major,
      { overallVerdict: 'pass', notes: '', corrections: [] },
      { overallVerdict: 'minor_issues', notes: '', corrections: [] },
      { overallVerdict: 'major_issues', notes: '', corrections: ['Wrong company named'] },
      { overallVerdict: 'pass' } as Partial<FactCheckResult>,
      {} as Partial<FactCheckResult>,
      null,
      undefined,
    ];
    for (const verdict of verdicts) {
      const gate = resolveFactCheckGate(verdict);
      expect(gate.status === 'pending_review').toBe(gate.note.startsWith(MAJOR_ISSUES_PREFIX));
      expect(gate.note.length).toBeGreaterThan(0);
    }
  });

  it('survives a missing or malformed corrections field (used to throw and abort the run)', () => {
    // The old inline gate called factCheck.corrections.join('; ') unguarded.
    // An omitted `corrections` key threw a TypeError out of the per-insight
    // loop, aborting the whole day's generation.
    expect(() =>
      resolveFactCheckGate({ overallVerdict: 'major_issues', notes: 'Fabricated statistic' } as Partial<FactCheckResult>)
    ).not.toThrow();
    const gate = resolveFactCheckGate({
      overallVerdict: 'major_issues',
      notes: 'Fabricated statistic',
    } as Partial<FactCheckResult>);
    expect(gate.status).toBe('pending_review');

    const stringCorrections = resolveFactCheckGate({
      overallVerdict: 'minor_issues',
      notes: 'Small gap',
      corrections: 'Check the share count' as unknown as string[],
    });
    expect(stringCorrections.status).toBe('published');
    expect(stringCorrections.note).toContain('Check the share count');
  });

  it('reproduces the live pair failure: one major sibling must not hold the other', () => {
    // 2026-08-20 run: two insights, identical generatedAt. One fact-check
    // failed to parse (correctly held); the sibling passed and was ALSO held.
    const batch = [pass, major];
    const gates = batch.map(resolveFactCheckGate);
    expect(gates[0].status).toBe('published');
    expect(gates[1].status).toBe('pending_review');
    // The sibling's outcome is independent of the failed one.
    expect(gates.filter((g) => g.status === 'pending_review')).toHaveLength(1);
  });

  it('reproduces the 2026-08-19 pair: minor sibling publishes alongside a major sibling', () => {
    const gates = [minor, major].map(resolveFactCheckGate);
    expect(gates[0].status).toBe('published');
    expect(gates[1].status).toBe('pending_review');
  });
});

describe('isMisheld', () => {
  it('flags a pending_review row whose note shows it passed', () => {
    expect(isMisheld('pending_review', "The article's core facts align with the cited sources.")).toBe(true);
    expect(isMisheld('pending_review', 'Minor notes: internally consistent and well-sourced.')).toBe(true);
  });

  it('does not flag a correctly held row', () => {
    expect(isMisheld('pending_review', `${MAJOR_ISSUES_PREFIX} Could not parse fact-check response`)).toBe(false);
  });

  it('does not flag published or rejected rows', () => {
    expect(isMisheld('published', 'Minor notes: fine')).toBe(false);
    expect(isMisheld('rejected', 'Minor notes: fine')).toBe(false);
  });

  it('fails closed on a row with no fact-check note', () => {
    expect(isMisheld('pending_review', null)).toBe(false);
    expect(isMisheld('pending_review', '')).toBe(false);
    expect(isMisheld('pending_review', undefined)).toBe(false);
  });
});
