import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Menu } from './menu';

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

function renderMenu(items: Parameters<typeof Menu>[0]['items']) {
  act(() => {
    root.render(<Menu open items={items} />);
  });
}

describe('Menu selection', () => {
  it('renders plain menu items when no item defines selected', () => {
    renderMenu([{ label: 'Edit' }, { label: 'Delete', tone: 'critical' }]);

    expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(2);
    expect(document.querySelector('[role="menuitemradio"]')).toBeNull();
  });

  it('renders a radio group and checks the selected item', () => {
    renderMenu([
      { label: 'English', selected: true },
      { label: 'Polski', selected: false },
    ]);

    const radios = [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')];
    expect(radios.map((item) => item.textContent)).toEqual(['English', 'Polski']);
    expect(radios[0].getAttribute('aria-checked')).toBe('true');
    expect('checked' in radios[0].dataset).toBe(true);
    expect(radios[1].getAttribute('aria-checked')).toBe('false');
    expect('checked' in radios[1].dataset).toBe(false);
  });
});
