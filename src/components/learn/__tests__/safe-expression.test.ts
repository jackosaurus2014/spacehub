/**
 * Safe expression evaluator for /learn calculators — replaces the
 * `new Function` evaluator (only thing that needed 'unsafe-eval' in the CSP).
 *
 * The seed formulas in scripts/seed-learning*.ts are the contract: every
 * calculator output must evaluate, with its own constants + field defaults,
 * to the same number the old Function-based evaluator produced.
 */

import fs from 'fs';
import path from 'path';
import { evaluateExpression, ExpressionError, SAFE_FUNCTIONS } from '../safe-expression';

const ROOT = path.resolve(__dirname, '../../../..');

// ── Reference: the OLD evaluator, kept here (test-only) to pin behaviour ──
function legacyEvaluate(expr: string, env: Record<string, number>): number {
  const expression = expr.replace(/\^/g, '**');
  const ctx: Record<string, number | ((...a: number[]) => number)> = {
    PI: Math.PI, E: Math.E, sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan,
    log: Math.log, log10: Math.log10, abs: Math.abs, pow: Math.pow, min: Math.min, max: Math.max,
    ...env,
  };
  // eslint-disable-next-line no-new-func
  const fn = new Function(...Object.keys(ctx), `return (${expression});`);
  return fn(...Object.values(ctx));
}

interface SeedCalculator {
  file: string;
  title: string;
  env: Record<string, number>;
  formulas: string[];
}

/** Pull every `kind: 'calculator'` block out of the seed scripts. */
function loadSeedCalculators(): SeedCalculator[] {
  const files = fs
    .readdirSync(path.join(ROOT, 'scripts'))
    .filter((f) => /^seed-learning.*\.ts$/.test(f))
    .map((f) => path.join(ROOT, 'scripts', f));
  const out: SeedCalculator[] = [];
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    const blocks = src.split(/kind:\s*'calculator'/).slice(1);
    for (const block of blocks) {
      const end = block.search(/\n\s*interactiveConfig:|kind:\s*'quiz'/);
      const body = end === -1 ? block : block.slice(0, end);
      const title = /title:\s*'([^']*)'/.exec(body)?.[1] ?? '(untitled)';
      const constantsSrc = /constants:\s*(\{[^}]*\})/.exec(body)?.[1] ?? '{}';
      // eslint-disable-next-line no-new-func
      const constants = new Function(`return (${constantsSrc});`)() as Record<string, number>;
      const env: Record<string, number> = { ...constants };
      for (const m of Array.from(body.matchAll(/\{\s*key:\s*'([A-Za-z_][A-Za-z0-9_]*)'[^}]*?default:\s*([-0-9.eE]+)/g))) {
        env[m[1]] = Number(m[2]);
      }
      const formulas = Array.from(body.matchAll(/formula:\s*\n?\s*'([^']+)'/g)).map((m) => m[1]);
      if (formulas.length) out.push({ file: path.basename(file), title, env, formulas });
    }
  }
  return out;
}

describe('evaluateExpression — arithmetic', () => {
  it('handles precedence, parentheses, unary minus and right-assoc power', () => {
    expect(evaluateExpression('1 + 2 * 3')).toBe(7);
    expect(evaluateExpression('(1 + 2) * 3')).toBe(9);
    expect(evaluateExpression('2 ^ 3 ^ 2')).toBe(512);
    expect(evaluateExpression('-2 ^ 2')).toBe(-4);
    expect(evaluateExpression('2 ^ -1')).toBe(0.5);
    expect(evaluateExpression('--3')).toBe(3);
    expect(evaluateExpression('10 / 4')).toBe(2.5);
    expect(evaluateExpression('1e3 + .5')).toBe(1000.5);
    expect(evaluateExpression('2 ** 10')).toBe(1024);
  });

  it('resolves variables, constants, and variadic functions', () => {
    expect(evaluateExpression('a * b', { a: 3, b: 4 })).toBe(12);
    expect(evaluateExpression('PI')).toBeCloseTo(Math.PI);
    expect(evaluateExpression('E')).toBeCloseTo(Math.E);
    expect(evaluateExpression('PI', { PI: 3 })).toBe(3); // env wins
    expect(evaluateExpression('max(1, 5, 3) + min(4, 2)')).toBe(7);
    expect(evaluateExpression('sqrt(16) + abs(-2) + pow(2, 5)')).toBe(38);
    expect(evaluateExpression('log(E) + log10(1000) + exp(0)')).toBeCloseTo(5);
    expect(evaluateExpression('sin(0) + cos(0) + tan(0)')).toBe(1);
    expect(Object.keys(SAFE_FUNCTIONS).sort()).toEqual(
      ['abs', 'cos', 'exp', 'log', 'log10', 'max', 'min', 'pow', 'sin', 'sqrt', 'tan'],
    );
  });

  it('accepts multi-line formulas', () => {
    expect(evaluateExpression('1 +\n  2 *\n  3')).toBe(7);
  });
});

describe('evaluateExpression — rejects anything that is not arithmetic', () => {
  const bad = [
    'constructor',
    'this',
    'window',
    'globalThis.process',
    'a.b',
    'a[0]',
    'a = 1',
    'a; b',
    '(1)()',
    'foo(1)',
    'sqrt',
    '1 +',
    '(1 + 2',
    '1 + 2)',
    '"str"',
    '`x`',
    '1 => 2',
    '__proto__',
    'Math.PI',
    'process',
    'require("fs")',
    'x!',
    '3 & 1',
    '1 ? 2 : 3',
    '',
  ];
  it.each(bad)('throws ExpressionError for %j', (expr) => {
    expect(() => evaluateExpression(expr, { a: 1, b: 2 })).toThrow(ExpressionError);
  });

  it('throws on unknown identifiers rather than reading globals', () => {
    (globalThis as Record<string, unknown>).__leak = 42;
    try {
      expect(() => evaluateExpression('__leak')).toThrow(/Unknown identifier/);
    } finally {
      delete (globalThis as Record<string, unknown>).__leak;
    }
  });

  it('throws on non-finite results and non-numeric env values', () => {
    expect(() => evaluateExpression('1 / 0')).toThrow(/not finite/);
    expect(() => evaluateExpression('sqrt(-1)')).toThrow(/not finite/);
    expect(() => evaluateExpression('a', { a: 'x' as unknown as number })).toThrow(/Non-numeric/);
    expect(() => evaluateExpression('a', { a: NaN })).toThrow(/not finite/);
  });

  it('caps expression length', () => {
    expect(() => evaluateExpression('1+'.repeat(1500) + '1')).toThrow(/too long/);
  });

  it('inherited Object.prototype names are not identifiers', () => {
    expect(() => evaluateExpression('toString', {})).toThrow(/Unknown identifier/);
    expect(() => evaluateExpression('hasOwnProperty(1)', {})).toThrow(/Unknown function/);
  });
});

describe('evaluateExpression — seed calculator formulas', () => {
  const calculators = loadSeedCalculators();

  it('found the calculators in scripts/seed-learning*.ts', () => {
    expect(calculators.length).toBeGreaterThanOrEqual(10);
    expect(calculators.reduce((n, c) => n + c.formulas.length, 0)).toBeGreaterThanOrEqual(40);
  });

  for (const calc of calculators) {
    describe(`${calc.file} — ${calc.title}`, () => {
      for (const formula of calc.formulas) {
        it(`evaluates ${formula}`, () => {
          const expected = legacyEvaluate(formula, calc.env);
          const actual = evaluateExpression(formula, calc.env);
          expect(Number.isFinite(actual)).toBe(true);
          expect(actual).toBeCloseTo(expected, 9);
        });
      }
    });
  }

  it('matches hand-computed orbital values', () => {
    const env = { MU: 398600.4418, RE: 6371, h: 550 };
    // 550 km LEO: ~95.5 minute period, ~7.59 km/s.
    expect(evaluateExpression('2*PI*sqrt((RE+h)^3/MU)/60', env)).toBeCloseTo(95.5, 1);
    expect(evaluateExpression('sqrt(MU/(RE+h))', env)).toBeCloseTo(7.59, 2);
  });
});
