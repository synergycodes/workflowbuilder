import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExecutionEvent } from '@workflow-builder/types/workflow-execution/execution-events';

import styles from './node-markers.module.css';

import {
  applyEvent,
  resetExecution,
  setExecutionStarted,
  setLogCollapsed,
  useExecutionStore,
} from '../../stores/use-execution-store';
import { ExecutionNodeMarkers } from './node-markers';

vi.mock('@workflowbuilder/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/sdk')>();
  return { ...actual, Icon: ({ name }: { name: string }) => <i data-icon={name} /> };
});

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function nodeEvent(type: 'node_started' | 'node_waiting' | 'node_completed', nodeId: string): ExecutionEvent {
  const base = { executionId: 'exec-1', sequence: 1, timestamp: '2026-09-15T12:00:00.000Z', nodeId };
  return (type === 'node_completed' ? { ...base, type, payload: { output: {} } } : { ...base, type }) as ExecutionEvent;
}

describe('ExecutionNodeMarkers', () => {
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
  });

  function render(nodeId: string) {
    act(() => root.render(<ExecutionNodeMarkers props={{ nodeId }} />));
  }

  function click() {
    act(() => {
      container.firstElementChild?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  it('shows an hourglass for a waiting node and does not open the log on click', () => {
    act(() => applyEvent(nodeEvent('node_waiting', 'human-1')));
    setLogCollapsed(true);

    render('human-1');

    expect(container.querySelector('[data-icon="HourglassMedium"]')).not.toBeNull();
    expect(container.firstElementChild?.classList.contains(styles['container--clickable']!)).toBe(false);

    click();
    expect(useExecutionStore.getState().isLogCollapsed).toBe(true);
  });

  it('swaps the hourglass for the completed flag once the decision lands, and that one opens the log', () => {
    act(() => applyEvent(nodeEvent('node_waiting', 'human-1')));
    render('human-1');
    act(() => applyEvent(nodeEvent('node_completed', 'human-1')));
    setLogCollapsed(true);

    expect(container.querySelector('[data-icon="HourglassMedium"]')).toBeNull();
    expect(container.querySelector('[data-icon="FlagBannerFold"]')).not.toBeNull();

    click();
    expect(useExecutionStore.getState().isLogCollapsed).toBe(false);
  });
});
