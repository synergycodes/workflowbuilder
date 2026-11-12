import type { EdgePathProps } from '@workflowbuilder/sdk';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetExecution, setExecutionStarted, useExecutionStore } from '../../stores/use-execution-store';
import { EdgeRunPath } from './edge-run-state';

const nodeTypes: Record<string, string> = { trigger: 'ai-studio/trigger', branch: 'ai-studio/decision' };

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

  it('keeps the host after Reset', () => {
    setExecutionStarted('run-1', '/stream');
    useExecutionStore.setState({ nodeStates: { trigger: { status: 'completed' }, agent: { status: 'running' } } });
    resetExecution();

    render(edge('trigger', 'agent'));

    expect(container.querySelector('[data-host]')).not.toBeNull();
    expect(Path).not.toHaveBeenCalled();
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
});
