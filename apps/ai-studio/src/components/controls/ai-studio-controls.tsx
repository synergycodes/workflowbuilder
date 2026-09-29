import { Icon, getStoreEdges, getStoreNodes } from '@workflowbuilder/sdk';
import { Button, NavButton } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useCallback, useState } from 'react';

import styles from './ai-studio-controls.module.css';

import { useBackendExecution } from '../../hooks/use-backend-execution';
import { useHasStartNode } from '../../hooks/use-has-start-node';
import { useRunLocksCanvas } from '../../hooks/use-run-locks-canvas';
import { addNotice, useDiagramSourceStore } from '../../stores/use-diagram-source-store';
import { isRunAlive, useExecutionStore } from '../../stores/use-execution-store';
import { leaveRunView } from '../../utils/open-from-url/address-execution-id';

export function AiStudioControls() {
  const { executeFromCanvas, cancel, reset, status } = useBackendExecution();
  const hasStartNode = useHasStartNode();
  // A run outlives its trigger node, so Stop and Reset stay reachable after it is deleted.
  const shouldShowControls = hasStartNode || status !== 'idle';
  const isStopRequested = useExecutionStore((state) => state.isStopRequested);
  // A start waits for the backend; a second one meanwhile would leave two runs streaming into one view.
  const [isStarting, setIsStarting] = useState(false);
  useRunLocksCanvas();
  const isRunView = useDiagramSourceStore((state) => state.isRunView);
  const targetWorkflowId = useDiagramSourceStore((state) => state.targetWorkflowId);
  // The run view's canvas is that run's graph, and Run would save it over the workflow's newer draft.
  const canRun = hasStartNode && !(isRunView && targetWorkflowId !== undefined);

  const handleReset = useCallback(() => {
    reset();
    if (isRunView) leaveRunView();
  }, [reset, isRunView]);

  const handleExecute = useCallback(async () => {
    const nodes = getStoreNodes();
    const edges = getStoreEdges();

    const startNode = nodes.find((n) => n.data.isStartNode);
    const inputPrompt = (startNode?.data.properties as { inputPrompt?: string })?.inputPrompt ?? '';
    const triggerPayload = inputPrompt ? { input: inputPrompt } : {};

    setIsStarting(true);
    try {
      await executeFromCanvas(nodes, edges, triggerPayload, targetWorkflowId);
    } catch (error) {
      console.error('Execution failed:', error);
      addNotice(`The run did not start: ${error instanceof Error ? error.message : String(error)}.`, 'error');
    } finally {
      setIsStarting(false);
    }
  }, [executeFromCanvas, targetWorkflowId]);

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
        {isRunning || isStarting ? (
          // There is no run to cancel until the backend names it.
          <Button
            className={styles['run-stop-button']}
            variant="ghost-critical"
            size="s"
            onClick={cancel}
            disabled={isStarting}
            prefixIcon={<Icon name="Stop" />}
          >
            Stop
          </Button>
        ) : canRun ? (
          <Button
            className={styles['run-stop-button']}
            variant="primary"
            size="s"
            onClick={handleExecute}
            prefixIcon={<Icon name="Play" />}
          >
            Run
          </Button>
        ) : null}
        {isDoneOrStuck && !isStarting && (
          <NavButton
            size="s"
            aria-label={resetTooltip}
            onClick={handleReset}
            tooltip={resetTooltip}
            prefixIcon={<Icon name="ArrowCounterClockwise" />}
          />
        )}
      </div>
    </div>
  );
}
