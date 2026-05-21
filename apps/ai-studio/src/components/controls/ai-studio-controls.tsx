import { NavButton } from '@synergycodes/overflow-ui';
import { Icon, getStoreEdges, getStoreNodes } from '@workflowbuilder/sdk';
import clsx from 'clsx';
import { useCallback } from 'react';

import styles from './ai-studio-controls.module.css';

import { useBackendExecution } from '../../hooks/use-backend-execution';
import { useHasNodeTypeInDiagram } from '../../hooks/use-has-node-type-in-diagram';

export function AiStudioControls() {
  const { executeFromCanvas, cancel, reset, status } = useBackendExecution();
  const shouldShowControls = useHasNodeTypeInDiagram('ai-studio/trigger');

  const handleExecute = useCallback(async () => {
    const nodes = getStoreNodes();
    const edges = getStoreEdges();

    const triggerNode = nodes.find((n) => n.data.type === 'ai-studio/trigger');
    const inputPrompt = (triggerNode?.data.properties as { inputPrompt?: string })?.inputPrompt ?? '';
    const triggerPayload = inputPrompt ? { input: inputPrompt } : {};

    try {
      await executeFromCanvas(nodes, edges, triggerPayload);
    } catch (error) {
      console.error('Execution failed:', error);
    }
  }, [executeFromCanvas]);

  const isRunning = status === 'pending' || status === 'running';
  const isDone = status === 'completed' || status === 'failed' || status === 'cancelled';

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
        {isDone && (
          <NavButton onClick={reset} tooltip="Reset">
            <Icon name="ArrowCounterClockwise" />
          </NavButton>
        )}
      </div>
    </div>
  );
}
