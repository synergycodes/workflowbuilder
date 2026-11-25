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
  act(() => root.render(<Snackbar variant="info" title="Saved" onClose={onClose} />));

  act(() => (closeButton() as HTMLButtonElement).click());

  expect(onClose).toHaveBeenCalledOnce();
});

it('shows no close button without onClose', () => {
  act(() => root.render(<Snackbar variant="info" title="Saved" />));

  expect(closeButton()).toBeNull();
});
