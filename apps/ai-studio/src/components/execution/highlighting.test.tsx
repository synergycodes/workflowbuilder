import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetExecution, setExecutionStarted, useExecutionStore } from '../../stores/use-execution-store';
import { ExecutionHighlighting } from './highlighting';

vi.mock('@workflowbuilder/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/sdk')>();
  return {
    ...actual,
    getStoreEdges: () => [
      { id: 'trigger-agent', source: 'trigger', target: 'agent' },
      { id: 'agent-skipped', source: 'agent', target: 'skipped' },
    ],
  };
});

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('ExecutionHighlighting', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    resetExecution();
    setExecutionStarted('exec-1', '/stream');
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.querySelector('#us-css-ai-studio-highlighting')?.remove();
  });

  it('highlights only the edges whose both ends ran, and no node', () => {
    act(() => root.render(<ExecutionHighlighting />));
    act(() =>
      useExecutionStore.setState({
        nodeStates: { trigger: { status: 'completed' }, agent: { status: 'running' }, skipped: { status: 'skipped' } },
      }),
    );

    const css = document.querySelector('#us-css-ai-studio-highlighting')?.innerHTML ?? '';

    expect(css).toContain('[data-edge-id="trigger-agent"]');
    expect(css).not.toContain('agent-skipped');
    expect(css).not.toContain('data-id=');
  });
});
