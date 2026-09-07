import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { NodeDescription } from './node-description';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

describe('NodeDescription', () => {
  it('exposes the full label and description as native tooltips for truncated text', () => {
    act(() =>
      root.render(<NodeDescription label="Route by Type" description="Sends the ticket to the right responder." />),
    );

    const [title, subtitle] = container.querySelectorAll('span');
    expect(title.getAttribute('title')).toBe('Route by Type');
    expect(subtitle.getAttribute('title')).toBe('Sends the ticket to the right responder.');
  });

  it('renders no tooltip attribute when there is no description', () => {
    act(() => root.render(<NodeDescription label="Start" />));

    const [, subtitle] = container.querySelectorAll('span');
    expect(subtitle.hasAttribute('title')).toBe(false);
  });
});
