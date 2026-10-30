import { type ReactNode, act } from 'react';
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

function renderMenu(items: Parameters<typeof Menu>[0]['items'], footer?: ReactNode) {
  act(() => {
    root.render(<Menu open items={items} footer={footer} />);
  });
}

describe('Menu item keys', () => {
  it('two items with the same label and distinct ids render as two rows', () => {
    renderMenu([
      { id: 'built-in-settings', label: 'Settings' },
      { id: 'own-settings', label: 'Settings' },
    ]);

    const rows = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    expect(rows.map((row) => row.textContent)).toEqual(['Settings', 'Settings']);
    expect(rows.map((row) => row.id)).not.toContain('built-in-settings');
  });
});

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

  it('renders only items that define selected as radio items', () => {
    renderMenu([
      { label: 'Clean up' },
      { label: 'Horizontal', selected: true },
      { label: 'Vertical', selected: false },
    ]);

    expect(document.querySelector('[role="menuitem"]')?.textContent).toBe('Clean up');
    const radios = [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')];
    expect(radios.map((item) => item.textContent)).toEqual(['Horizontal', 'Vertical']);
    expect(radios.map((item) => item.getAttribute('aria-checked'))).toEqual(['true', 'false']);
  });
});

describe('Menu footer', () => {
  it('renders the footer inside the open popup after the items', () => {
    renderMenu([{ label: 'Edit' }], <button>Footer control</button>);

    const popup = document.querySelector('[role="menu"]');
    const footer = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Footer control');
    expect(popup?.contains(footer ?? null)).toBe(true);
    expect(popup?.lastElementChild?.contains(footer ?? null)).toBe(true);
  });
});
