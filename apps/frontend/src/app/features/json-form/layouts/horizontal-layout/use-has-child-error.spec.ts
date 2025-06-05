/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useHasChildError } from './use-has-child-error';
import { useJsonForms } from '@jsonforms/react';

vi.mock('@jsonforms/react', () => ({
  useJsonForms: vi.fn(),
}));

describe('useHasChildError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when no errors are present', () => {
    (useJsonForms as any).mockReturnValue({ core: { errors: [] } });

    const result = useHasChildError([{ scope: '#/properties/name' }]);
    expect(result).toBe(false);
  });

  it('returns false when childElements is empty', () => {
    (useJsonForms as any).mockReturnValue({
      core: { errors: [{ instancePath: '/name' }] },
    });

    const result = useHasChildError([]);
    expect(result).toBe(false);
  });

  it('returns true when a matching error exists', () => {
    (useJsonForms as any).mockReturnValue({
      core: { errors: [{ instancePath: '/name' }] },
    });

    const result = useHasChildError([{ scope: '#/properties/name' }]);
    expect(result).toBe(true);
  });

  it('returns false when no matching error exists', () => {
    (useJsonForms as any).mockReturnValue({
      core: { errors: [{ instancePath: '/age' }] },
    });

    const result = useHasChildError([{ scope: '#/properties/name' }]);
    expect(result).toBe(false);
  });

  it('returns true for required errors with missing property', () => {
    (useJsonForms as any).mockReturnValue({
      core: {
        errors: [
          {
            keyword: 'required',
            instancePath: '/user',
            params: { missingProperty: 'name' },
          },
        ],
      },
    });

    const result = useHasChildError([{ scope: '#/properties/user/properties/name' }]);
    expect(result).toBe(true);
  });

  it('ignores child elements without a scope', () => {
    (useJsonForms as any).mockReturnValue({
      core: { errors: [{ instancePath: '/name' }] },
    });

    const result = useHasChildError([{ label: 'Test' } as any]);
    expect(result).toBe(false);
  });

  it('returns false when core is undefined', () => {
    (useJsonForms as any).mockReturnValue({});
    const result = useHasChildError([{ scope: '#/properties/name' }]);
    expect(result).toBe(false);
  });

  it('returns false when childElements is undefined', () => {
    (useJsonForms as any).mockReturnValue({ core: { errors: [{ instancePath: '/name' }] } });
    const result = useHasChildError();
    expect(result).toBe(false);
  });
});
