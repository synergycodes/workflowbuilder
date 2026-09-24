import { Icon, getStoreEdges, getStoreNodes } from '@workflowbuilder/sdk';
import { NavButton } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useCallback } from 'react';

import styles from './ai-studio-controls.module.css';

import { useBackendExecution } from '../../hooks/use-backend-execution';
import { useHasStartNode } from '../../hooks/use-has-start-node';
import { isRunAlive, useExecutionStore } from '../../stores/use-execution-store';

export function AiStudioControls() {
  const { executeFromCanvas, cancel, reset, status } = useBackendExecution();
  const hasStartNode = useHasStartNode();
  // A run outlives its trigger node, so Stop and Reset stay reachable after it is deleted.
  const shouldShowControls = hasStartNode || status !== 'idle';
  const isStopRequested = useExecutionStore((state) => state.isStopRequested);

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

  const isRunning = isRunAlive(status);
  const isDone = status !== 'idle' && !isRunning;
  // Any Stop may never resolve, so asking is enough to offer Reset; `cancelling` covers one asked before a reload.
  const hasAskedToStop = isStopRequested || status === 'cancelling';
  const isDoneOrStuck = isDone || hasAskedToStop;
  const resetTooltip =
    !isDone && hasAskedToStop ? 'Reset without cancelling: the run may still be running on the server' : 'Reset';

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
        ) : hasStartNode ? (
          <NavButton
            aria-label="Execute (backend)"
            onClick={handleExecute}
            tooltip="Execute (backend)"
            prefixIcon={<Icon name="Play" />}
          />
        ) : null}
        {isDoneOrStuck && (
          <NavButton
            aria-label={resetTooltip}
            onClick={reset}
            tooltip={resetTooltip}
            prefixIcon={<Icon name="ArrowCounterClockwise" />}
          />
        )}
      </div>
    </div>
  );
}
