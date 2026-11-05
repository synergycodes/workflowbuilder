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
  let canvasNode: HTMLDivElement;

  beforeEach(() => {
    resetExecution();
    useStore.setState({ nodes: [node('agent-1', 'Draft reply')] });
    canvasNode = document.createElement('div');
    canvasNode.className = 'react-flow__node';
    canvasNode.dataset['id'] = 'agent-1';
    container = document.createElement('div');
    document.body.append(canvasNode, container);
    root = createRoot(container);
    act(() => root.render(<NodeRunA11y />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    canvasNode.remove();
    useStore.setState({ nodes: [] });
  });

  const liveRegion = () => container.querySelector('[aria-live="polite"]');

  it('names the node with its status while it has one, and drops the name on reset', () => {
    act(() => setExecutionStarted('exec-1', '/stream'));
    act(() => applyEvent(nodeEvent('node_started', 'agent-1')));
    expect(canvasNode.getAttribute('aria-label')).toBe('Draft reply, Running');

    act(() => applyEvent(nodeEvent('node_completed', 'agent-1')));
    expect(canvasNode.getAttribute('aria-label')).toBe('Draft reply, Completed');

    act(() => resetExecution());
    expect(canvasNode.hasAttribute('aria-label')).toBe(false);
  });

  it('announces only the nodes whose status changed', () => {
    act(() => useStore.setState({ nodes: [node('agent-1', 'Draft reply'), node('agent-2', 'Classify')] }));
    act(() => setExecutionStarted('exec-1', '/stream'));
    act(() => applyEvent(nodeEvent('node_started', 'agent-1')));
    expect(liveRegion()?.textContent).toBe('Draft reply, Running');

    act(() => applyEvent(nodeEvent('node_started', 'agent-2')));
    expect(liveRegion()?.textContent).toBe('Classify, Running');
  });
  it('stays silent when a reload replays a whole run', () => {
    act(() => applySnapshot(snapshotFrame('waiting', parkedRunHistory)));

    expect(liveRegion()?.textContent).toBe('');
  });
});
