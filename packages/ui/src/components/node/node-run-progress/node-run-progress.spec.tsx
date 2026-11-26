import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { NodeRunProgress } from './node-run-progress';

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

function fillWidth(value: number) {
  act(() => root.render(<NodeRunProgress value={value} />));
  return (container.firstElementChild!.firstElementChild as HTMLElement).style.width;
}

describe('NodeRunProgress', () => {
  it.each([
    [42, '42%'],
    [-5, '0%'],
    [130, '100%'],
    [Number.NaN, '0%'],
  ])('fills %s as %s', (value, width) => {
    expect(fillWidth(value)).toBe(width);
  });

  it('is hidden from assistive technology', () => {
    act(() => root.render(<NodeRunProgress value={10} />));

    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });
});
