import { describe, expect, it } from 'vitest';

import { parseTriggerPayload } from './payload';

describe('parseTriggerPayload', () => {
  it('accepts empty input and JSON objects', () => {
    expect(parseTriggerPayload('  ')).toEqual({ ok: true, value: {} });
    expect(parseTriggerPayload('{"score": 80}')).toEqual({ ok: true, value: { score: 80 } });
  });

  it.each(['null', '[]', '"text"', '3', 'true'])('rejects non-object JSON %s', (source) => {
    expect(parseTriggerPayload(source)).toEqual({ ok: false, error: 'The run payload must be a JSON object.' });
  });

  it('returns a useful parse error', () => {
    const result = parseTriggerPayload('{oops}');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Enter valid JSON');
  });
});
