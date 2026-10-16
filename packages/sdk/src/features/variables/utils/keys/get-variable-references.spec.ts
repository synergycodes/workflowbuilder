import { describe, expect, it } from 'vitest';

import { getVariableReferences } from './get-variable-references';

const invalid = { reference: undefined, referenceWithoutBrackets: undefined };

describe('getVariableReferences', () => {
  it.each([
    ['{{global.total}}', 'global.total'],
    ['{{nodes.abc.output.nested}}', 'nodes.abc.output.nested'],
    ['{{a}}', 'a'],
  ])('splits a bracketed reference: %j', (value, withoutBrackets) => {
    expect(getVariableReferences(value)).toEqual({ reference: value, referenceWithoutBrackets: withoutBrackets });
  });

  it.each([
    ['global.total', '{{global.total}}'],
    ['nodes.abc.output.nested', '{{nodes.abc.output.nested}}'],
    ['a', '{{a}}'],
  ])('wraps a bare key in brackets: %j', (value, reference) => {
    expect(getVariableReferences(value)).toEqual({ reference, referenceWithoutBrackets: value });
  });

  it.each(['  {{global.total}}  ', '  global.total  '])('trims surrounding whitespace: %j', (value) => {
    expect(getVariableReferences(value)).toEqual({
      reference: '{{global.total}}',
      referenceWithoutBrackets: 'global.total',
    });
  });

  it.each([undefined, '', '   '])('returns undefined pair for an empty value: %j', (value) => {
    expect(getVariableReferences(value)).toEqual(invalid);
  });

  it.each([
    '{{a}} {{b}}',
    '{{a}}{{b}}',
    '{{a}} text',
    'text {{a}}',
    '{{a}}x',
    '{{a b}}',
    'a b',
    '{{ Label · output }}',
    '{{a',
    'a}}',
    '{',
  ])('returns undefined pair for a value that is not a single reference: %j', (value) => {
    expect(getVariableReferences(value)).toEqual(invalid);
  });
});
