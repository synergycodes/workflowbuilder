import { describe, expect, it } from 'vitest';

import { VARIABLE_BRACKETS_END, VARIABLE_BRACKETS_START } from '../../constants';
import { getIsStringVariableReference } from './get-is-string-variable-reference';
import { getVariableReferenceWithoutBracketsForNode } from './get-variable-reference-without-brackets-for-node';

describe('getVariableReferenceWithoutBracketsForNode', () => {
  it('joins the nodes key, node id and property name with dots', () => {
    expect(getVariableReferenceWithoutBracketsForNode({ nodeId: 'n1', propertyName: 'result' })).toBe(
      'nodes.n1.result',
    );
  });

  it('keeps a nested property path as it is', () => {
    expect(getVariableReferenceWithoutBracketsForNode({ nodeId: 'n1', propertyName: 'result.items' })).toBe(
      'nodes.n1.result.items',
    );
  });

  it('becomes a single variable reference once wrapped in brackets', () => {
    const reference = getVariableReferenceWithoutBracketsForNode({ nodeId: 'n1', propertyName: 'result' });

    expect(getIsStringVariableReference(`${VARIABLE_BRACKETS_START}${reference}${VARIABLE_BRACKETS_END}`)).toBe(true);
  });
});
