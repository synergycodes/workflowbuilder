import { describe, expect, it } from 'vitest';
import { getNodeErrors } from './get-node-errors';
import { mockNodeDelay } from './get-node-errors.mock';

describe('getNodeErrors', () => {
  it('should return an empty array for a valid node', () => {
    const errors = getNodeErrors(mockNodeDelay);

    expect(errors).toEqual([]);
  });

  it('should return an array with a title error for a node without a title', () => {
    const { description: _, ...properties } = mockNodeDelay.data.properties;
    const errors = getNodeErrors({
      ...mockNodeDelay,
      data: {
        ...mockNodeDelay.data,
        properties,
      },
    });

    expect(errors).toEqual([
      {
        instancePath: '',
        keyword: 'required',
        message: "must have required property 'description'",
        schemaPath: '#/required',
      },
    ]);
  });
});
