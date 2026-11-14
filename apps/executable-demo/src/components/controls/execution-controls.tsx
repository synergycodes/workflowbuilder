import { Icon } from '@workflowbuilder/sdk';
import { NavButton } from '@workflowbuilder/ui';
import { useState } from 'react';

import styles from './execution-controls.module.css';

import { useBackendExecution } from '../../hooks/use-backend-execution';
import { isTerminalStatus } from '../../stores/use-execution-store';
import { PayloadModal } from '../payload/payload-modal';

export function ExecutionControls() {
  const { executeFromCanvas, cancel, reset, status } = useBackendExecution();
  const [isPayloadOpen, setPayloadOpen] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const isRunning = status === 'pending' || status === 'running' || status === 'cancelling';
  const isDone = isTerminalStatus(status) || status === 'disconnected';

  async function run(payload: Record<string, unknown>) {
    setSubmitting(true);
    setError(undefined);
    try {
      await executeFromCanvas(payload);
      setPayloadOpen(false);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : String(error_));
    } finally {
      setSubmitting(false);
    }
  }

  async function requestCancel() {
    setError(undefined);
    try {
      await cancel();
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : String(error_));
    }
  }

  return (
    <>
      <div className={styles['container']} aria-label="Execution controls">
        <div className={styles['panel']}>
          {!isRunning && (
            <NavButton
              onClick={() => {
                setError(undefined);
                setPayloadOpen(true);
              }}
              tooltip="Run workflow"
            >
              <Icon name="Play" />
            </NavButton>
          )}
          {isRunning && (
            <NavButton
              onClick={() => void requestCancel()}
              tooltip={status === 'cancelling' ? 'Cancellation requested' : 'Cancel execution'}
              disabled={status === 'cancelling'}
            >
              <Icon name="Stop" />
            </NavButton>
          )}
          {isDone && (
            <NavButton
              onClick={() => {
                setError(undefined);
                reset();
              }}
              tooltip="Reset execution"
            >
              <Icon name="ArrowCounterClockwise" />
            </NavButton>
          )}
          <span className={styles['status']} aria-live="polite">
            {status}
          </span>
        </div>
        {error && !isPayloadOpen && (
          <div className={styles['error']} role="alert">
            {error}
          </div>
        )}
      </div>
      <PayloadModal
        open={isPayloadOpen}
        busy={isSubmitting}
        error={error}
        onClose={() => setPayloadOpen(false)}
        onRun={run}
      />
    </>
  );
}
