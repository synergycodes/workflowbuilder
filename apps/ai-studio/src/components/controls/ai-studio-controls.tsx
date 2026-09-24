import { Icon, getStoreEdges, getStoreNodes } from '@workflowbuilder/sdk';
import { NavButton } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useCallback, useState } from 'react';

import styles from './ai-studio-controls.module.css';

import { useBackendExecution } from '../../hooks/use-backend-execution';
import { useHasStartNode } from '../../hooks/use-has-start-node';
import { useRunLocksCanvas } from '../../hooks/use-run-locks-canvas';

export function AiStudioControls() {
  const { executeFromCanvas, cancel, reset, status, executionId } = useBackendExecution();
  const shouldShowControls = useHasStartNode();
  // A start waits for the backend; a second one meanwhile would leave two runs streaming into one view.
  const [isStarting, setIsStarting] = useState(false);
  useRunLocksCanvas();

  const handleExecute = useCallback(async () => {
    const nodes = getStoreNodes();
    const edges = getStoreEdges();

    const startNode = nodes.find((n) => n.data.isStartNode);
    const inputPrompt = (startNode?.data.properties as { inputPrompt?: string })?.inputPrompt ?? '';
    const triggerPayload = inputPrompt ? { input: inputPrompt } : {};

    setIsStarting(true);
    try {
      await executeFromCanvas(nodes, edges, triggerPayload);
    } catch (error) {
      console.error('Execution failed:', error);
    } finally {
      setIsStarting(false);
    }
  }, [executeFromCanvas]);

  const isRunning = status === 'pending' || status === 'running' || status === 'waiting';
  const isActive = isStarting || isRunning;
  // A shown run keeps the canvas read-only until Reset, so every state that is not running offers it.
  const showsRun = executionId !== undefined;

  return (
    <div
      className={clsx(styles['container'], {
        [styles['container--visible']]: shouldShowControls || showsRun,
      })}
    >
      <div className={styles['panel']}>
        {isActive ? (
          // There is no run to cancel until the backend names it.
          <NavButton onClick={cancel} disabled={isStarting}>
            <Icon name="Stop" />
            Stop
          </NavButton>
        ) : (
          <NavButton onClick={handleExecute}>
            <Icon name="Play" />
            Run
          </NavButton>
        )}
        {showsRun && !isActive && (
          <NavButton onClick={reset} tooltip="Reset">
            <Icon name="ArrowCounterClockwise" />
          </NavButton>
        )}
      </div>
    </div>
  );
}
