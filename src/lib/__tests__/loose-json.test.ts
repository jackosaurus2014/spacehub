import { parseLooseJson, escapeControlCharsInStrings, extractJsonObject } from '../loose-json';

describe('parseLooseJson', () => {
  it('parses strict JSON unchanged', () => {
    expect(parseLooseJson('{"a":1,"b":"x\\ny"}')).toEqual({ a: 1, b: 'x\ny' });
  });
  it('repairs raw newlines and tabs inside string literals', () => {
    const raw = '{"insights":[{"title":"A","content":"line one\nline two\t(tab)"}]}';
    expect(() => JSON.parse(raw)).toThrow();
    expect(parseLooseJson<{ insights: { content: string }[] }>(raw).insights[0].content).toBe('line one\nline two\t(tab)');
  });
  it('leaves structural whitespace and escaped quotes alone', () => {
    const raw = '{\n  "t": "He said \\"hi\\"",\n  "n": [1,\n 2]\n}';
    expect(escapeControlCharsInStrings(raw)).toBe(raw);
    expect(parseLooseJson(raw)).toEqual({ t: 'He said "hi"', n: [1, 2] });
  });
  it('still throws on text that is not JSON', () => {
    expect(() => parseLooseJson('not json')).toThrow();
  });
  it('extracts the first object from prose around it', () => {
    expect(extractJsonObject('Sure! {"ok":true,"why":"multi\nline"} done')).toEqual({ ok: true, why: 'multi\nline' });
    expect(extractJsonObject('no braces here')).toBeNull();
  });
});
