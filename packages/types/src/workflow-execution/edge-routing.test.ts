import { describe, expect, it } from 'vitest';

import { RESERVED_ERROR_HANDLE, isPortRouted } from './edge-routing';

describe('isPortRouted', () => {
  it.each<[string, string | undefined, string | null | undefined, boolean]>([
    ['no port leaves through an unnamed edge', undefined, undefined, true],
    ['no port leaves through a named edge', undefined, 'no', true],
    ['an empty port counts as none', '', 'no', true],
    ['no port never leaves through the error edge', undefined, RESERVED_ERROR_HANDLE, false],
    ['a port leaves through its own edge', 'yes', 'yes', true],
    ['a port does not leave through another edge', 'yes', 'no', false],
    ['a port does not leave through an unnamed edge', 'yes', null, false],
    ['a port never leaves through the error edge', 'yes', RESERVED_ERROR_HANDLE, false],
    ['error routing leaves through the error edge', RESERVED_ERROR_HANDLE, RESERVED_ERROR_HANDLE, true],
    ['error routing does not leave through an unnamed edge', RESERVED_ERROR_HANDLE, undefined, false],
    ['error routing does not leave through a named edge', RESERVED_ERROR_HANDLE, 'yes', false],
  ])('%s', (_, nextPort, sourceHandle, expected) => {
    expect(isPortRouted(nextPort, sourceHandle)).toBe(expected);
  });
});
