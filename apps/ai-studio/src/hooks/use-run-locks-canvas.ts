import { useWorkflowBuilderActions } from '@workflowbuilder/sdk';
import { useEffect } from 'react';

import { useExecutionStore } from '../stores/use-execution-store';

/** From the moment the backend starts a run until Reset the canvas is read-only, as the graph the run executes. */
export function useRunLocksCanvas() {
  const executionId = useExecutionStore((state) => state.executionId);
  const { setReadOnly } = useWorkflowBuilderActions();

  // Set whenever the shown run changes; the SDK app bar's read-only switch can lift it for that run, on purpose, as the
  // switch demonstrates the SDK. Import (follow-up: sdk-import-read-only) and the branching node's Add branch
  // (follow-up: sdk-node-buttons-read-only) ignore read-only.
  useEffect(() => {
    setReadOnly(executionId !== undefined);
  }, [executionId, setReadOnly]);
}
