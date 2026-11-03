import { ArrowSquareOutIcon } from '@phosphor-icons/react';

import { type RunPhase, useRunStore } from './run-store';

const PHASE_LABEL: Record<RunPhase, string> = {
  idle: '',
  starting: 'Starting',
  running: 'Running',
  completed: 'Completed',
  incomplete: 'Incomplete',
  failed: 'Failed',
  cancelled: 'Cancelled',
  error: 'Error',
};

// Shows the last run until the next one starts.
export function RunPanel() {
  const phase = useRunStore((state) => state.phase);
  const temporalUiUrl = useRunStore((state) => state.temporalUiUrl);
  if (phase === 'idle') return null;

  return (
    <aside className="run-panel" aria-label="Temporal run">
      <span className={`run-status run-status--${phase}`}>{PHASE_LABEL[phase]}</span>
      {temporalUiUrl && (
        <a className="run-link" href={temporalUiUrl} target="_blank" rel="noreferrer">
          Temporal UI <ArrowSquareOutIcon size={14} />
        </a>
      )}
    </aside>
  );
}
