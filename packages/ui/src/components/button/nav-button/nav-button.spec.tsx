import { type ReactNode, act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { NavButton } from './nav-button';

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

function renderedClasses(element: ReactNode) {
  act(() => root.render(element));

  return container
    .querySelector('button')!
    .className.split(/\s+/)
    .map((name) => name.replace(/^_(.+)_[^_]+$/, '$1'));
}

it('renders square with a background by default', () => {
  const classes = renderedClasses(<NavButton aria-label="Home" prefixIcon={<svg />} />);

  expect(classes).toContain('square');
  expect(classes).not.toContain('round');
  expect(classes).not.toContain('plain');
});

it('renders round from shape', () => {
  expect(renderedClasses(<NavButton shape="round">Round</NavButton>)).toContain('round');
});

it('renders plain from variant and keeps the shape', () => {
  const classes = renderedClasses(<NavButton aria-label="Home" variant="plain" prefixIcon={<svg />} />);

  expect(classes).toContain('square');
  expect(classes).toContain('plain');
});

const emptyChildren: Array<[string, ReactNode]> = [
  ['null', null],
  ['false', false],
  ['empty string', ''],
];

const iconSlots = ['prefixIcon', 'suffixIcon'] as const;

it.each(emptyChildren.flatMap(([label, child]) => iconSlots.map((slot) => [label, slot, child] as const)))(
  'renders the %s child with the %s slot',
  (_label, slot, child) => {
    const icon = <svg data-icon-slot={slot} />;
    const slotProps = slot === 'prefixIcon' ? { prefixIcon: icon } : { suffixIcon: icon };

    act(() => {
      root.render(
        <NavButton aria-label="Action" {...slotProps}>
          {child}
        </NavButton>,
      );
    });

    expect(container.querySelector(`svg[data-icon-slot="${slot}"]`)).not.toBeNull();
  },
);
