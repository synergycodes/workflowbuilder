import { offsetToBaseUI, placementToSideAlign } from './placement';

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

describe('offsetToBaseUI', () => {
  it('returns an empty object for undefined offset', () => {
    expect(offsetToBaseUI(undefined, 'center')).toEqual({});
  });

  it('maps a number offset to sideOffset', () => {
    expect(offsetToBaseUI(8, 'center')).toEqual({ sideOffset: 8 });
  });

  it('negates crossAxis for end alignment', () => {
    expect(offsetToBaseUI({ mainAxis: 4, crossAxis: 6 }, 'end')).toEqual({ sideOffset: 4, alignOffset: -6 });
  });

  it('keeps crossAxis sign for start alignment', () => {
    expect(offsetToBaseUI({ mainAxis: 4, crossAxis: 6 }, 'start')).toEqual({ sideOffset: 4, alignOffset: 6 });
  });

  it('keeps crossAxis sign for center alignment', () => {
    expect(offsetToBaseUI({ mainAxis: 4, crossAxis: 6 }, 'center')).toEqual({ sideOffset: 4, alignOffset: 6 });
  });

  it('lets alignmentAxis override the crossAxis-derived value', () => {
    expect(offsetToBaseUI({ mainAxis: 4, crossAxis: 6, alignmentAxis: 2 }, 'end')).toEqual({
      sideOffset: 4,
      alignOffset: 2,
    });
  });
});
