import { describe, expect, it } from 'vitest';

import { VARIABLE_BRACKETS_END, VARIABLE_BRACKETS_START } from '../../constants';
import { getIsStringVariableReference } from './get-is-string-variable-reference';
import { getVariableReferenceWithoutBracketsForGlobal } from './get-variable-reference-without-brackets-for-global';

describe('getVariableReferenceWithoutBracketsForGlobal', () => {
  it('prefixes the variable id with the global key', () => {
    expect(getVariableReferenceWithoutBracketsForGlobal('total')).toBe('global.total');
  });

  it('keeps a nested variable path as it is', () => {
    expect(getVariableReferenceWithoutBracketsForGlobal('user.name')).toBe('global.user.name');
  });

  it('becomes a single variable reference once wrapped in brackets', () => {
    const reference = getVariableReferenceWithoutBracketsForGlobal('total');

    expect(getIsStringVariableReference(`${VARIABLE_BRACKETS_START}${reference}${VARIABLE_BRACKETS_END}`)).toBe(true);
  });
});
