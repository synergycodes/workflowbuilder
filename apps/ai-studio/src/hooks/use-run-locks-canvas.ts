import { useWorkflowBuilderActions } from '@workflowbuilder/sdk';
import { useEffect } from 'react';

import { useExecutionStore } from '../stores/use-execution-store';

/** From the start of a run until Reset the canvas is read-only, so it stays the graph the run executes. */
export function useRunLocksCanvas() {
  const showsRun = useExecutionStore((state) => state.executionId !== undefined);
  const { setReadOnly } = useWorkflowBuilderActions();

  useEffect(() => {
    setReadOnly(showsRun);
  }, [showsRun, setReadOnly]);
}
