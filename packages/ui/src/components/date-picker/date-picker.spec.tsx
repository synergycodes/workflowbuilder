import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DatePicker } from './date-picker';
import type { DatePickerProps } from './types';

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

function trigger(props: Partial<DatePickerProps>) {
  act(() => root.render(<DatePicker {...props} />));
  return container.querySelector('button')!;
}

describe('DatePicker trigger state', () => {
  it.each([
    [{}, 'default', false],
    [{ error: true }, 'critical', true],
    [{ state: 'critical' as const }, 'critical', true],
    [{ state: 'read-only' as const }, 'read-only', false],
    [{ readOnly: true }, 'read-only', false],
  ])('%o sets data-state %s, error border: %s', (props, dataState, hasError) => {
    const button = trigger(props);
    expect(button.dataset['state']).toBe(dataState);
    expect(/container--error/.test(button.className)).toBe(hasError);
  });
});
