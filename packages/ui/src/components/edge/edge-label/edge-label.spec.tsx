import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { EdgeLabel } from './edge-label';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it.each([
  [true, true],
  [false, false],
])('hovered=%s adds the hovered class: %s', (hovered, expected) => {
  act(() => root.render(<EdgeLabel hovered={hovered}>Label</EdgeLabel>));

  expect(/hovered/.test(container.firstElementChild!.className)).toBe(expected);
});
