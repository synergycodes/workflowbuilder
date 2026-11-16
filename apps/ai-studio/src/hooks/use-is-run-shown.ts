import { useExecutionStore } from '../stores/use-execution-store';

/** From Run until Reset the sidebar belongs to the run, even if the app bar lifts the canvas lock. */
export function useIsRunShown() {
  return useExecutionStore((state) => state.executionId !== undefined);
}
