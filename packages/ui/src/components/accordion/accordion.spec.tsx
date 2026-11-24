import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { Accordion, type AccordionProps } from './accordion';

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

function renderAccordion(props: Partial<AccordionProps> = {}) {
  act(() => {
    root.render(
      <Accordion label="Section" {...props}>
        Details
      </Accordion>,
    );
  });
}

function header() {
  return container.querySelector('[aria-expanded]')!;
}

function clickArrow() {
  act(() => container.querySelector('button')!.click());
}

it('renders open by default', () => {
  renderAccordion();

  expect(header().getAttribute('aria-expanded')).toBe('true');
});

it('starts closed with defaultOpen false and reports one change per arrow click', () => {
  const onOpenChange = vi.fn();
  renderAccordion({ defaultOpen: false, onOpenChange });

  expect(header().getAttribute('aria-expanded')).toBe('false');

  clickArrow();

  expect(onOpenChange).toHaveBeenCalledTimes(1);
  expect(onOpenChange).toHaveBeenCalledWith(true);
  expect(header().getAttribute('aria-expanded')).toBe('true');
});

it('stays as open says when controlled', () => {
  const onOpenChange = vi.fn();
  renderAccordion({ open: true, onOpenChange });

  clickArrow();

  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(header().getAttribute('aria-expanded')).toBe('true');
});
