import { getScope } from './get-scope';
import { describe, expect, it } from 'vitest';

describe('getScope', () => {
  const _schema = {
    properties: {
      label: { type: 'string' },
      description: { type: 'string' },
      metadata: {
        properties: {
          createdBy: { type: 'string' },
          updatedAt: { type: 'string' },
        },
      },
    },
  } as const;

  it('should generate scope for a top-level property', () => {
    expect(getScope<typeof _schema>('properties.label')).toBe('#/properties/label');
  });

  it('should generate scope for another top-level property', () => {
    expect(getScope<typeof _schema>('properties.description')).toBe('#/properties/description');
  });

  it('should generate scope for a nested property', () => {
    expect(getScope<typeof _schema>('properties.metadata.properties.createdBy')).toBe(
      '#/properties/metadata/properties/createdBy',
    );
  });

  it('should generate scope for another nested property', () => {
    expect(getScope<typeof _schema>('properties.metadata.properties.updatedAt')).toBe(
      '#/properties/metadata/properties/updatedAt',
    );
  });

  it('should return root scope when path function does nothing', () => {
    expect(getScope<typeof _schema>('')).toBe('#/');
  });
});
