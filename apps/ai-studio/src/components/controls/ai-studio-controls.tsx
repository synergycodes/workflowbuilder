import { Icon, getStoreDataForIntegration } from '@workflowbuilder/sdk';
import { Button, NavButton } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useCallback, useState } from 'react';

import styles from './ai-studio-controls.module.css';

import { useBackendExecution } from '../../hooks/use-backend-execution';
import { useHasStartNode } from '../../hooks/use-has-start-node';
import { useRunLocksCanvas } from '../../hooks/use-run-locks-canvas';
import { isRunAlive, useExecutionStore } from '../../stores/use-execution-store';
import { addNotice } from '../../stores/use-notices-store';
import { leaveRunView } from '../../utils/open-from-url/address-execution-id';

type Props = {
  /** The link's workflow: Run saves the canvas into its draft before it runs. */
  workflowId?: string;
  /** The canvas shows a run's graph, saved nowhere: no Run, and Reset reloads the page without the run. */
  isRunView: boolean;
};

export function AiStudioControls({ workflowId, isRunView }: Props) {
  // A run view shows only its run: once the run is forgotten, the page reloads onto the workflow or the local draft.
  const { executeFromCanvas, cancel, reset, status } = useBackendExecution(isRunView ? leaveRunView : undefined);
  const hasStartNode = useHasStartNode();
  // A run outlives its trigger node, so Stop and Reset stay reachable after it is deleted.
  const shouldShowControls = hasStartNode || status !== 'idle';
  const isStopRequested = useExecutionStore((state) => state.isStopRequested);
  // A start waits for the backend; a second one meanwhile would leave two runs streaming into one view.
  const [isStarting, setIsStarting] = useState(false);
  useRunLocksCanvas();
  const canRun = hasStartNode && !isRunView;

  const handleExecute = useCallback(async () => {
    // The shape the editor's autosave sends, so its compare recognises Run's write.
    const { nodes, edges } = getStoreDataForIntegration();

    const startNode = nodes.find((n) => n.data.isStartNode);
    const inputPrompt = (startNode?.data.properties as { inputPrompt?: string })?.inputPrompt ?? '';
    const triggerPayload = inputPrompt ? { input: inputPrompt } : {};

    setIsStarting(true);
    try {
      await executeFromCanvas(nodes, edges, triggerPayload, workflowId);
    } catch (error) {
      console.error('Execution failed:', error);
      addNotice(`The run did not start: ${error instanceof Error ? error.message : String(error)}.`, 'error');
    } finally {
      setIsStarting(false);
    }
  }, [executeFromCanvas, workflowId]);

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
            onClick={reset}
            tooltip={resetTooltip}
            prefixIcon={<Icon name="ArrowCounterClockwise" />}
          />
        )}
      </div>
    </div>
  );
}
