import { getByPath, isPlainObject } from './object';

describe('getByPath', () => {
  const source = {
    a: { b: { c: 1 } },
    items: [{ name: 'first' }, { name: 'second' }],
    zero: 0,
    empty: '',
    off: false,
    nothing: null,
  };

  it('returns top-level value', () => {
    expect(getByPath(source, 'zero')).toBe(0);
  });

  it('returns nested value by dot path', () => {
    expect(getByPath(source, 'a.b.c')).toBe(1);
  });

  it('returns intermediate object', () => {
    expect(getByPath(source, 'a.b')).toEqual({ c: 1 });
  });

  it('resolves array index segments', () => {
    expect(getByPath(source, 'items.1.name')).toBe('second');
  });

  it('returns falsy values as they are', () => {
    expect(getByPath(source, 'empty')).toBe('');
    expect(getByPath(source, 'off')).toBe(false);
    expect(getByPath(source, 'nothing')).toBeNull();
  });

  it('returns undefined for missing key', () => {
    expect(getByPath(source, 'missing')).toBeUndefined();
  });

  it('returns undefined when intermediate segment is missing', () => {
    expect(getByPath(source, 'a.x.c')).toBeUndefined();
  });

  it('returns undefined when intermediate segment is null', () => {
    expect(getByPath(source, 'nothing.anything')).toBeUndefined();
  });

  it('returns undefined when traversing through a primitive', () => {
    expect(getByPath(source, 'zero.anything')).toBeUndefined();
  });

  it('returns undefined for null or undefined object', () => {
    expect(getByPath(null, 'a')).toBeUndefined();
    expect(getByPath(undefined, 'a')).toBeUndefined();
  });

  it('returns undefined for empty path', () => {
    expect(getByPath(source, '')).toBeUndefined();
  });
});

describe('isPlainObject', () => {
  it('accepts object literal', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
  });

  it('accepts object without prototype', () => {
    expect(isPlainObject(Object.create(null))).toBe(true);
  });

  it('rejects array', () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject([1, 2])).toBe(false);
  });

  it('rejects null and undefined', () => {
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(void 0)).toBe(false);
  });

  it('rejects primitives', () => {
    expect(isPlainObject('text')).toBe(false);
    expect(isPlainObject(0)).toBe(false);
    expect(isPlainObject(true)).toBe(false);
    expect(isPlainObject(Symbol('s'))).toBe(false);
  });

  it('rejects function', () => {
    expect(isPlainObject(() => {})).toBe(false);
  });
});
