// Edge highlighting — mirrors flow runner pattern (appendCSS approach)
import { getStoreEdges } from '@workflowbuilder/sdk';
import { useEffect, useMemo } from 'react';

import './highlighting.css';

import type { NodeExecutionState } from '../../stores/use-execution-store';
import { useExecutionStore } from '../../stores/use-execution-store';

const appendCSS = (stylesheetId: string, styleContent: string) => {
  const elementId = `us-css-${stylesheetId}`.trim();
  const element = document.querySelector(`#${elementId}`);

  if (element) {
    element.innerHTML = styleContent;
    return;
  }

  const styleElement = document.createElement('style');
  styleElement.setAttribute('id', elementId);
  styleElement.innerHTML = styleContent;
  document.head.append(styleElement);
};

const edgeSelector = (edgeId: string) => `g:not(.selected) > [data-edge-id="${edgeId}"]`;

export function ExecutionHighlighting() {
  const nodeStates = useExecutionStore((s) => s.nodeStates);

  const cssContent = useMemo(() => {
    const nonIdleNodes = new Set<string>();

    for (const [nodeId, state] of Object.entries(nodeStates) as [string, NodeExecutionState][]) {
      if (state.status !== 'idle' && state.status !== 'skipped') {
        nonIdleNodes.add(nodeId);
      }
    }

    // Collect edges where both source and target have a non-idle status
    const activeEdgeIds: string[] = [];

    if (nonIdleNodes.size > 0) {
      const edges = getStoreEdges();

      for (const edge of edges) {
        if (nonIdleNodes.has(edge.source) && nonIdleNodes.has(edge.target)) {
          activeEdgeIds.push(edge.id);
        }
      }
    }

    if (activeEdgeIds.length === 0) return '';

    return `${activeEdgeIds.map(edgeSelector).join(', ')} {
        stroke: var(--ai-studio-edge-color--active) !important;
        stroke-width: 5 !important;
      }`;
  }, [nodeStates]);

  useEffect(() => {
    appendCSS('ai-studio-highlighting', cssContent);
  }, [cssContent]);

  return null;
}
