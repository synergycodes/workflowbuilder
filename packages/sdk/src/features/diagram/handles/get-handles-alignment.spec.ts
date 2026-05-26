import { getHandlesAlignment } from './get-handles-alignment';

describe('getHandlesAlignment', () => {
  it('returns "header" for horizontal flow so handles align with the header section', () => {
    expect(getHandlesAlignment({ layoutDirection: 'RIGHT' })).toBe('header');
  });

  it('returns "center" for vertical flow so handles sit on the node body axis', () => {
    expect(getHandlesAlignment({ layoutDirection: 'DOWN' })).toBe('center');
  });
});
