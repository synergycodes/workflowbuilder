import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { NodeAsPortWrapper } from './node-as-port-wrapper';

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

function hoverWrapper(connecting: boolean) {
  act(() =>
    root.render(
      <NodeAsPortWrapper connecting={connecting} targetPortPosition="left">
        Node
      </NodeAsPortWrapper>,
    ),
  );
  const wrapper = container.firstElementChild as HTMLDivElement;
  act(() => wrapper.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body })));

  return wrapper;
}

it('becomes a connection target when hovered while connecting', () => {
  expect(hoverWrapper(true).classList.contains('is-connection-target')).toBe(true);
});

it('stays inert when hovered while not connecting', () => {
  expect(hoverWrapper(false).classList.contains('is-connection-target')).toBe(false);
});
