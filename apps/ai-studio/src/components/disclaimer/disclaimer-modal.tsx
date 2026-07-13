import { Info, X } from '@phosphor-icons/react';
import { useState } from 'react';

import styles from './disclaimer-modal.module.css';

import { useRightPanelAnchor } from '../../hooks/use-right-panel-anchor';
import { useExecutionStore } from '../../stores/use-execution-store';

const STORAGE_KEY = 'ai-studio:disclaimer-acknowledged';

function hasAcknowledged(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function DisclaimerModal() {
  const [open, setOpen] = useState(() => !hasAcknowledged());
  const logVisible = useExecutionStore((state) => state.events.length > 0 || state.status !== 'idle');
  const { panelExpanded } = useRightPanelAnchor();

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // storage unavailable
    }
    setOpen(false);
  }

  if (!open) {
    if (logVisible || panelExpanded) return null;

    return (
      <button className={styles['reopen']} onClick={() => setOpen(true)} aria-label="About this demo">
        <Info size={20} weight="bold" />
      </button>
    );
  }

  return (
    <div className={styles['overlay']} role="presentation" onClick={dismiss}>
      <div
        className={styles['card']}
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclaimer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className={styles['close']} onClick={dismiss} aria-label="Close">
          <X size={18} weight="bold" />
        </button>

        <div className={styles['heading']}>
          <div className={styles['icon']}>
            <Info size={22} weight="fill" />
          </div>
          <h2 className={styles['title']} id="disclaimer-title">
            Welcome to AI Studio
          </h2>
        </div>

        <div className={styles['body']}>
          <p>
            This is a live demo of <strong>Workflow Builder</strong> — a toolkit for building visual, AI-powered
            workflow editors.
          </p>
          <p>
            The workflows here run for real: every AI step calls a live model through <strong>OpenRouter</strong>.
          </p>
          <p>
            It is <strong>not</strong> a place to test or benchmark AI models. The model is just the engine — the point
            is to show what you can build with Workflow Builder. To keep the demo open to everyone, runs are
            rate-limited.
          </p>
        </div>

        <button className={styles['cta']} onClick={dismiss}>
          Start exploring
        </button>
      </div>
    </div>
  );
}
