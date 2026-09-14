import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { Menu } from './menu';

const containers: HTMLDivElement[] = [];

function renderMenu(items: Parameters<typeof Menu>[0]['items']) {
  const container = document.createElement('div');
  document.body.append(container);
  containers.push(container);
  const root = createRoot(container);
  act(() => {
    root.render(<Menu open items={items} />);
  });
  return root;
}

afterEach(() => {
  for (const container of containers.splice(0)) container.remove();
});

describe('Menu selection', () => {
  it('renders plain menu items when no item defines selected', () => {
    renderMenu([{ label: 'Edit' }, { label: 'Delete', destructive: true }]);

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
