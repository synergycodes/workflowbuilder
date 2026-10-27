import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import { EditorHeaderControlsContent, setStoreEdges, setStoreNodes, useFitView } from '@workflowbuilder/sdk';

import { defaultDiagram } from '../diagram';
import { runCleared, useRunStore } from '../execution/run-store';

const CONFIRMATION = 'Discard the diagram on the canvas and load the one this sample ships with?';

// Mounted through the SDK's OptionalAppChildren slot and shown in the editor header, beside the
// Run button.
export function ResetButton() {
  const phase = useRunStore((state) => state.phase);
  const fitView = useFitView();
  const busy = phase === 'starting' || phase === 'running';

  function reset() {
    if (!globalThis.confirm(CONFIRMATION)) return;
    const { nodes, edges } = defaultDiagram();
    setStoreNodes(nodes);
    setStoreEdges(edges);
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
