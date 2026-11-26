import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { Snackbar } from './snackbar';

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

function closeButton() {
  return container.querySelector('button[aria-label="Close"]');
}

it('shows the close button when onClose is set and calls it', () => {
  const onClose = vi.fn();
  act(() => root.render(<Snackbar tone="info" title="Saved" onClose={onClose} />));

  act(() => (closeButton() as HTMLButtonElement).click());

  expect(onClose).toHaveBeenCalledOnce();
});

it('shows no close button without onClose', () => {
  act(() => root.render(<Snackbar tone="info" title="Saved" />));

  expect(closeButton()).toBeNull();
});

it('styles tone="critical" with the critical container, icon and action button', () => {
  act(() => root.render(<Snackbar tone="critical" title="Failed" buttonLabel="Retry" onButtonClick={() => {}} />));

  expect(container.firstElementChild!.className).toMatch(/critical/);
  expect(container.querySelector('svg')!.getAttribute('class')).toMatch(/critical/);
  expect(container.querySelector('button')!.className).toMatch(/critical/);
});
