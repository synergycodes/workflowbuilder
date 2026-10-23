import { describe, expect, it } from 'vitest';

import { getIsStringVariableReference } from './get-is-string-variable-reference';

describe('getIsStringVariableReference', () => {
  it.each([
    '{{nodes.abc.output}}',
    '{{global.total}}',
    '{{trigger.payload.id}}',
    '{{variables.count}}',
    '  {{nodes.abc.output}}  ',
  ])('accepts a single reference: %j', (value) => {
    expect(getIsStringVariableReference(value)).toBe(true);
  });

  it.each([
    undefined,
    '',
    '   ',
    'plain text',
    '{{a}}',
    '{{global}}',
    '{{globals.total}}',
    '{{unknown.a}}',
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
