import { act, createRef } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { NumberField } from './number-field';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

it('steps with arrow keys while respecting the bounds', () => {
  const values: number[] = [];

  act(() => {
    root.render(
      <NumberField
        aria-label="Quantity"
        defaultValue={1}
        min={0}
        max={2}
        onValueChange={(value) => values.push(value)}
      />,
    );
  });

  const input = container.querySelector('input');
  expect(input).not.toBeNull();

  act(() => input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })));
  act(() => input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })));

  expect(values).toEqual([2]);

  act(() => input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })));

  expect(values).toEqual([2, 1]);
});

it('keeps disabled steppers out of the tab order', () => {
  act(() => root.render(<NumberField aria-label="Quantity" disabled />));

  const buttons = container.querySelectorAll<HTMLButtonElement>(
    'button[aria-label="Increment value"], button[aria-label="Decrement value"]',
  );
  expect(buttons).toHaveLength(2);

  for (const button of buttons) {
    expect(button.disabled).toBe(true);
    expect(button.tabIndex).toBe(-1);
  }
});

it('keeps the read-only input focusable and copyable', () => {
  const ref = createRef<HTMLInputElement>();

  act(() => root.render(<NumberField ref={ref} aria-label="Quantity" state="read-only" value={3} />));

  expect(ref.current?.readOnly).toBe(true);
  expect(ref.current?.disabled).toBe(false);
  expect(ref.current?.tabIndex).toBe(0);
});

it('renders an accessible clear affordance', () => {
  const onClear = vi.fn();

  act(() => root.render(<NumberField aria-label="Quantity" onClear={onClear} />));

  const clearButton = container.querySelector<HTMLButtonElement>('button[aria-label="Clear number field"]');
  expect(clearButton).not.toBeNull();

  act(() => clearButton?.click());

  expect(onClear).toHaveBeenCalledOnce();
});
