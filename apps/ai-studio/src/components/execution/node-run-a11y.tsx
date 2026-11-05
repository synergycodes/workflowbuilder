import { useStore } from '@workflowbuilder/sdk';
import { useEffect, useRef, useState } from 'react';

import styles from './node-run-a11y.module.css';

import { useExecutionStore } from '../../stores/use-execution-store';
import { nodeLabel } from '../../utils/node-label';
import { nodeRunPreset } from './node-run-status';

/** Announces node run status changes; `NodeRunOverlay` puts the status into each node's accessible name. */
export function NodeRunA11y() {
  const events = useExecutionStore((state) => state.events);
  const nodeStates = useExecutionStore((state) => state.nodeStates);
  const executionId = useExecutionStore((state) => state.executionId);
  const [announcement, setAnnouncement] = useState({ text: '', key: 0 });
  const previous = useRef({ events, nodeStates, executionId });

  useEffect(() => {
    const before = previous.current;
    previous.current = { events, nodeStates, executionId };
    if (executionId !== before.executionId) {
      setAnnouncement(({ key }) => ({ text: '', key }));
      return;
    }
    // The first frame of a run replays its history (reload); later frames, reconnect snapshots included, are news.
    if (before.events.length === 0) return;

    const changes = Object.entries(nodeStates).flatMap(([nodeId, state]) => {
      const preset = nodeRunPreset(state);
      return preset && before.nodeStates[nodeId]?.status !== state.status
        ? [`${nodeLabel(useStore.getState(), nodeId)}, ${preset.badge.label}`]
        : [];
    });
    if (changes.length > 0) setAnnouncement(({ key }) => ({ text: changes.join('. '), key: key + 1 }));
  }, [events, nodeStates, executionId]);

  return (
    <div role="status" aria-live="polite" className={styles['live-region']}>
      {/* A new element per announcement, so the same text twice in a row is read again. */}
      <span key={announcement.key}>{announcement.text}</span>
    </div>
  );
}
