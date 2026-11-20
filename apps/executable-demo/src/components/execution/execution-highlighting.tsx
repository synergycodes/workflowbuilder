import { getStoreEdges } from '@workflowbuilder/sdk';
import { useEffect, useMemo } from 'react';

import type { NodeExecutionState } from '../../stores/use-execution-store';
import { useExecutionStore } from '../../stores/use-execution-store';

const STYLE_ID = 'executable-demo-execution-highlighting';

export function buildExecutionHighlightCss(
  nodeStates: Record<string, NodeExecutionState>,
  edges: ReturnType<typeof getStoreEdges>,
): string {
  const nodeIdsByStatus: Record<'waiting' | 'running' | 'completed' | 'failed' | 'skipped', string[]> = {
    waiting: [],
    running: [],
    completed: [],
    failed: [],
    skipped: [],
  };
  const reached = new Set<string>();

  for (const [nodeId, state] of Object.entries(nodeStates)) {
    if (state.status === 'idle') continue;
    nodeIdsByStatus[state.status].push(nodeId);
    if (state.status !== 'skipped') reached.add(nodeId);
  }

  const activeEdges = edges
    .filter((edge) => reached.has(edge.source) && reached.has(edge.target))
    .map((edge) => `g:not(.selected) > [data-edge-id="${CSS.escape(edge.id)}"]`);

  let css = '';
  if (activeEdges.length > 0) {
    css += `${activeEdges.join(',')} { stroke: var(--execution-active) !important; stroke-width: 5 !important; }`;
  }

  for (const [status, nodeIds] of Object.entries(nodeIdsByStatus)) {
    if (nodeIds.length === 0) continue;
    const selectors = nodeIds.map(
      (nodeId) => `[data-id="${CSS.escape(nodeId)}"]:not(.selected) [class*="node-panel-wrapper"] > div`,
    );
    css += `${selectors.join(',')} { box-shadow: 0 0 0 0.25rem var(--execution-${status}) !important; }`;
  }
  return css;
}

export function ExecutionHighlighting() {
  const nodeStates = useExecutionStore((state) => state.nodeStates);
  const css = useMemo(() => buildExecutionHighlightCss(nodeStates, getStoreEdges()), [nodeStates]);

  useEffect(() => {
    let style = document.querySelector(`#${STYLE_ID}`);
    if (!(style instanceof HTMLStyleElement)) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.append(style);
    }
    style.textContent = css;
    return () => style?.remove();
  }, [css]);

  return null;
}
