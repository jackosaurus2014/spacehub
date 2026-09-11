/**
 * Tolerant JSON parse for model output (2026-09-10). Long-form generations
 * sometimes carry a raw newline or tab inside a string literal ("Bad control
 * character in string literal in JSON at position 7771" killed the daily
 * insights run the first night the streaming fix was live). Strict JSON
 * forbids those; this escapes control characters that occur *inside* string
 * literals and leaves everything else untouched, then parses. Throws the
 * original SyntaxError if the text still is not JSON.
 */
export function escapeControlCharsInStrings(text: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) { out += ch; escaped = false; continue; }
      if (ch === '\\') { out += ch; escaped = true; continue; }
      if (ch === '"') { out += ch; inString = false; continue; }
      const code = ch.charCodeAt(0);
      if (code < 0x20) {
        if (ch === '\n') out += '\\n';
        else if (ch === '\t') out += '\\t';
        else if (ch === '\r') out += '';
        else out += `\\u${code.toString(16).padStart(4, '0')}`;
        continue;
      }
      out += ch;
    } else {
      if (ch === '"') inString = true;
      out += ch;
    }
  }
  return out;
}

// Drop-in for JSON.parse, which returns `any`; typed call sites pass T.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseLooseJson<T = any>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch (firstError) {
    try {
      return JSON.parse(escapeControlCharsInStrings(text)) as T;
    } catch {
      throw firstError;
    }
  }
}

/** First {...} block in a model reply, parsed leniently; null when there is none. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractJsonObject<T = any>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  return parseLooseJson<T>(match[0]);
}
