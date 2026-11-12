import type { EdgePathProps } from '@workflowbuilder/sdk';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { decisionPaletteItem } from '../../nodes/decision';
import { humanDecisionNodeType } from '../../nodes/human-decision';
import { reviewNodeType } from '../../nodes/review';
import { triggerPaletteItem } from '../../nodes/trigger';
import { resetExecution, setExecutionStarted, useExecutionStore } from '../../stores/use-execution-store';
import { EdgeRunPath } from './edge-run-state';

const nodeTypes: Record<string, string> = {
  trigger: triggerPaletteItem.type,
  branch: decisionPaletteItem.type,
  review: reviewNodeType,
  human: humanDecisionNodeType,
};

vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@xyflow/react')>()),
  useStore: <T,>(selector: (state: { nodeLookup: Map<string, { data: { type: string } }> }) => T) =>
    selector({
      nodeLookup: new Map(Object.entries(nodeTypes).map(([id, type]) => [id, { data: { type } }])),
    }),
}));

const edge = (source: string, target: string): EdgePathProps => ({
  edgeId: `${source}-${target}`,
  source,
  target,
  path: 'M0 0',
});

function startRunWithRunningAgent(source: string) {
  setExecutionStarted('run-1', '/stream');
  useExecutionStore.setState({
    status: 'running',
    nodeStates: { [source]: { status: 'completed' }, agent: { status: 'running' } },
  });
}

describe('EdgeRunPath', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const Path = vi.fn<(props: EdgePathProps) => null>(() => null);

  const render = (props: EdgePathProps) =>
    act(() =>
      root.render(
        <EdgeRunPath props={props} component={Path}>
          <i data-host />
        </EdgeRunPath>,
      ),
    );

  beforeEach(() => {
    resetExecution();
    Path.mockClear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('goes back to the host of a solid edge on Reset', () => {
    startRunWithRunningAgent('trigger');
    render(edge('trigger', 'agent'));
    expect(Path.mock.lastCall?.[0].runState).toBe('running');
    Path.mockClear();

    act(() => resetExecution());

    expect(container.querySelector('[data-host]')).not.toBeNull();
    expect(Path).not.toHaveBeenCalled();
  });

  it('drops the run state of a dashed edge on Reset and keeps its dash', () => {
    startRunWithRunningAgent('branch');
    render(edge('branch', 'agent'));
    expect(Path.mock.lastCall?.[0].runState).toBe('running');

    act(() => resetExecution());

    expect(Path.mock.lastCall?.[0]).toMatchObject({ runState: undefined, lineType: 'dashed' });
  });

  it('keeps the dashed line of a custom host while a run state is set', () => {
    setExecutionStarted('run-1', '/stream');
    useExecutionStore.setState({
      status: 'running',
      nodeStates: { trigger: { status: 'completed' }, agent: { status: 'completed' } },
    });

    render({ ...edge('trigger', 'agent'), lineType: 'dashed' });

    expect(Path.mock.lastCall?.[0]).toMatchObject({ runState: 'completed', lineType: 'dashed' });
  });

  it('passes the run state of a running target', () => {
    setExecutionStarted('run-1', '/stream');
    useExecutionStore.setState({
      status: 'running',
      nodeStates: { trigger: { status: 'completed' }, agent: { status: 'running' } },
    });

    render(edge('trigger', 'agent'));

    expect(Path.mock.lastCall?.[0]).toMatchObject({ runState: 'running', lineType: 'solid' });
  });

  it('draws an edge out of a decision dashed without a run', () => {
    render(edge('branch', 'agent'));

    expect(Path.mock.lastCall?.[0]).toMatchObject({ edgeId: 'branch-agent', lineType: 'dashed' });
    expect(Path.mock.lastCall?.[0].runState).toBeUndefined();
  });

  it.each(['review', 'human'])('renders the host for an edge out of a %s node without a run', (source) => {
    render(edge(source, 'agent'));

    expect(container.querySelector('[data-host]')).not.toBeNull();
    expect(Path).not.toHaveBeenCalled();
  });
});
