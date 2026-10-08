import { ArrowSquareOutIcon, PlayIcon } from '@phosphor-icons/react';

import { runFromCanvas } from './run';
import { useRunStore } from './run-store';

// Mounted in the SDK's OptionalAppBarControls slot.
export function RunButton() {
  const phase = useRunStore((state) => state.phase);
  const amount = useRunStore((state) => state.amount);
  const message = useRunStore((state) => state.message);
  const temporalUiUrl = useRunStore((state) => state.temporalUiUrl);
  const busy = phase === 'starting' || phase === 'running';

  return (
    <div className="run-controls">
      <button type="button" className="run-button" disabled={busy} onClick={() => void runFromCanvas()}>
        <PlayIcon size={16} weight="fill" />
        {busy ? 'Running on Temporal…' : 'Run on Temporal'}
      </button>
      {phase !== 'idle' && (
        <span className={`run-phase run-phase--${phase}`}>
          {amount === undefined ? '' : `amount ${amount} · `}
          {message ?? phase}
        </span>
      )}
      {temporalUiUrl && (
        <a className="run-link" href={temporalUiUrl} target="_blank" rel="noreferrer">
          Temporal UI <ArrowSquareOutIcon size={14} />
        </a>
      )}
    </div>
  );
}
