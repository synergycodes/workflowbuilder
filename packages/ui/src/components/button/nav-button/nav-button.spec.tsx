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

const getAriaLabel = () => container.querySelector('button')?.getAttribute('aria-label');

describe('aria-label from tooltip', () => {
  it('names an icon-only button after its tooltip', () => {
    act(() => {
      root.render(<NavButton tooltip="Undo" prefixIcon={<svg />} />);
    });

    expect(getAriaLabel()).toBe('Undo');
  });

  it('keeps an explicit aria-label over the tooltip', () => {
    act(() => {
      root.render(<NavButton aria-label="Undo last change" tooltip="Undo" prefixIcon={<svg />} />);
    });

    expect(getAriaLabel()).toBe('Undo last change');
  });

  it('leaves a labelled button named by its text', () => {
    act(() => {
      root.render(<NavButton tooltip="Undo the last change">Undo</NavButton>);
    });

    expect(getAriaLabel()).toBeNull();
  });
});
