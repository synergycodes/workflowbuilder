import { rangeBetween } from './arrays';

const list = ['a', 'b', 'c', 'd', 'e'] as const;

describe('rangeBetween', () => {
  it('returns an inclusive forward range', () => {
    expect(rangeBetween(list, 'b', 'd')).toEqual(['b', 'c', 'd']);
  });

  it('returns a single element when from equals to', () => {
    expect(rangeBetween(list, 'c', 'c')).toEqual(['c']);
  });

  it('returns an empty array for a reversed range', () => {
    expect(rangeBetween(list, 'd', 'b')).toEqual([]);
  });

  it('returns an empty array when a value is not in the list', () => {
    expect(rangeBetween(list, 'a', 'z' as (typeof list)[number])).toEqual([]);
    expect(rangeBetween(list, 'z' as (typeof list)[number], 'c')).toEqual([]);
  });

  it('covers the full range at list bounds', () => {
    expect(rangeBetween(list, 'a', 'e')).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});
