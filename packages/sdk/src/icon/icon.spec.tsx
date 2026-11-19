import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Icon } from './icon';
import { defineIcons, findIcon, fromIconify, setRegisteredIcons } from './icon-registry';

const appGear = { body: '<path d="M1 1"/>', width: 256, height: 256 };
const lightning = { body: '<path d="M2 2"/>', width: 256, height: 256 };

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
  setRegisteredIcons(null);
  vi.restoreAllMocks();
});

describe('findIcon', () => {
  it('prefers an app icon over the built-in icon of the same name', () => {
    expect(findIcon('Gear')?.body).not.toBe(appGear.body);

    setRegisteredIcons(defineIcons({ Gear: appGear }));

    expect(findIcon('Gear')).toBe(appGear);
  });

  it('does not resolve names inherited from Object.prototype', () => {
    expect(findIcon('constructor')).toBeUndefined();
    expect(findIcon('toString')).toBeUndefined();
  });
});

describe('fromIconify', () => {
  it('renames icons to PascalCase and gives each the dimensions the set declares once', () => {
    const icons = fromIconify({
      width: 32,
      height: 32,
      icons: {
        'hubspot-logo': { body: '<path/>' },
        'claude-logo': { body: '<g/>', width: 24, height: 24 },
      },
    });

    expect(icons).toEqual({
      HubspotLogo: { body: '<path/>', width: 32, height: 32 },
      ClaudeLogo: { body: '<g/>', width: 24, height: 24 },
    });
  });
});

describe('Icon', () => {
  it('renders a registered icon by name on the first render', () => {
    setRegisteredIcons(defineIcons({ Lightning: lightning }));

    act(() => root.render(<Icon name="Lightning" />));

    expect(container.querySelector('svg')?.innerHTML).toBe('<path d="M2 2"></path>');
  });

  it('renders a same-size placeholder for an unknown name and warns once per name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    act(() =>
      root.render(
        <>
          <Icon name="NotRegistered" size="large" />
          <Icon name="NotRegistered" />
        </>,
      ),
    );

    const placeholder = container.querySelector('svg');
    expect(placeholder?.innerHTML).toBe('');
    expect(placeholder?.style.width).toBe('1.5rem');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"NotRegistered"'));
  });
});
