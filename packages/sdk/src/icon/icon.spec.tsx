import questionIcon from '@iconify-icons/ph/question';
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Icon } from './icon';
import { defineIcons, findIcon, registerIcons, setRegisteredIcons } from './icon-registry';

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
    const builtInGear = findIcon('Gear');
    expect(builtInGear?.body).toBeTruthy();
    expect(builtInGear?.body).not.toBe(appGear.body);

    setRegisteredIcons(defineIcons({ Gear: appGear }));

    expect(findIcon('Gear')).toBe(appGear);
  });

  it('resolves plugin icons above built-in icons and below app icons', () => {
    const pluginGear = { body: '<path d="M3 3"/>' };
    registerIcons({ Gear: pluginGear, PluginOnly: pluginGear });

    expect(findIcon('Gear')).toBe(pluginGear);
    expect(findIcon('PluginOnly')).toBe(pluginGear);

    setRegisteredIcons(defineIcons({ Gear: appGear }));

    expect(findIcon('Gear')).toBe(appGear);
  });

  it('does not resolve names inherited from Object.prototype', () => {
    expect(findIcon('constructor')).toBeUndefined();
    expect(findIcon('toString')).toBeUndefined();
  });
});

describe('Icon', () => {
  it('renders a registered icon by name on the first render', () => {
    setRegisteredIcons(defineIcons({ Lightning: lightning }));

    act(() => root.render(<Icon name="Lightning" />));

    expect(container.querySelector('svg')?.innerHTML).toBe('<path d="M2 2"></path>');
  });

  it('leaves an inherited size to the renderer attributes, so container CSS can size the glyph', () => {
    setRegisteredIcons(defineIcons({ Lightning: lightning }));

    act(() => root.render(<Icon name="Lightning" size="inherit" />));

    const svg = container.querySelector('svg');
    expect(svg?.style.width).toBe('');
    expect(svg?.getAttribute('width')).toBe('1em');
  });

  it('leaves the color to the surrounding CSS unless a color is passed', () => {
    setRegisteredIcons(defineIcons({ Lightning: lightning }));

    act(() =>
      root.render(
        <>
          <Icon name="Lightning" />
          <Icon name="Lightning" color="red" />
        </>,
      ),
    );

    const icons = container.querySelectorAll('svg');
    expect(icons).toHaveLength(2);
    expect(icons[0].style.color).toBe('');
    expect(icons[1].style.color).toBe('red');
  });

  it('renders a same-size question mark for an unknown name and warns once per name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    act(() =>
      root.render(
        <>
          <Icon name="NotRegistered" size="large" />
          <Icon name="NotRegistered" />
        </>,
      ),
    );

    const fallback = container.querySelector('svg');
    const questionPath = /d="([^"]+)"/.exec(questionIcon.body)?.[1];
    expect(fallback?.querySelector('path')?.getAttribute('d')).toBe(questionPath);
    expect(fallback?.getAttribute('aria-hidden')).toBe('true');
    expect(fallback?.style.width).toBe('1.5rem');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"NotRegistered"'));
  });
});
