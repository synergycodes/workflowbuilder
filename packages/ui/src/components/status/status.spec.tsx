import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { Status } from './status';

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

it('renders the critical indicator for tone="critical"', () => {
  act(() => root.render(<Status tone="critical" />));

  expect(container.firstElementChild?.className).toMatch(/status-container--critical/);
});

it('renders nothing without a tone', () => {
  act(() => root.render(<Status />));

  expect(container.childElementCount).toBe(0);
});
