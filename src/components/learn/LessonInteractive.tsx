'use client';

import { useState, useMemo } from 'react';

interface CalculatorField {
  key: string;
  label: string;
  unit?: string;
  default?: number;
  step?: number;
  min?: number;
  max?: number;
  help?: string;
}

interface CalculatorOutput {
  key: string;
  label: string;
  unit?: string;
  formula: string; // e.g. "2 * PI * sqrt(a^3 / MU)"
  precision?: number;
}

interface CalculatorConfig {
  kind: 'calculator';
  title?: string;
  description?: string;
  fields: CalculatorField[];
  outputs: CalculatorOutput[];
  constants?: Record<string, number>;
}

interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explain?: string;
}

interface QuizConfig {
  kind: 'quiz';
  title?: string;
  questions: QuizQuestion[];
}

export type InteractiveConfig = CalculatorConfig | QuizConfig | Record<string, unknown>;

interface Props {
  type: 'calculator' | 'simulator' | 'quiz' | 'none' | string;
  config: unknown;
}

/**
 * Evaluate a whitelisted arithmetic expression against a variable environment.
 * Supports +, -, *, /, parentheses, ^, sqrt(), sin(), cos(), tan(), log(), abs().
 * Not eval. Manual safe parse-ish via Function constructor restricted to math identifiers.
 */
function safeEvaluate(expr: string, env: Record<string, number>): number {
  // Replace ^ with ** for JS power operator
  const expression = expr.replace(/\^/g, '**');
  // Whitelist: variables, digits, operators, function names
  if (!/^[\sA-Za-z0-9_+\-*/().,]+$/.test(expression)) {
    throw new Error('Expression contains invalid characters');
  }
  // Wrap Math functions
  const ctx: Record<string, number | ((...a: number[]) => number)> = {
    PI: Math.PI,
    E: Math.E,
    sqrt: Math.sqrt,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    log: Math.log,
    log10: Math.log10,
    abs: Math.abs,
    pow: Math.pow,
    min: Math.min,
    max: Math.max,
    ...env,
  };
  const names = Object.keys(ctx);
  const values = Object.values(ctx);
  // Tokenize identifiers and reject anything not in whitelist
  const idRegex = /[A-Za-z_][A-Za-z0-9_]*/g;
  const identifiers = expression.match(idRegex) || [];
  for (const id of identifiers) {
    if (!names.includes(id)) {
      throw new Error(`Unknown identifier: ${id}`);
    }
  }
  // eslint-disable-next-line no-new-func
  const fn = new Function(...names, `return (${expression});`);
  const result = fn(...values);
  if (typeof result !== 'number' || !Number.isFinite(result)) {
    throw new Error('Result not finite');
  }
  return result;
}

function Calculator({ config }: { config: CalculatorConfig }) {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const f of config.fields) init[f.key] = f.default ?? 0;
    return init;
  });

  const outputs = useMemo(() => {
    const env: Record<string, number> = { ...(config.constants || {}), ...values };
    return config.outputs.map((o) => {
      try {
        const v = safeEvaluate(o.formula, env);
        const p = o.precision ?? 4;
        return { ...o, value: v, display: v.toPrecision(p) };
      } catch (err) {
        return {
          ...o,
          value: NaN,
          display: 'error',
          error: err instanceof Error ? err.message : 'Error',
        };
      }
    });
  }, [config.outputs, config.constants, values]);

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-block rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 uppercase tracking-wide">
          Calculator
        </span>
        {config.title && (
          <h3 className="text-lg font-semibold text-white">{config.title}</h3>
        )}
      </div>
      {config.description && (
        <p className="text-sm text-white/70 mb-4">{config.description}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {config.fields.map((f) => (
          <label key={f.key} className="block">
            <span className="block text-sm font-medium text-white mb-1">
              {f.label}
              {f.unit && <span className="text-white/50 ml-1">({f.unit})</span>}
            </span>
            <input
              type="number"
              value={Number.isFinite(values[f.key]) ? values[f.key] : ''}
              step={f.step ?? 'any'}
              min={f.min}
              max={f.max}
              onChange={(e) =>
                setValues((v) => ({ ...v, [f.key]: parseFloat(e.target.value) }))
              }
              className="w-full rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
            />
            {f.help && <span className="mt-1 block text-xs text-white/50">{f.help}</span>}
          </label>
        ))}
      </div>

      <div className="border-t border-emerald-500/20 pt-4 space-y-2">
        {outputs.map((o) => (
          <div
            key={o.key}
            className="flex items-baseline justify-between gap-3 rounded-lg bg-black/30 px-4 py-3"
          >
            <div>
              <div className="text-sm text-white/70">{o.label}</div>
              <div className="text-xs text-white/40 font-mono">{o.formula}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-emerald-300 font-mono">
                {o.display}
                {o.unit && <span className="ml-1 text-sm text-white/50">{o.unit}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Quiz({ config }: { config: QuizConfig }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);

  const score = checked
    ? config.questions.reduce(
        (s, q, i) => s + (answers[i] === q.answer ? 1 : 0),
        0,
      )
    : 0;

  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-block rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-300 uppercase tracking-wide">
          Quiz
        </span>
        {config.title && (
          <h3 className="text-lg font-semibold text-white">{config.title}</h3>
        )}
      </div>

      <ol className="space-y-6">
        {config.questions.map((q, qi) => {
          const picked = answers[qi];
          const correct = checked && picked === q.answer;
          const incorrect = checked && picked !== undefined && picked !== q.answer;
          return (
            <li key={qi}>
              <div className="mb-2 font-medium text-white">
                {qi + 1}. {q.q}
              </div>
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => {
                  const isPick = picked === oi;
                  const isRight = checked && oi === q.answer;
                  const cls = checked
                    ? isRight
                      ? 'border-emerald-400 bg-emerald-500/10'
                      : isPick
                        ? 'border-red-400 bg-red-500/10'
                        : 'border-white/10 bg-white/[0.03]'
                    : isPick
                      ? 'border-purple-400 bg-purple-500/10'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/25';
                  return (
                    <label
                      key={oi}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${cls}`}
                    >
                      <input
                        type="radio"
                        name={`q-${qi}`}
                        checked={isPick}
                        disabled={checked}
                        onChange={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                        className="accent-purple-400"
                      />
                      <span className="text-sm text-white">{opt}</span>
                    </label>
                  );
                })}
              </div>
              {checked && q.explain && (
                <div
                  className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
                    correct
                      ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200'
                      : incorrect
                        ? 'border-red-500/30 bg-red-500/5 text-red-200'
                        : 'border-white/10 bg-white/[0.03] text-white/70'
                  }`}
                >
                  {q.explain}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex items-center gap-3">
        {!checked ? (
          <button
            type="button"
            onClick={() => setChecked(true)}
            disabled={Object.keys(answers).length < config.questions.length}
            className="rounded-lg bg-purple-500 px-5 py-2 text-sm font-medium text-white hover:bg-purple-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Check answers
          </button>
        ) : (
          <>
            <div className="text-white font-semibold">
              Score: {score} / {config.questions.length}
            </div>
            <button
              type="button"
              onClick={() => {
                setAnswers({});
                setChecked(false);
              }}
              className="rounded-lg border border-white/20 bg-white/[0.05] px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Retry
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function LessonInteractive({ type, config }: Props) {
  if (!type || type === 'none') return null;
  if (!config || typeof config !== 'object') {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
        Interactive configuration missing.
      </div>
    );
  }

  if (type === 'calculator') {
    return <Calculator config={config as CalculatorConfig} />;
  }

  if (type === 'quiz') {
    return <Quiz config={config as QuizConfig} />;
  }

  if (type === 'simulator') {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-sm text-amber-200">
        Simulator embeds coming soon. Configuration:
        <pre className="mt-2 rounded bg-black/40 p-3 text-xs text-white/70 overflow-x-auto">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>
    );
  }

  return null;
}
