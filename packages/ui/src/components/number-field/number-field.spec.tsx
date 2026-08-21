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
  act(() => root.render(<NumberField aria-label="Quantity" disabled state="read-only" />));

  const input = getVisibleInput();
  expect(input.disabled).toBe(true);
  expect(input.readOnly).toBe(false);
  expect(input.closest('[data-field-state]')?.getAttribute('data-field-state')).toBe('default');
});

it('renders an accessible clear affordance', () => {
  const onClear = vi.fn();

  act(() => root.render(<NumberField aria-label="Quantity" onClear={onClear} />));

  const clearButton = container.querySelector<HTMLButtonElement>('button[aria-label="Clear number field"]');
  expect(clearButton).not.toBeNull();

  act(() => clearButton?.click());

  expect(onClear).toHaveBeenCalledOnce();
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

it('emits a clamped typed value only once after blur', () => {
  const values: Array<number | null> = [];
  act(() =>
    root.render(
      <NumberField aria-label="Quantity" defaultValue={1} max={10} onValueChange={(value) => values.push(value)} />,
    ),
  );

  const input = getVisibleInput();
  act(() => input.focus());
  changeInputValue(input, '11');
  act(() => input.blur());

  expect(values).toEqual([10]);
});

it('resynchronizes a controlled value when its parent refuses an update', () => {
  const values: Array<number | null> = [];
  act(() => root.render(<NumberField aria-label="Quantity" value={1} onValueChange={(value) => values.push(value)} />));

  const input = getVisibleInput();
  act(() => input.focus());
  changeInputValue(input, '2');

  expect(getVisibleInput().value).toBe('1');

  pressKey(getVisibleInput(), 'ArrowUp');

  expect(values).toEqual([2, 2]);
  expect(getVisibleInput().value).toBe('1');
});

it('honors a controlled cancellation without leaving dirty text', () => {
  const reasons: string[] = [];
  act(() =>
    root.render(
      <NumberField
        aria-label="Quantity"
        value={1}
        onValueChange={(_value, details) => {
          reasons.push(details.reason);
          details.cancel();
        }}
      />,
    ),
  );

  const input = getVisibleInput();
  act(() => input.focus());
  changeInputValue(input, '2');

  expect(reasons).toEqual(['input-change']);
  expect(getVisibleInput().value).toBe('1');
  expect(document.activeElement).toBe(getVisibleInput());
});

it('keeps an off-grid clamped boundary valid for form submission', () => {
  const values: Array<number | null> = [];
  act(() =>
    root.render(
      <form>
        <NumberField
          name="quantity"
          defaultValue={9}
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

  const form = container.querySelector('form');
  const nativeInput = container.querySelector<HTMLInputElement>('input[type="number"]');
  expect(values).toEqual([10]);
  expect(nativeInput?.value).toBe('10');
  expect(nativeInput?.step).toBe('any');
  expect(nativeInput?.validity.stepMismatch).toBe(false);
  expect(form?.checkValidity()).toBe(true);
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
});
