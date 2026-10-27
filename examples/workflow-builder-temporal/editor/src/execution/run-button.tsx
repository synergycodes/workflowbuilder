import { PlayIcon } from '@phosphor-icons/react';
import { EditorHeaderControlsContent } from '@workflowbuilder/sdk';

import { runFromCanvas } from './run';
import { isRunFailure, useRunStore } from './run-store';

// Mounted through the SDK's OptionalAppChildren slot and shown in the editor header. Only the
// button lives there; the run's status sits in the run panel.
export function RunButton() {
  const phase = useRunStore((state) => state.phase);
  const busy = phase === 'starting' || phase === 'running';

  return (
    <EditorHeaderControlsContent>
      <div className="run-controls">
        <button
          type="button"
          className="run-button"
          title="Run the diagram on Temporal"
          disabled={busy}
          onClick={() => void runFromCanvas()}
        >
          <PlayIcon size={16} weight="fill" />
          {busy ? 'Running…' : 'Run'}
        </button>
        {/* Mounted while idle too: screen readers announce changes to a live region, not its arrival.
            A failure is announced by its snackbar, so it is left out here. */}
        <span role="status" className="visually-hidden">
          {phase === 'idle' || isRunFailure(phase) ? '' : phase}
        </span>
      </div>
    </EditorHeaderControlsContent>
  );
}
