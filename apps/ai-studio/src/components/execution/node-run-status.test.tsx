import { OptionalNodeCorner, OptionalNodeHeaderEnd, OptionalNodeOverlay } from '@workflowbuilder/sdk';
import { Status } from '@workflowbuilder/ui';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { plugin } from '../../plugin';
import { type NodeExecutionState, resetExecution, useExecutionStore } from '../../stores/use-execution-store';

const setStatus = (status: NodeExecutionState['status']) =>
  act(() => useExecutionStore.setState({ nodeStates: { 'node-1': { status } } }));

describe('node run status decorators', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeAll(() => plugin());

  beforeEach(() => {
    resetExecution();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <>
          <OptionalNodeHeaderEnd nodeId="node-1" />
          <OptionalNodeOverlay nodeId="node-1" />
          <OptionalNodeCorner nodeId="node-1">
            <Status status="invalid" />
          </OptionalNodeCorner>
        </>,
      ),
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const query = (selector: string) => container.querySelector(selector);

  it('keeps the validation badge and draws nothing while the node has no run status', () => {
    expect(query('[class*="status-container--invalid"]')).not.toBeNull();
    expect(query('[data-node-run-overlay]')).toBeNull();
    expect(query('[data-tone]')).toBeNull();
  });

  it('keeps the validation badge on an idle node', () => {
    setStatus('idle');

    expect(query('[class*="status-container--invalid"]')).not.toBeNull();
    expect(query('[data-tone]')).toBeNull();
  });

  it('draws a running node with ring, spinner indicator and badge in place of the validation badge', () => {
    setStatus('running');

    expect(query('[data-node-run-overlay]')?.getAttribute('data-tone')).toBe('info');
    expect(query('[aria-hidden="true"][data-tone="info"] [data-spinner="running"]')).not.toBeNull();
    expect(container.textContent).toContain('Running');
    expect(query('[class*="status-container"]')).toBeNull();
  });

  it('draws a waiting node as waiting for a human', () => {
    setStatus('waiting');

    expect(query('[data-node-run-overlay]')?.getAttribute('data-halo')).toBe('waiting');
    expect(query('[data-node-run-overlay]')?.getAttribute('data-tone')).toBe('human');
  });

  it('veils a skipped node and gives it no indicator', () => {
    setStatus('skipped');

    expect(query('[class*="veil"]')).not.toBeNull();
    expect(query('[aria-hidden="true"][data-tone]')).toBeNull();
    expect(container.textContent).toContain('Skipped');
  });
});
