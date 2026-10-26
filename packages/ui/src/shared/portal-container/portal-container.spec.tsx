import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Menu } from '../../components/menu/menu';
import { PortalContainerProvider } from './portal-container';

let mount: HTMLDivElement;
let portal: HTMLDivElement;
let root: Root;

beforeEach(() => {
  mount = document.createElement('div');
  portal = document.createElement('div');
  document.body.append(mount, portal);
  root = createRoot(mount);
});

afterEach(() => {
  act(() => root.unmount());
  mount.remove();
  portal.remove();
});

describe('PortalContainerProvider', () => {
  it('renders popups into the provided container', () => {
    act(() => {
      root.render(
        <PortalContainerProvider container={{ current: portal }}>
          <Menu open items={[{ label: 'Edit' }]} />
        </PortalContainerProvider>,
      );
    });

    expect(portal.querySelector('[role="menu"]')).not.toBeNull();
  });

  it('falls back to document.body without a provider', () => {
    act(() => {
      root.render(<Menu open items={[{ label: 'Edit' }]} />);
    });

    const menu = document.querySelector('[role="menu"]');
    expect(menu).not.toBeNull();
    expect(portal.contains(menu)).toBe(false);
  });
});
