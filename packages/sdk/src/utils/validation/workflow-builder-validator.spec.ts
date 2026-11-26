import { describe, expect, it } from 'vitest';

import { workflowBuilderValidator } from './workflow-builder-validator';

function instancePathsFor(keys: string[]) {
  const validate = workflowBuilderValidator.compile({
    type: 'object',
    properties: Object.fromEntries(keys.map((key) => [key, { type: 'number' }])),
  });
  validate(Object.fromEntries(keys.map((key) => [key, 'not a number'])));

  return (validate.errors ?? []).filter((error) => error.keyword === 'type').map((error) => error.instancePath);
}

describe('workflowBuilderValidator instancePath', () => {
  it.each([
    ['reply draft', '/reply draft'],
    ['kwota_zł', '/kwota_zł'],
    ['50%', '/50%'],
    ['q#?&', '/q#?&'],
  ])('reports %s as the plain JSON Pointer %s, as Ajv does', (key, path) => {
    expect(instancePathsFor([key])).toEqual([path]);
  });

  it.each([
    ['a/b', '/a~1b'],
    ['t~x', '/t~0x'],
  ])('keeps the JSON Pointer escape of %s: %s', (key, path) => {
    expect(instancePathsFor([key])).toEqual([path]);
  });

  it('reports an error on the whole object at the empty path, with the missing key unencoded', () => {
    const validate = workflowBuilderValidator.compile({
      type: 'object',
      required: ['reply draft'],
      properties: { 'reply draft': { type: 'string' } },
    });
    validate({});

    expect(validate.errors).toEqual([
      expect.objectContaining({ keyword: 'required', instancePath: '', params: { missingProperty: 'reply draft' } }),
    ]);
  });
});
