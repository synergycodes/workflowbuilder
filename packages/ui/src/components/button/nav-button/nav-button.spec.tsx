import { type ReactNode, act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { NavButton } from './nav-button';

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
