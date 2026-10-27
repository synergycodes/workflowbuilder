import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import {
  EditorHeaderControlsContent,
  setStoreEdges,
  setStoreNodes,
  useFitView,
  useWorkflowBuilderActions,
} from '@workflowbuilder/sdk';

import { DIAGRAM_NAME, defaultDiagram } from '../diagram';
import { isRunBusy, runCleared, useRunStore } from '../execution/run-store';

const CONFIRMATION = 'Discard the diagram on the canvas and load the one this sample ships with?';

export function ResetButton() {
  const busy = useRunStore((state) => isRunBusy(state.phase));
  const fitView = useFitView();
  const { setWorkflowName } = useWorkflowBuilderActions();

  function reset() {
    if (!globalThis.confirm(CONFIRMATION)) return;
    const { nodes, edges } = defaultDiagram();
    setStoreNodes(nodes);
    setStoreEdges(edges);
    // Another app on this origin can leave its diagram, title included, in the SDK's localStorage key.
    setWorkflowName(DIAGRAM_NAME);
    runCleared();
    fitView();
  }

  // The editor keeps the canvas in localStorage and the SDK saves it when the tab closes, so
  // replacing the store is enough: the next visit opens the diagram this put back.
  return (
    <EditorHeaderControlsContent>
      <button type="button" className="reset-button" disabled={busy} onClick={reset}>
        <ArrowCounterClockwiseIcon size={16} />
        Reset
      </button>
    </EditorHeaderControlsContent>
  );
}
