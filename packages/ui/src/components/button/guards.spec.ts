import { type ReactNode, createElement } from 'react';

import { hasChildrenWithStringAndIcons, hasIconChildrenOnly, hasStringChildrenOnly } from './guards';

const icon = createElement('span', null, 'icon');
const otherIcon = createElement('svg');

describe('hasIconChildrenOnly', () => {
  it('returns true for a single element child', () => {
    expect(hasIconChildrenOnly({ children: icon })).toBe(true);
  });

  it('returns true for a function child', () => {
    // A render-prop function is not a valid `ReactNode`, but the guard
    // accepts it at runtime via a `typeof === 'function'` check.
    const functionChild = (() => null) as unknown as ReactNode;
    expect(hasIconChildrenOnly({ children: functionChild })).toBe(true);
  });

  it('returns false for a string child', () => {
    expect(hasIconChildrenOnly({ children: 'label' })).toBe(false);
  });

  it('returns false for an array of children', () => {
    expect(hasIconChildrenOnly({ children: ['label', icon] })).toBe(false);
  });

  it('returns false for number/boolean/null children', () => {
    expect(hasIconChildrenOnly({ children: 42 })).toBe(false);
    expect(hasIconChildrenOnly({ children: true })).toBe(false);
    expect(hasIconChildrenOnly({ children: null })).toBe(false);
  });
});

describe('hasChildrenWithStringAndIcons', () => {
  it('returns true for [string, element]', () => {
    expect(hasChildrenWithStringAndIcons({ children: ['label', icon] })).toBe(true);
  });

  it('returns true for [element, string]', () => {
    expect(hasChildrenWithStringAndIcons({ children: [icon, 'label'] })).toBe(true);
  });

  it('returns true for two elements', () => {
    expect(hasChildrenWithStringAndIcons({ children: [icon, otherIcon] })).toBe(true);
  });

  it('returns false for an array shorter than 2', () => {
    expect(hasChildrenWithStringAndIcons({ children: [icon] })).toBe(false);
  });

  it('returns false for a single string child (not an array)', () => {
    expect(hasChildrenWithStringAndIcons({ children: 'label' })).toBe(false);
  });

  it('returns false for a single element child (not an array)', () => {
    expect(hasChildrenWithStringAndIcons({ children: icon })).toBe(false);
  });

  it('returns false when an entry is number/boolean/null', () => {
    expect(hasChildrenWithStringAndIcons({ children: [42, icon] })).toBe(false);
    expect(hasChildrenWithStringAndIcons({ children: [icon, null] })).toBe(false);
    expect(hasChildrenWithStringAndIcons({ children: [true, false] })).toBe(false);
  });
});

describe('hasStringChildrenOnly', () => {
  it('returns true for a string child', () => {
    expect(hasStringChildrenOnly({ children: 'label' })).toBe(true);
  });

  it('returns false for an element child', () => {
    expect(hasStringChildrenOnly({ children: icon })).toBe(false);
  });

  it('returns false for an array child', () => {
    expect(hasStringChildrenOnly({ children: ['label', icon] })).toBe(false);
  });

  it('returns false for number/boolean/null children', () => {
    expect(hasStringChildrenOnly({ children: 42 })).toBe(false);
    expect(hasStringChildrenOnly({ children: true })).toBe(false);
    expect(hasStringChildrenOnly({ children: null })).toBe(false);
  });
});
