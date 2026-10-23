import { afterEach, describe, expect, it } from 'vitest';

import { FIT_VIEW_BASE_PADDING } from '../features/diagram/diagram.const';
import { getPadding } from './use-fit-view';

function boxAt(left: number, top: number, right: number, bottom: number): HTMLElement {
  const element = document.createElement('div');
  element.getBoundingClientRect = () =>
    ({ left, top, right, bottom, width: right - left, height: bottom - top }) as DOMRect;
  return element;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('getPadding', () => {
  it('computes padding relative to the canvas box, not the window', () => {
    const canvas = boxAt(100, 50, 900, 650);
    const bounds = boxAt(300, 150, 700, 550);
    bounds.id = 'viewport-bounds';
    document.body.append(bounds);

    expect(getPadding(1, canvas)).toEqual({
      left: `${200 + FIT_VIEW_BASE_PADDING}px`,
      top: `${100 + FIT_VIEW_BASE_PADDING}px`,
      right: `${200 + FIT_VIEW_BASE_PADDING}px`,
      bottom: `${100 + FIT_VIEW_BASE_PADDING}px`,
    });
  });

  it('falls back to the base padding when the canvas is not mounted', () => {
    expect(getPadding(1, null)).toBe(`${FIT_VIEW_BASE_PADDING}px`);
  });
});
