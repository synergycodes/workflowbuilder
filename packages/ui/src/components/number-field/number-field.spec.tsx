import { act, createRef, useState } from 'react';
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

function getVisibleInput() {
  const input = container.querySelector<HTMLInputElement>('input[type="text"]');
  expect(input).not.toBeNull();
  return input as HTMLInputElement;
}

function changeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function pressKey(input: HTMLInputElement, key: string) {
  act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
}

function paste(input: HTMLInputElement, text: string) {
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: { getData: (type: string) => (type === 'text/plain' ? text : '') },
  });
  act(() => input.dispatchEvent(event));
  return event;
}

it('steps with arrow keys while respecting the bounds', () => {
  const values: Array<number | null> = [];

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

  const input = getVisibleInput();

  pressKey(input, 'ArrowUp');
  pressKey(input, 'ArrowUp');

  expect(values).toEqual([2]);

  pressKey(input, 'ArrowDown');

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

it('lets disabled behavior take precedence over read-only state', () => {
  act(() => root.render(<NumberField aria-label="Quantity" className="layout-class" disabled state="read-only" />));

  const input = getVisibleInput();
  const group = input.closest('[data-state]');
  const fieldRoot = container.querySelector('.layout-class');
  expect(input.disabled).toBe(true);
  expect(input.readOnly).toBe(false);
  expect(group?.getAttribute('data-state')).toBe('default');
  expect(fieldRoot).not.toBe(group);
  expect(fieldRoot?.contains(group)).toBe(true);
});

it('clears an uncontrolled value while the input is focused', () => {
  const onClear = vi.fn();
  const changes: Array<{ value: number | null; reason: string }> = [];

  act(() =>
    root.render(
      <NumberField
        aria-label="Quantity"
        defaultValue={3}
        onClear={onClear}
        onValueChange={(value, details) => changes.push({ value, reason: details.reason })}
      />,
    ),
  );

  const input = getVisibleInput();
  const clearButton = container.querySelector<HTMLButtonElement>('button[aria-label="Clear number field"]');
  expect(clearButton).not.toBeNull();

  act(() => input.focus());
  changeInputValue(input, '4');
  act(() => clearButton?.click());

  expect(input.value).toBe('');
  expect(container.querySelector<HTMLInputElement>('input[type="number"]')?.value).toBe('');
  expect(document.activeElement).toBe(input);
  expect(onClear).toHaveBeenCalledOnce();
  expect(changes.at(-1)).toEqual({ value: null, reason: 'input-clear' });
});

it('clears a controlled value while the input is focused', () => {
  function ControlledNumberField() {
    const [value, setValue] = useState<number | null>(3);
    return <NumberField aria-label="Quantity" value={value} onValueChange={setValue} onClear={() => setValue(null)} />;
  }

  act(() => root.render(<ControlledNumberField />));

  const input = getVisibleInput();
  act(() => input.focus());
  changeInputValue(input, '4');
  act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Clear number field"]')?.click());

  expect(input.value).toBe('');
  expect(container.querySelector<HTMLInputElement>('input[type="number"]')?.value).toBe('');
  expect(document.activeElement).toBe(input);
});

it('reports clearing as a nullable value with change details', () => {
  const changes: Array<{ value: number | null; reason: string }> = [];
  act(() =>
    root.render(
      <NumberField
        aria-label="Quantity"
        defaultValue={3}
        onValueChange={(value, details) => changes.push({ value, reason: details.reason })}
      />,
    ),
  );

  changeInputValue(getVisibleInput(), '');

  expect(changes).toEqual([{ value: null, reason: 'input-clear' }]);
});

it('stops incrementing at the largest on-grid value below max', () => {
  const values: Array<number | null> = [];
  act(() =>
    root.render(
      <form>
        <NumberField
          name="quantity"
          defaultValue={6}
          min={0}
          max={10}
          step={3}
          onValueChange={(value) => values.push(value)}
        />
      </form>,
    ),
  );

  const increment = container.querySelector<HTMLButtonElement>('button[aria-label="Increment value"]');
  act(() => increment?.click());
  act(() => increment?.click());

  const form = container.querySelector('form');
  const nativeInput = container.querySelector<HTMLInputElement>('input[type="number"]');
  expect(values).toEqual([9]);
  expect(nativeInput?.value).toBe('9');
  expect(nativeInput?.max).toBe('10');
  expect(nativeInput?.step).toBe('3');
  expect(nativeInput?.validity.stepMismatch).toBe(false);
  expect(form?.checkValidity()).toBe(true);
});

it('typed off-grid value reports stepMismatch', () => {
  const values: Array<number | null> = [];
  act(() =>
    root.render(
      <form>
        <NumberField name="quantity" min={0} max={10} step={3} onValueChange={(value) => values.push(value)} />
      </form>,
    ),
  );

  const visibleInput = getVisibleInput();
  changeInputValue(visibleInput, '10');

  const form = container.querySelector('form');
  const nativeInput = container.querySelector<HTMLInputElement>('input[type="number"]');
  expect(values).toEqual([10]);
  expect(visibleInput.value).toBe('10');
  expect(nativeInput?.value).toBe('10');
  expect(nativeInput?.step).toBe('3');
  expect(nativeInput?.validity.stepMismatch).toBe(true);
  expect(form?.checkValidity()).toBe(false);
});

it('keeps a large off-grid max out of the step sequence', () => {
  const min = 1_000_000_000_000_000;
  const values: Array<number | null> = [];
  act(() =>
    root.render(
      <NumberField
        aria-label="Quantity"
        defaultValue={min + 6}
        min={min}
        max={min + 10}
        step={3}
        onValueChange={(value) => values.push(value)}
      />,
    ),
  );

  const increment = container.querySelector<HTMLButtonElement>('button[aria-label="Increment value"]');
  act(() => increment?.click());
  act(() => increment?.click());

  expect(values).toEqual([min + 9]);
});

it('disables increment at a fractional on-grid boundary', () => {
  act(() => root.render(<NumberField aria-label="Quantity" defaultValue={0.2} min={0} max={0.31} step={0.1} />));

  const increment = container.querySelector<HTMLButtonElement>('button[aria-label="Increment value"]');
  act(() => increment?.click());

  expect(container.querySelector<HTMLInputElement>('input[type="number"]')?.value).toBe('0.3');
  expect(increment?.disabled).toBe(true);
});

it('normalizes non-finite numeric props and never emits NaN', () => {
  const values: Array<number | null> = [];
  act(() =>
    root.render(
      <NumberField
        aria-label="Quantity"
        value={Number.NaN}
        min={Number.NEGATIVE_INFINITY}
        max={Number.POSITIVE_INFINITY}
        step={Number.NaN}
        onValueChange={(value) => values.push(value)}
      />,
    ),
  );

  pressKey(getVisibleInput(), 'ArrowUp');

  expect(values).toEqual([0]);
  expect(values.every((value) => value === null || Number.isFinite(value))).toBe(true);

  act(() =>
    root.render(
      <NumberField
        key="non-finite-default"
        aria-label="Quantity"
        defaultValue={Number.POSITIVE_INFINITY}
        onValueChange={(value) => values.push(value)}
      />,
    ),
  );
  pressKey(getVisibleInput(), 'ArrowUp');

  expect(values).toEqual([0, 0]);
});

it.each([0, -2])('normalizes an invalid numeric step of %s', (step) => {
  const values: Array<number | null> = [];
  act(() =>
    root.render(
      <NumberField aria-label="Quantity" defaultValue={2} step={step} onValueChange={(value) => values.push(value)} />,
    ),
  );

  pressKey(getVisibleInput(), 'ArrowUp');

  expect(values).toEqual([3]);
});

it('supports step="any" while retaining interactive stepping', () => {
  const values: Array<number | null> = [];
  act(() =>
    root.render(
      <NumberField aria-label="Quantity" defaultValue={1} step="any" onValueChange={(value) => values.push(value)} />,
    ),
  );

  pressKey(getVisibleInput(), 'ArrowUp');

  expect(values).toEqual([2]);
  expect(container.querySelector<HTMLInputElement>('input[type="number"]')?.step).toBe('any');
});

it('rejects malformed mixed-content paste instead of reinterpreting it', () => {
  const onValueChange = vi.fn();
  act(() => root.render(<NumberField aria-label="Quantity" onValueChange={onValueChange} />));

  const input = getVisibleInput();
  input.setSelectionRange(0, 0);
  const mixedTextEvent = paste(input, '12abc');
  const repeatedDecimalEvent = paste(input, '1.2.3');

  expect(mixedTextEvent.defaultPrevented).toBe(true);
  expect(repeatedDecimalEvent.defaultPrevented).toBe(true);
  expect(input.value).toBe('');
  expect(onValueChange).not.toHaveBeenCalled();
});

it('associates its label and critical helper with the input', () => {
  act(() =>
    root.render(
      <NumberField
        label="Quantity"
        helperText="Enter a valid quantity"
        isRequired
        state="critical"
        aria-describedby="external-description"
      />,
    ),
  );

  const input = getVisibleInput();
  const label = container.querySelector('label');
  const helper = container.querySelector('[id$="-helper"]');
  expect(input.id).not.toBe('');
  expect(label?.htmlFor).toBe(input.id);
  expect(label?.textContent).toBe('Quantity*');
  expect(input.required).toBe(true);
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(input.getAttribute('aria-describedby')?.split(' ')).toEqual(['external-description', helper?.id]);
  expect(helper?.getAttribute('role')).toBe('alert');
});
