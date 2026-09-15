import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { NodePanel } from './node-panel';

const containers: HTMLDivElement[] = [];

function renderRoot(props: { selected: boolean; disabled?: boolean }) {
  const container = document.createElement('div');
  document.body.append(container);
  containers.push(container);
  act(() => {
    createRoot(container).render(
      <NodePanel.Root {...props}>
        <NodePanel.Header>header</NodePanel.Header>
      </NodePanel.Root>,
    );
  });
  return container.firstElementChild!.firstElementChild as HTMLElement;
}

afterEach(() => {
  for (const container of containers.splice(0)) container.remove();
});

describe('NodePanel.Root states', () => {
  it('marks the shell as selected', () => {
    const shell = renderRoot({ selected: true });
    expect(shell.className).toMatch(/selected/);
    expect(shell.className).not.toMatch(/disabled/);
  });

  it('marks the shell as disabled', () => {
    const shell = renderRoot({ selected: false, disabled: true });
    expect(shell.className).toMatch(/disabled/);
    expect(shell.className).not.toMatch(/selected/);
  });
});
