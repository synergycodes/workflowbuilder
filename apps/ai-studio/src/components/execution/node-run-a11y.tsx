import { useStore } from '@workflowbuilder/sdk';
import { useEffect, useRef, useState } from 'react';

import styles from './node-run-a11y.module.css';

import { useExecutionStore } from '../../stores/use-execution-store';
import { nodeLabel } from './log-panel';
import { nodeRunPreset } from './node-run-status';

/** Puts each node's run status into its accessible name and announces status changes. */
export function NodeRunA11y() {
  const executionId = useExecutionStore((state) => state.executionId);
  const nodeStates = useExecutionStore((state) => state.nodeStates);
  // Also re-applies the names once a renamed or remounted node renders.
  const nodes = useStore((state) => state.nodes);
  const [announcement, setAnnouncement] = useState('');
  const previous = useRef({ executionId, nodeStates });

  // Set on the DOM: `node.ariaLabel` in the store would be saved with the workflow and enter undo history.
  useEffect(() => {
    const named: HTMLElement[] = [];
    for (const element of document.querySelectorAll<HTMLElement>('.react-flow__node')) {
      const nodeId = element.dataset['id'] ?? '';
      const preset = nodeRunPreset(nodeStates[nodeId]);
      if (!preset) continue;
      element.setAttribute('aria-label', `${nodeLabel(useStore.getState(), nodeId)}, ${preset.badge.label}`);
      named.push(element);
    }
    return () => {
      for (const element of named) element.removeAttribute('aria-label');
    };
  }, [nodeStates, nodes]);

  useEffect(() => {
    const before = previous.current;
    previous.current = { executionId, nodeStates };
    // A run that arrives whole (a reload's snapshot) is not news.
    if (before.executionId !== executionId) return;

    const changes = Object.entries(nodeStates).flatMap(([nodeId, state]) => {
      const preset = nodeRunPreset(state);
      return preset && before.nodeStates[nodeId]?.status !== state.status
        ? [`${nodeLabel(useStore.getState(), nodeId)}, ${preset.badge.label}`]
        : [];
    });
    if (changes.length > 0) setAnnouncement(changes.join('. '));
  }, [executionId, nodeStates]);

  return (
    <div role="status" aria-live="polite" className={styles['live-region']}>
      {announcement}
    </div>
  );
}
