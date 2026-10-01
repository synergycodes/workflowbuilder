import { Component, type ReactNode } from 'react';

import styles from './full-page.module.css';

import { haltSaves } from '../../adapters/save-workflow-draft';
import { OpenError } from '../../app/open-error';

type Exit = { label: string; href: string };

// Only a run that failed under a workflow link goes back to the workflow. Anything else goes to the local
// draft, so a workflow draft that throws while drawing cannot send the person back into it.
function exitFor(error: unknown): Exit {
  const address = new URL(globalThis.location.href);
  if (error instanceof OpenError && error.what === 'run' && address.searchParams.has('workflowId')) {
    address.searchParams.delete('executionId');
    return { label: 'Open the workflow', href: address.toString() };
  }
  return { label: 'Open local draft', href: address.pathname };
}

type State = { failed: boolean; error: unknown };

export class AppBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { failed: false, error: undefined };

  static getDerivedStateFromError(error: unknown): State {
    return { failed: true, error };
  }

  override componentDidCatch(): void {
    haltSaves();
  }

  override render() {
    if (!this.state.failed) {
      return this.props.children;
    }

    const { error } = this.state;
    const exit = exitFor(error);

    return (
      <div className={styles['screen']}>
        <div className={styles['card']} role="alert">
          <p>{error instanceof OpenError ? error.message : 'The diagram could not be drawn.'}</p>
          {error instanceof OpenError && <p>Reload the page to try the link again.</p>}
          <button className={styles['button']} type="button" onClick={() => globalThis.location.assign(exit.href)}>
            {exit.label}
          </button>
        </div>
      </div>
    );
  }
}
