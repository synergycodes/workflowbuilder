import { PlayIcon } from '@phosphor-icons/react';
import { EditorHeaderControlsContent } from '@workflowbuilder/sdk';

import { runFromCanvas } from './run';
import { isRunBusy, isRunFailure, useRunStore } from './run-store';

// Only the button goes in the editor header; the run's status sits in the run panel.
export function RunButton() {
  const phase = useRunStore((state) => state.phase);
  const busy = isRunBusy(phase);

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
