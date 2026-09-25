import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import styles from './node-markers.module.css';

import {
  applyEvent,
  resetExecution,
  setExecutionStarted,
  setLogCollapsed,
  useExecutionStore,
} from '../../stores/use-execution-store';
import { nodeEvent } from '../../test/execution-history';
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

  it('leaves a waiting node without a marker: the decision template shows the wait itself', () => {
    act(() => applyEvent(nodeEvent('node_waiting', 'human-1')));

    render('human-1');

    expect(container.childElementCount).toBe(0);
  });

  it('shows the completed flag once the decision lands, and that one opens the log', () => {
    act(() => applyEvent(nodeEvent('node_waiting', 'human-1')));
    render('human-1');
    act(() => applyEvent(nodeEvent('node_completed', 'human-1')));
    setLogCollapsed(true);

    expect(container.querySelector('[data-icon="FlagBannerFold"]')).not.toBeNull();
    expect(container.firstElementChild?.classList.contains(styles['container--clickable']!)).toBe(true);

    click();
    expect(useExecutionStore.getState().isLogCollapsed).toBe(false);
  });
});
