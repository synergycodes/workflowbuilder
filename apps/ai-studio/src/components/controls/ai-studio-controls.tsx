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
  const shouldShowControls = useHasStartNode();
  const isStopUnreachable = useExecutionStore((state) => state.isStopUnreachable);

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
  const isDone = status === 'completed' || status === 'incomplete' || status === 'failed' || status === 'cancelled';
  // A Stop that never landed, or one the server never resolves, would leave the user waiting forever.
  const hasAskedToStop = isStopUnreachable || status === 'cancelling';
  const isDoneOrStuck = isDone || hasAskedToStop;
  const resetTooltip = !isDone && hasAskedToStop ? 'Clear — the run may still be running on the server' : 'Reset';

  return (
    <div
      className={clsx(styles['container'], {
        [styles['container--visible']]: shouldShowControls,
      })}
    >
      <div className={styles['panel']}>
        {isRunning ? (
          <NavButton onClick={cancel} tooltip="Cancel execution">
            <Icon name="Stop" />
          </NavButton>
        ) : (
          <NavButton onClick={handleExecute} tooltip="Execute (backend)" disabled={isRunning}>
            <Icon name="Play" />
          </NavButton>
        )}
        {isDoneOrStuck && (
          <NavButton onClick={reset} tooltip={resetTooltip}>
            <Icon name="ArrowCounterClockwise" />
          </NavButton>
        )}
      </div>
    </div>
  );
}
