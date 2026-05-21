import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setCustomPaletteNodes } from '../../data/palette';
import { getNodeErrors } from './get-node-errors';
import { mockNodeDelay } from './get-node-errors.mock';
import { workflowBuilderValidator } from './workflow-builder-validator';

const delayDefinition = {
  type: 'delay',
  label: 'Delay',
  description: 'Pause the workflow',
  icon: 'Timer',
  defaultPropertiesData: mockNodeDelay.data.properties,
  schema: {
    type: 'object',
    properties: {
      label: { type: 'string' },
      description: { type: 'string' },
      status: { type: 'string' },
      duration: { type: 'object' },
      errors: { type: 'array' },
      type: { type: 'string' },
    },
    required: ['label', 'description'],
  },
  uischema: { type: 'VerticalLayout', elements: [] },
};

describe('getNodeErrors', () => {
  beforeAll(() => {
    setCustomPaletteNodes([delayDefinition as never]);
  });

  afterAll(() => {
    setCustomPaletteNodes(null);
  });

  it('should return an empty array for a valid node', () => {
    const errors = getNodeErrors(mockNodeDelay);

    expect(errors).toEqual([]);
  });

  it('should return an array with a title error for a node without a description', () => {
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
        message: 'Instance does not have required property "description".',
        schemaPath: '#/required',
      },
    ]);
  });
});

describe('workflowBuilderValidator', () => {
  /**
   * This test guards against @cfworker/json-schema changing its error message format.
   * The `params.missingProperty` field is extracted via regex from the error message
   * and is critical for jsonforms' `useHasChildError` hook to highlight form fields.
   * If this test fails after upgrading @cfworker/json-schema, update REQUIRED_PROPERTY_REGEX in workflow-builder-validator.ts.
   */
  it('should populate params.missingProperty for required errors', () => {
    const schema = { type: 'object', required: ['name'], properties: { name: { type: 'string' } } };
    const validate = workflowBuilderValidator.compile(schema);
    validate({});

    expect(validate.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: 'required',
          params: { missingProperty: 'name' },
        }),
      ]),
    );
  });

  it('should return false for undefined data without throwing', () => {
    const schema = { type: 'object' };
    // eslint-disable-next-line unicorn/no-useless-undefined
    const result = workflowBuilderValidator.validate(schema, undefined);

    expect(result).toBe(false);
  });
});
