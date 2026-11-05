import { useStore } from '@workflowbuilder/sdk';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyEvent, applySnapshot, resetExecution, setExecutionStarted } from '../../stores/use-execution-store';
import { nodeEvent, parkedRunHistory, snapshotFrame } from '../../test/execution-history';
import { NodeRunA11y } from './node-run-a11y';

const node = (id: string, label: string) => ({
  id,
  position: { x: 0, y: 0 },
  data: { type: 'ai-studio/ai-agent', icon: 'Robot' as const, properties: { label } },
});

describe('NodeRunA11y', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    resetExecution();
    useStore.setState({ nodes: [node('agent-1', 'Draft reply'), node('agent-2', 'Classify')] });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<NodeRunA11y />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useStore.setState({ nodes: [] });
  });

  const liveRegion = () => container.querySelector('[aria-live="polite"]');

  it('announces only the nodes whose status changed', () => {
    act(() => setExecutionStarted('exec-1', '/stream'));
    act(() => applyEvent(nodeEvent('node_started', 'agent-1')));
    expect(liveRegion()?.textContent).toBe('Draft reply, Running');

    act(() => applyEvent(nodeEvent('node_started', 'agent-2')));
    expect(liveRegion()?.textContent).toBe('Classify, Running');
  });

  it('announces the same text again in a new element when two same-named nodes change in turn', () => {
    act(() => useStore.setState({ nodes: [node('agent-1', 'AI Agent'), node('agent-2', 'AI Agent')] }));
    act(() => setExecutionStarted('exec-1', '/stream'));
    act(() => applyEvent(nodeEvent('node_started', 'agent-1')));
    const first = liveRegion()?.firstElementChild;

    act(() => applyEvent(nodeEvent('node_started', 'agent-2')));
    const second = liveRegion()?.firstElementChild;

    expect(second?.textContent).toBe('AI Agent, Running');
    expect(first?.textContent).toBe(second?.textContent);
    expect(second).not.toBe(first);
    expect(first?.isConnected).toBe(false);
  });

  it('stays silent when a reload replays a whole run', () => {
    act(() => applySnapshot(snapshotFrame('waiting', parkedRunHistory)));

    expect(liveRegion()?.textContent).toBe('');
  });
});
