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

// jsdom has no PointerEvent, and Base UI picks an option on the full pointer sequence, not on click alone.
globalThis.PointerEvent ??= class extends MouseEvent {} as typeof PointerEvent;

function press(element: HTMLElement) {
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
    const EventType = type.startsWith('pointer') ? PointerEvent : MouseEvent;
    act(() => element.dispatchEvent(new EventType(type, { bubbles: true, cancelable: true, button: 0 })));
  }
}

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

it('reports the picked value first and the event second through onValueChange', async () => {
  const onValueChange = vi.fn();
  act(() =>
    root.render(
      <Select
        defaultValue="a"
        items={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
        onValueChange={onValueChange}
      />,
    ),
  );

  press(container.querySelector('button')!);
  await act(async () => {});
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) => candidate.textContent === 'B',
  )!;
  press(option);

  expect(onValueChange).toHaveBeenCalledOnce();
  expect(onValueChange.mock.calls[0]?.[0]).toBe('b');
  expect(onValueChange.mock.calls[0]?.[1]).toBeInstanceOf(Event);
});

const twoItems = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
];

function option(label: string) {
  return [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) => candidate.textContent === label,
  );
}

async function openSelect() {
  press(container.querySelector('button')!);
  await act(async () => {});
}

describe('Select onValueChange on re-picking the current value', () => {
  it.each([
    ['uncontrolled', { defaultValue: 'a' }],
    ['controlled', { value: 'a' }],
  ])('stays silent when %s', async (_, props) => {
    const onValueChange = vi.fn();
    act(() => root.render(<Select items={twoItems} onValueChange={onValueChange} {...props} />));

    await openSelect();
    press(option('A')!);

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('reports a pick that returns to the starting value when uncontrolled', async () => {
    const onValueChange = vi.fn();
    act(() => root.render(<Select defaultValue="a" items={twoItems} onValueChange={onValueChange} />));

    await openSelect();
    press(option('B')!);
    await openSelect();
    press(option('A')!);

    expect(onValueChange.mock.calls.map(([value]) => value)).toEqual(['b', 'a']);
  });
});

it('does not open with state read-only', async () => {
  act(() => root.render(<Select defaultValue="a" items={twoItems} state="read-only" />));

  await openSelect();

  expect(option('B')).toBeUndefined();
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
