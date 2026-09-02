/**
 * Safe arithmetic-expression evaluator for the /learn lesson calculators.
 *
 * Replaces the `new Function(...)` evaluator (2026-09 security audit): this
 * is a hand-written tokenizer + recursive-descent parser that only ever
 * performs arithmetic, so it needs no 'unsafe-eval' in the CSP and cannot
 * reach globals, prototypes or property access no matter what the formula
 * string contains.
 *
 * Grammar (highest precedence last):
 *   expr   := term   (('+' | '-') term)*
 *   term   := unary  (('*' | '/') unary)*
 *   unary  := ('-' | '+') unary | power
 *   power  := atom   ('^' unary)?          — right-associative, binds tighter
 *                                            than unary minus on its LEFT:
 *                                            -2^2 = -4, 2^-1 = 0.5
 *   atom   := number | ident | ident '(' expr (',' expr)* ')' | '(' expr ')'
 *
 * `**` is accepted as a synonym for `^`. Identifiers resolve to the caller's
 * env first, then the built-in constants; unknown identifiers throw.
 */

export const SAFE_FUNCTIONS: Readonly<Record<string, (...args: number[]) => number>> = Object.freeze({
  sqrt: Math.sqrt,
  abs: Math.abs,
  pow: Math.pow,
  log: Math.log,
  log10: Math.log10,
  exp: Math.exp,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  min: Math.min,
  max: Math.max,
});

export const SAFE_CONSTANTS: Readonly<Record<string, number>> = Object.freeze({
  PI: Math.PI,
  E: Math.E,
});

export const MAX_EXPRESSION_LENGTH = 2000;

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'id'; value: string }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' | '^' }
  | { kind: 'lparen' }
  | { kind: 'rparen' }
  | { kind: 'comma' }
  | { kind: 'end' };

export class ExpressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExpressionError';
  }
}

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }
    if ((ch >= '0' && ch <= '9') || (ch === '.' && src[i + 1] >= '0' && src[i + 1] <= '9')) {
      const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i));
      if (!m) throw new ExpressionError(`Bad number at ${i}`);
      tokens.push({ kind: 'num', value: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
      if (!m) throw new ExpressionError(`Bad identifier at ${i}`);
      tokens.push({ kind: 'id', value: m[0] });
      i += m[0].length;
      continue;
    }
    if (ch === '*' && src[i + 1] === '*') {
      tokens.push({ kind: 'op', value: '^' });
      i += 2;
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
      tokens.push({ kind: 'op', value: ch });
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ kind: 'lparen' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ kind: 'rparen' });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ kind: 'comma' });
      i++;
      continue;
    }
    throw new ExpressionError(`Unexpected character '${ch}' at ${i}`);
  }
  tokens.push({ kind: 'end' });
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(
    private readonly tokens: Token[],
    private readonly env: Record<string, number>,
  ) {}

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private next(): Token {
    return this.tokens[this.pos++];
  }

  private isOp(t: Token, ...ops: string[]): t is Extract<Token, { kind: 'op' }> {
    return t.kind === 'op' && ops.includes(t.value);
  }

  parse(): number {
    const v = this.expr();
    if (this.peek().kind !== 'end') throw new ExpressionError('Unexpected trailing input');
    return v;
  }

  private expr(): number {
    let left = this.term();
    while (this.isOp(this.peek(), '+', '-')) {
      const op = (this.next() as Extract<Token, { kind: 'op' }>).value;
      const right = this.term();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  private term(): number {
    let left = this.unary();
    while (this.isOp(this.peek(), '*', '/')) {
      const op = (this.next() as Extract<Token, { kind: 'op' }>).value;
      const right = this.unary();
      left = op === '*' ? left * right : left / right;
    }
    return left;
  }

  private unary(): number {
    const t = this.peek();
    if (this.isOp(t, '-')) {
      this.next();
      return -this.unary();
    }
    if (this.isOp(t, '+')) {
      this.next();
      return this.unary();
    }
    return this.power();
  }

  private power(): number {
    const base = this.atom();
    if (this.isOp(this.peek(), '^')) {
      this.next();
      const exponent = this.unary(); // right-assoc; allows 2^-1
      return Math.pow(base, exponent);
    }
    return base;
  }

  private atom(): number {
    const t = this.next();
    if (t.kind === 'num') return t.value;
    if (t.kind === 'lparen') {
      const v = this.expr();
      if (this.next().kind !== 'rparen') throw new ExpressionError('Expected )');
      return v;
    }
    if (t.kind === 'id') {
      if (this.peek().kind === 'lparen') {
        const fn = Object.prototype.hasOwnProperty.call(SAFE_FUNCTIONS, t.value)
          ? SAFE_FUNCTIONS[t.value]
          : undefined;
        if (!fn) throw new ExpressionError(`Unknown function: ${t.value}`);
        this.next();
        const args: number[] = [];
        if (this.peek().kind !== 'rparen') {
          args.push(this.expr());
          while (this.peek().kind === 'comma') {
            this.next();
            args.push(this.expr());
          }
        }
        if (this.next().kind !== 'rparen') throw new ExpressionError('Expected )');
        return fn(...args);
      }
      if (Object.prototype.hasOwnProperty.call(this.env, t.value)) {
        const v = this.env[t.value];
        if (typeof v !== 'number') throw new ExpressionError(`Non-numeric variable: ${t.value}`);
        return v;
      }
      if (Object.prototype.hasOwnProperty.call(SAFE_CONSTANTS, t.value)) return SAFE_CONSTANTS[t.value];
      throw new ExpressionError(`Unknown identifier: ${t.value}`);
    }
    if (t.kind === 'end') throw new ExpressionError('Unexpected end of expression');
    throw new ExpressionError('Unexpected token');
  }
}

/**
 * Evaluate `expr` with the given variable environment. Throws
 * ExpressionError on any syntax problem, unknown identifier, or non-finite
 * result. Never executes anything but arithmetic.
 */
export function evaluateExpression(expr: string, env: Record<string, number> = {}): number {
  if (typeof expr !== 'string') throw new ExpressionError('Expression must be a string');
  if (expr.length > MAX_EXPRESSION_LENGTH) throw new ExpressionError('Expression too long');
  const result = new Parser(tokenize(expr), env).parse();
  if (typeof result !== 'number' || !Number.isFinite(result)) {
    throw new ExpressionError('Result not finite');
  }
  return result;
}
