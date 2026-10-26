import { afterEach, describe, expect, it } from 'vitest';

import { FIT_VIEW_BASE_PADDING } from '../features/diagram/diagram.const';
import { getPadding } from './use-fit-view';

function boxAt(left: number, top: number, right: number, bottom: number): HTMLElement {
  const element = document.createElement('div');
  element.getBoundingClientRect = () =>
    ({ left, top, right, bottom, width: right - left, height: bottom - top }) as DOMRect;
  return element;
}

function editorWith(canvas: HTMLElement): HTMLElement {
  const editor = document.createElement('div');
  canvas.classList.add('react-flow');
  const bounds = boxAt(300, 150, 700, 550);
  bounds.id = 'viewport-bounds';
  editor.append(canvas, bounds);
  return editor;
}

const expected = {
  left: `${200 + FIT_VIEW_BASE_PADDING}px`,
  top: `${100 + FIT_VIEW_BASE_PADDING}px`,
  right: `${200 + FIT_VIEW_BASE_PADDING}px`,
  bottom: `${100 + FIT_VIEW_BASE_PADDING}px`,
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('getPadding', () => {
  it('computes padding relative to the canvas box, not the window', () => {
    const editor = editorWith(boxAt(100, 50, 900, 650));
    document.body.append(editor);

    expect(getPadding(1, editor)).toEqual(expected);
  });

  it("ignores a host page's own React Flow canvas placed before the editor", () => {
    const hostCanvas = boxAt(0, 0, 200, 200);
    hostCanvas.className = 'react-flow';
    const editor = editorWith(boxAt(100, 50, 900, 650));
    document.body.append(hostCanvas, editor);

    expect(getPadding(1, editor)).toEqual(expected);
  });

  it('falls back to the base padding when the canvas is not mounted', () => {
    expect(getPadding(1, document.createElement('div'))).toBe(`${FIT_VIEW_BASE_PADDING}px`);
  });
});
