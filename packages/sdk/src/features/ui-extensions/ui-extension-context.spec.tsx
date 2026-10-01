import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RegisteredMenuItem } from './registered-menu-item';
import { renderInRoot } from './test-utils';
import { useRegisteredMenuItems } from './ui-extension-context';
import type { MenuId } from './ui-extension-registry';

function MenuLabels({ menu }: { menu: MenuId }) {
  const items = useRegisteredMenuItems(menu);
  return (
    <ul aria-label={menu}>
      {items.map(({ id, label }) => (
        <li key={id}>{label}</li>
      ))}
    </ul>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useRegisteredMenuItems', () => {
  it('returns the registered items of the given menu only', () => {
    renderInRoot(
      <>
        <MenuLabels menu="appBar" />
        <RegisteredMenuItem menu="appBar" componentName="AppBarMenuItem" label="Duplicate" />
        <RegisteredMenuItem menu="project" componentName="ProjectMenuItem" label="Rename" />
        <RegisteredMenuItem menu="appBar" componentName="AppBarMenuItem" label="Share" />
      </>,
    );

    const labels = screen.getAllByRole('listitem').map(({ textContent }) => textContent);
    expect(labels).toEqual(['Duplicate', 'Share']);
  });

  it('follows an item registered after it mounted', () => {
    function LateItem() {
      const [isShown, setIsShown] = useState(false);
      return isShown ? (
        <RegisteredMenuItem menu="appBar" componentName="AppBarMenuItem" label="Later" />
      ) : (
        <button type="button" onClick={() => setIsShown(true)}>
          Add
        </button>
      );
    }
    renderInRoot(
      <>
        <MenuLabels menu="appBar" />
        <LateItem />
      </>,
    );
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByRole('listitem').textContent).toBe('Later');
  });

  it('returns an empty array outside Root', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const seen: unknown[] = [];
    function Probe() {
      seen.push(useRegisteredMenuItems('appBar'));
      return null;
    }

    render(
      <StrictMode>
        <Probe />
        <RegisteredMenuItem menu="appBar" componentName="AppBarMenuItem" label="Duplicate" />
      </StrictMode>,
    );

    expect(seen.at(-1)).toEqual([]);
  });
});
