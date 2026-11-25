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
