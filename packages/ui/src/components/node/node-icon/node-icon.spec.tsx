import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { NodeIcon, type NodeIconAccent } from './node-icon';

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

const ACCENTS: NodeIconAccent[] = ['blue', 'green', 'orange', 'violet', 'neutral', 'ai'];

describe('NodeIcon', () => {
  it.each(ACCENTS)('marks the %s accent', (accent) => {
    act(() => root.render(<NodeIcon icon={<svg />} accent={accent} />));

    expect(container.firstElementChild?.className).toMatch(new RegExp(`accent-${accent}`));
  });

  it('keeps the default look without an accent', () => {
    act(() => root.render(<NodeIcon icon={<svg />} />));

    expect(container.firstElementChild?.className).not.toMatch(/accent-/);
  });

  it('keeps the accent next to the disabled state', () => {
    act(() => root.render(<NodeIcon icon={<svg />} accent="violet" disabled />));

    const className = container.firstElementChild?.className;
    expect(className).toMatch(/accent-violet/);
    expect(className).toMatch(/disabled/);
  });
});
