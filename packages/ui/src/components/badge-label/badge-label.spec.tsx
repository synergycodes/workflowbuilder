import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import styles from './badge-label.module.css';

import { BadgeLabel } from './badge-label';

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

it('renders the label with the default size and variant', () => {
  act(() => root.render(<BadgeLabel label="Running" />));

  const badge = container.firstElementChild!;
  expect(badge.textContent).toBe('Running');
  expect(badge.classList).toContain(styles['m']);
  expect(badge.classList).not.toContain(styles['inverse']);
  expect(badge.getAttribute('role')).toBeNull();
  expect(badge.hasAttribute('tabindex')).toBe(false);
});

it('applies the size and variant classes', () => {
  act(() => root.render(<BadgeLabel label="Rejected" size="s" variant="inverse" />));

  const badge = container.firstElementChild!;
  expect(badge.classList).toContain(styles['s']);
  expect(badge.classList).toContain(styles['inverse']);
  expect(badge.classList).not.toContain(styles['m']);
});

it('hides the glyph from assistive technology', () => {
  act(() => root.render(<BadgeLabel label="Retry" icon={<svg data-testid="glyph" />} />));

  expect(container.querySelector('svg')?.parentElement?.getAttribute('aria-hidden')).toBe('true');
});
