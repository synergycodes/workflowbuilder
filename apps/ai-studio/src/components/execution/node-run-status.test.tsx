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
  let canvasNode: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeAll(() => plugin());

  beforeEach(() => {
    resetExecution();
    canvasNode = document.createElement('div');
    document.body.append(canvasNode);
    root = createRoot(canvasNode);
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
    canvasNode.remove();
  });

  const query = (selector: string) => canvasNode.querySelector(selector);
  const badge = () =>
    [...canvasNode.querySelectorAll<HTMLElement>('[data-tone]')].find((element) => element.textContent);

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

  it.each([
    ['running', 'info', 'Running'],
    ['waiting', 'human', 'Waiting'],
    ['completed', 'success', 'Completed'],
    ['failed', 'critical', 'Failed'],
    ['skipped', 'neutral', 'Skipped'],
  ] as const)(
    'draws a %s node with ring tone %s and a "%s" badge in place of the validation badge',
    (status, tone, label) => {
      setStatus(status);

      expect(query('[data-node-run-overlay]')?.getAttribute('data-tone')).toBe(tone);
      expect(badge()?.textContent).toBe(label);
      expect(badge()?.dataset['tone']).toBe(tone);
      expect(query('[class*="status-container"]')).toBeNull();
    },
  );

  it('gives a running node a spinner indicator', () => {
    setStatus('running');

    expect(query('[aria-hidden="true"][data-tone="info"] [data-spinner="running"]')).not.toBeNull();
  });

  it('pulses the halo of a node waiting for a human', () => {
    setStatus('waiting');

    expect(query('[data-node-run-overlay]')?.getAttribute('data-halo')).toBe('waiting');
  });

  it('veils a skipped node and gives it no indicator', () => {
    setStatus('skipped');

    expect(query('[class*="veil"]')).not.toBeNull();
    expect(query('[aria-hidden="true"][data-tone]')).toBeNull();
  });
});
