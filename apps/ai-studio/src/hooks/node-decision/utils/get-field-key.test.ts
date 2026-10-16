import { describe, expect, it } from 'vitest';

import { getFieldKey } from './get-field-key';

describe('getFieldKey', () => {
  it('drops the brackets and turns the dots into slashes', () => {
    expect(getFieldKey('{{nodes.draft-1.output.refundAmount}}')).toBe('nodes/draft-1/output/refundAmount');
  });

  it('accepts a bare reference', () => {
    expect(getFieldKey('global.total')).toBe('global/total');
  });

  it.each([
    ['empty', ''],
    ['blank', '   '],
    ['two references', '{{a}} {{b}}'],
    ['a reference with text around it', '{{a}}x'],
    ['inner whitespace', '{{nodes.a .x}}'],
  ])('is undefined for %s', (_name, reference) => {
    expect(getFieldKey(reference)).toBeUndefined();
  });
});
