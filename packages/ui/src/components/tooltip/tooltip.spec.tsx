import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { Tooltip } from './tooltip';

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

function renderTooltip(defaultOpen?: boolean) {
  act(() => {
    root.render(
      <Tooltip defaultOpen={defaultOpen}>
        <Tooltip.Trigger>Trigger</Tooltip.Trigger>
        <Tooltip.Content>Hint</Tooltip.Content>
      </Tooltip>,
    );
  });
}

function popup() {
  return document.querySelector('[data-tooltip-type]');
}

it('shows the content on mount with defaultOpen', () => {
  renderTooltip(true);

  expect(popup()?.textContent).toBe('Hint');
});

it('renders no content on mount without defaultOpen', () => {
  renderTooltip();

  expect(popup()).toBeNull();
});
