import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Select, type SelectBaseProps } from './select';

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

function triggerClass(props: Partial<SelectBaseProps>) {
  act(() => root.render(<Select items={[{ value: 'a', label: 'A' }]} {...props} />));
  return container.querySelector('button')?.className ?? '';
}

describe('Select trigger error border', () => {
  it.each([
    [{ error: true }, true],
    [{ state: 'critical' as const }, true],
    [{ state: 'success' as const }, false],
    [{}, false],
  ])('%o draws the error border: %s', (props, expected) => {
    expect(/container--error/.test(triggerClass(props))).toBe(expected);
  });
});
