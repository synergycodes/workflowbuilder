import { useWorkflowBuilderActions } from '@workflowbuilder/sdk';
import { useEffect } from 'react';

import { useExecutionStore } from '../stores/use-execution-store';

/** From the moment the backend starts a run until Reset the canvas is read-only, as the graph the run executes. */
export function useRunLocksCanvas() {
  const showsRun = useExecutionStore((state) => state.executionId !== undefined);
  const { setReadOnly } = useWorkflowBuilderActions();

  // Set only when a run appears or goes, so the SDK app bar's read-only switch lifts it: deliberate, as that switch
  // demonstrates the SDK and a product leaves it out. Import ignores read-only (follow-up: sdk-import-read-only).
  useEffect(() => {
    setReadOnly(showsRun);
  }, [showsRun, setReadOnly]);
}
