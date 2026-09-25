import { type ShowSnackbarOptions, useStore } from '@workflowbuilder/sdk';
import { type Node, ReactFlowProvider, type ReactFlowState, useStoreApi } from '@xyflow/react';
import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyEvent, resetExecution, setExecutionStarted } from '../../../stores/use-execution-store';
import { nodeEvent } from '../../../test/execution-history';
import { DecisionWaitingSnackbar } from './decision-waiting-snackbar';

// The SDK's own spec covers how a snackbar looks and closes; this one follows what the app asks of it.
const snackbars = vi.hoisted(() => ({ shown: [] as ShowSnackbarOptions[], closed: new Set<string>() }));
vi.mock('@workflowbuilder/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/sdk')>();
  return {
    ...actual,
    showSnackbar: (options: ShowSnackbarOptions) => {
      snackbars.shown.push(options);
      return options.key ?? '';
    },
    closeSnackbar: (key: string) => snackbars.closed.add(key),
  };
});

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const open = () => snackbars.shown.filter((options) => !snackbars.closed.has(options.key ?? ''));
const onlyOpen = () => {
  expect(open()).toHaveLength(1);
  return open()[0]!;
};

const decisionNode = (id: string, label: string) => ({
  id,
  position: { x: 0, y: 0 },
  data: { type: 'ai-studio/human-decision', icon: 'UserCheck' as const, properties: { label } },
});

const apply = (type: 'node_waiting' | 'node_completed', nodeId: string) =>
  act(() => applyEvent(nodeEvent(type, nodeId)));

const selectInSdk = (ids: string[]) => act(() => useStore.setState({ selectedNodesIds: ids }));

describe('DecisionWaitingSnackbar', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let reactFlowStore: { getState: () => ReactFlowState } | undefined;

  function StoreProbe() {
    reactFlowStore = useStoreApi();
    return null;
  }

  beforeEach(() => {
    snackbars.shown.length = 0;
    snackbars.closed.clear();
    resetExecution();
    setExecutionStarted('exec-1', '/stream');
    useStore.setState({ nodes: [decisionNode('human-1', 'Review Refund'), decisionNode('human-2', 'Review Tone')] });
    const flowNodes: Node[] = [
      { id: 'human-1', position: { x: 0, y: 0 }, data: {} },
      { id: 'other', position: { x: 300, y: 0 }, data: {}, selected: true },
    ];
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <StrictMode>
          <ReactFlowProvider defaultNodes={flowNodes}>
            <StoreProbe />
            <DecisionWaitingSnackbar />
          </ReactFlowProvider>
        </StrictMode>,
      ),
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useStore.setState({ nodes: [], selectedNodesIds: [] });
  });

  it('says nothing while no node waits', () => {
    expect(open()).toHaveLength(0);
  });

  it('names the waiting node, stays until it is closed, and selects the node on Decide', () => {
    apply('node_waiting', 'human-1');

    const snackbar = onlyOpen();
    expect(snackbar).toMatchObject({
      variant: 'info',
      title: 'Waiting for decision',
      subtitle: 'Review Refund',
      buttonLabel: 'Decide',
      autoHideDuration: null,
    });

    act(() => snackbar.onButtonClick?.());

    const selected = reactFlowStore
      ?.getState()
      .nodes.filter((node) => node.selected)
      .map((node) => node.id);
    expect(selected).toEqual(['human-1']);
  });

  // In the app the SDK copies a React Flow selection into its store; here the store is set directly.
  it('steps aside while a waiting node is selected, however it was selected, and comes back after', () => {
    apply('node_waiting', 'human-1');

    selectInSdk(['human-1']);
    expect(open()).toHaveLength(0);

    selectInSdk(['other']);
    expect(onlyOpen().title).toBe('Waiting for decision');
  });

  it('shows each time under a new key, so one still closing cannot swallow the next', () => {
    apply('node_waiting', 'human-1');
    const first = onlyOpen().key;

    selectInSdk(['human-1']);
    selectInSdk([]);

    expect(onlyOpen().key).not.toBe(first);
  });

  it('stays closed for the same wait and comes back when another node parks', () => {
    apply('node_waiting', 'human-1');
    act(() => onlyOpen().onClose?.());
    expect(open()).toHaveLength(0);

    apply('node_waiting', 'human-2');
    expect(onlyOpen().title).toBe('2 decisions are waiting');
  });

  it('comes back when the same node parks again', () => {
    apply('node_waiting', 'human-1');
    act(() => onlyOpen().onClose?.());
    apply('node_completed', 'human-1');

    apply('node_waiting', 'human-1');
    expect(onlyOpen().title).toBe('Waiting for decision');
  });

  // One button cannot know which of the nodes the person wants.
  it('counts several waits and offers no Decide', () => {
    apply('node_waiting', 'human-1');
    apply('node_waiting', 'human-2');

    const snackbar = onlyOpen();
    expect(snackbar.title).toBe('2 decisions are waiting');
    expect(snackbar.buttonLabel).toBeUndefined();
    expect(snackbar.onButtonClick).toBeUndefined();
  });

  it('leaves once the wait ends', () => {
    apply('node_waiting', 'human-1');
    apply('node_completed', 'human-1');

    expect(open()).toHaveLength(0);
  });
});
