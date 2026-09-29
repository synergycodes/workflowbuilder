import { Component, type ReactNode } from 'react';

import styles from './full-page.module.css';

function openLocalDraft() {
  globalThis.location.assign(globalThis.location.pathname);
}

export class AppBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) {
      return this.props.children;
    }

    return (
      <div className={styles['screen']}>
        <div className={styles['card']} role="alert">
          <p>The diagram could not be drawn.</p>
          <button className={styles['button']} type="button" onClick={openLocalDraft}>
            Open local draft
          </button>
        </div>
      </div>
    );
  }
}
