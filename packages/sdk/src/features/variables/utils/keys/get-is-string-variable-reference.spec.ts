import { describe, expect, it } from 'vitest';

import { getIsStringVariableReference } from './get-is-string-variable-reference';

describe('getIsStringVariableReference', () => {
  it.each(['{{nodes.abc.output}}', '{{global.total}}', '  {{nodes.abc.output}}  ', '{{a}}'])(
    'accepts a single reference: %j',
    (value) => {
      expect(getIsStringVariableReference(value)).toBe(true);
    },
  );

  it.each([
    undefined,
    '',
    '   ',
    'plain text',
    '{{a}} {{b}}',
    '{{a}}{{b}}',
    '{{a}} text',
    'text {{a}}',
    '{{a}}x',
    '{{a b}}',
    '{{ Missing node (abcd...) · output }}',
    '{{ Label · output }}',
    '{{a',
    'a}}',
    '{a}',
  ])('rejects non-single references: %j', (value) => {
    expect(getIsStringVariableReference(value)).toBe(false);
  });
});
