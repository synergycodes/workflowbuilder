import { Icon, getStoreEdges, getStoreNodes } from '@workflowbuilder/sdk';
import { NavButton } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useCallback } from 'react';

import styles from './ai-studio-controls.module.css';

import { useBackendExecution } from '../../hooks/use-backend-execution';
import { useHasStartNode } from '../../hooks/use-has-start-node';

export function AiStudioControls() {
  const { executeFromCanvas, cancel, reset, status } = useBackendExecution();
  const shouldShowControls = useHasStartNode();

  const handleExecute = useCallback(async () => {
    const nodes = getStoreNodes();
    const edges = getStoreEdges();

    const startNode = nodes.find((n) => n.data.isStartNode);
    const inputPrompt = (startNode?.data.properties as { inputPrompt?: string })?.inputPrompt ?? '';
    const triggerPayload = inputPrompt ? { input: inputPrompt } : {};

    try {
      await executeFromCanvas(nodes, edges, triggerPayload);
    } catch (error) {
      console.error('Execution failed:', error);
    }
  }, [executeFromCanvas]);

  const isRunning = status === 'pending' || status === 'running';
  const isDone = status === 'completed' || status === 'incomplete' || status === 'failed' || status === 'cancelled';

  return (
    <div
      className={clsx(styles['container'], {
        [styles['container--visible']]: shouldShowControls,
      })}
    >
      <div className={styles['panel']}>
        {isRunning ? (
          <NavButton
            aria-label="Cancel execution"
            onClick={cancel}
            tooltip="Cancel execution"
            prefixIcon={<Icon name="Stop" />}
          />
        ) : (
          <NavButton
            aria-label="Execute (backend)"
            onClick={handleExecute}
            tooltip="Execute (backend)"
            disabled={isRunning}
            prefixIcon={<Icon name="Play" />}
          />
        )}
        {isDone && (
          <NavButton
            aria-label="Reset"
            onClick={reset}
            tooltip="Reset"
            prefixIcon={<Icon name="ArrowCounterClockwise" />}
          />
        )}
      </div>
    </div>
  );
}
