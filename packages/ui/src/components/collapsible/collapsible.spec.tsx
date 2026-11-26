import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { Collapsible, type CollapsibleProps } from './collapsible';

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

function renderCollapsible(props: Omit<CollapsibleProps, 'children'> = {}) {
  act(() => {
    root.render(
      <Collapsible {...props}>
        <Collapsible.Button />
        <Collapsible.Content>Details</Collapsible.Content>
      </Collapsible>,
    );
  });
}

function button() {
  return container.querySelector('button')!;
}

function click() {
  act(() => button().click());
}

it('renders closed by default', () => {
  renderCollapsible();

  expect(button().getAttribute('aria-label')).toBe('Expand');
});

it('starts open with defaultOpen and toggles on its own', () => {
  const onOpenChange = vi.fn();
  renderCollapsible({ defaultOpen: true, onOpenChange });

  expect(button().getAttribute('aria-label')).toBe('Collapse');

  click();

  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(button().getAttribute('aria-label')).toBe('Expand');
});

it('follows open and only reports the requested state when controlled', () => {
  const onOpenChange = vi.fn();
  renderCollapsible({ open: true, defaultOpen: false, onOpenChange });

  expect(button().getAttribute('aria-label')).toBe('Collapse');

  click();

  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(button().getAttribute('aria-label')).toBe('Collapse');
});
