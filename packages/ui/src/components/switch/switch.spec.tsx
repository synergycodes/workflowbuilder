import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { IconSwitch } from './icon-switch/icon-switch';
import { Switch } from './switch';

// jsdom has no PointerEvent; Base UI's Switch creates one when it is clicked.
globalThis.PointerEvent ??= class extends MouseEvent {} as typeof PointerEvent;

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
  ['Switch', (onCheckedChange: () => void) => <Switch key="switch" onCheckedChange={onCheckedChange} />],
  [
    'IconSwitch',
    (onCheckedChange: () => void) => (
      <IconSwitch key="icon-switch" icon={<svg />} IconChecked={<svg />} onCheckedChange={onCheckedChange} />
    ),
  ],
])('%s reports the next checked state and the event through onCheckedChange', (_name, render) => {
  const onCheckedChange = vi.fn();
  act(() => root.render(render(onCheckedChange)));

  act(() => container.querySelector<HTMLElement>('[role="switch"]')!.click());

  expect(onCheckedChange).toHaveBeenCalledOnce();
  expect(onCheckedChange.mock.calls[0]?.[0]).toBe(true);
  expect(onCheckedChange.mock.calls[0]?.[1]).toBeInstanceOf(Event);
});
