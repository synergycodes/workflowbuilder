import { describe, expect, it } from 'vitest';

import { getVariableReferenceIfPossible } from './get-variable-reference-if-possible';

describe('getVariableReferenceIfPossible', () => {
  it('returns a single reference unchanged', () => {
    expect(getVariableReferenceIfPossible('{{nodes.abc.output}}')).toBe('{{nodes.abc.output}}');
  });

  it('trims the whitespace around a reference', () => {
    expect(getVariableReferenceIfPossible('  {{global.total}}  ')).toBe('{{global.total}}');
  });

  it.each([undefined, '', '   ', 'plain text', 'text {{a}}', '{{a}} {{b}}', '{{a'])(
    'returns undefined for a non-reference: %j',
    (value) => {
      expect(getVariableReferenceIfPossible(value)).toBeUndefined();
    },
  );
});
