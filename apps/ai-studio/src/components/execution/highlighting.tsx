// Node shadow + edge highlighting — mirrors flow runner pattern (appendCSS approach)
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

const nodeSelector = (nodeId: string) => `[data-id="${nodeId}"]:not(.selected) [class*="node-panel-wrapper"] > div`;
const edgeSelector = (edgeId: string) => `g:not(.selected) > [data-edge-id="${edgeId}"]`;

export function ExecutionHighlighting() {
  const nodeStates = useExecutionStore((s) => s.nodeStates);

  const cssContent = useMemo(() => {
    const byStatus = { running: [] as string[], completed: [] as string[], failed: [] as string[] };
    const nonIdleNodes = new Set<string>();

    for (const [nodeId, state] of Object.entries(nodeStates) as [string, NodeExecutionState][]) {
      if (state.status !== 'idle') {
        nonIdleNodes.add(nodeId);
      }

      switch (state.status) {
        case 'running': {
          byStatus.running.push(nodeId);
          break;
        }
        case 'completed': {
          byStatus.completed.push(nodeId);
          break;
        }
        case 'failed': {
          byStatus.failed.push(nodeId);
          break;
        }
        // No default
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

    let css = '';

    if (activeEdgeIds.length > 0) {
      css += `${activeEdgeIds.map(edgeSelector).join(', ')} {
        stroke: var(--ai-studio-edge-color--active) !important;
        stroke-width: 5 !important;
      }`;
    }

    if (byStatus.running.length > 0) {
      css += `${byStatus.running.map(nodeSelector).join(', ')} { box-shadow: var(--ai-studio-node-shadow--active) !important; }`;
    }

    if (byStatus.completed.length > 0) {
      css += `${byStatus.completed.map(nodeSelector).join(', ')} { box-shadow: var(--ai-studio-node-shadow--completed) !important; }`;
    }

    if (byStatus.failed.length > 0) {
      css += `${byStatus.failed.map(nodeSelector).join(', ')} { box-shadow: var(--ai-studio-node-shadow--failed) !important; }`;
    }

    return css;
  }, [nodeStates]);

  useEffect(() => {
    appendCSS('ai-studio-highlighting', cssContent);
  }, [cssContent]);

  return null;
}
