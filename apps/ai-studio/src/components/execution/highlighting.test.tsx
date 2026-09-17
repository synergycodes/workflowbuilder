import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExecutionEvent } from '@workflow-builder/types/workflow-execution/execution-events';

import { applyEvent, resetExecution, setExecutionStarted } from '../../stores/use-execution-store';
import { ExecutionHighlighting } from './highlighting';

vi.mock('@workflowbuilder/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/sdk')>();
  return { ...actual, getStoreEdges: () => [] };
});

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const waiting = (nodeId: string): ExecutionEvent => ({
  executionId: 'exec-1',
  sequence: 1,
  timestamp: '2026-09-15T12:00:00.000Z',
  type: 'node_waiting',
  nodeId,
});

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

  it('keeps the active shadow on a node that waits for a decision', () => {
    act(() => root.render(<ExecutionHighlighting />));
    act(() => applyEvent(waiting('human-1')));

    const css = document.querySelector('#us-css-ai-studio-highlighting')?.innerHTML ?? '';
    const activeRule = css.split('}').find((rule) => rule.includes('[data-id="human-1"]'));

    expect(activeRule).toContain('--ai-studio-node-shadow--active');
  });
});
