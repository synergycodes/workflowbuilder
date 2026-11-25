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
    [{ state: 'critical' as const }, true],
    [{ state: 'success' as const }, false],
    [{}, false],
  ])('%o draws the error border: %s', (props, expected) => {
    expect(/container--error/.test(triggerClass(props))).toBe(expected);
  });
});

describe('Select required', () => {
  it('marks the label and the trigger', () => {
    triggerClass({ label: 'Mode', required: true });

    expect(container.querySelector('label')?.textContent).toBe('Mode*');
    expect(container.querySelector('button')?.getAttribute('aria-required')).toBe('true');
  });

  it('leaves both unmarked without required', () => {
    triggerClass({ label: 'Mode' });

    expect(container.querySelector('label')?.textContent).toBe('Mode');
    expect(container.querySelector('button')?.hasAttribute('aria-required')).toBe(false);
  });
});
