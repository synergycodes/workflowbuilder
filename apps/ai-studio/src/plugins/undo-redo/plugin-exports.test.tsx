import { WorkflowBuilder } from '@workflowbuilder/sdk';
import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { plugin } from './plugin-exports';

describe('undo/redo plugin', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders Undo and Redo right after Save in the app bar', async () => {
    act(() =>
      root.render(
        <StrictMode>
          <WorkflowBuilder.Root plugins={[plugin]}>
            <WorkflowBuilder.TopBar />
          </WorkflowBuilder.Root>
        </StrictMode>,
      ),
    );
    // Icons load lazily and show an empty svg until then; resolving them inside act keeps the run quiet.
    while (container.querySelector('svg:empty')) {
      await act(() => new Promise((resolve) => setTimeout(resolve, 10)));
    }

    const labels = Array.from(container.querySelectorAll('button'), (button) => button.getAttribute('aria-label'));
    const save = labels.indexOf('Save');
    expect(save).toBeGreaterThanOrEqual(0);
    expect(labels.slice(save, save + 3)).toEqual(['Save', 'Undo', 'Redo']);
  });
});
