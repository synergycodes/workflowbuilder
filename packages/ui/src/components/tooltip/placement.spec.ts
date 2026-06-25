import { placementToSideAlign } from './placement';

describe('placementToSideAlign', () => {
  it('defaults align to center for a bare side', () => {
    expect(placementToSideAlign('bottom')).toEqual({ side: 'bottom', align: 'center' });
  });

  it('splits a side-start placement', () => {
    expect(placementToSideAlign('top-start')).toEqual({ side: 'top', align: 'start' });
  });

  it('splits a side-end placement', () => {
    expect(placementToSideAlign('right-end')).toEqual({ side: 'right', align: 'end' });
  });
});
