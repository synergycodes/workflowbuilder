import { useStore, useWorkflowBuilderActions } from '@workflowbuilder/sdk';

import styles from './toolbar.module.css';

/**
 * Custom toolbar — demonstrates `useWorkflowBuilderActions()`.
 *
 * Replaces `<WorkflowBuilder.TopBar />`. Every button below drives an SDK
 * command through the hook, so the editor is fully usable without mounting
 * the built-in app bar.
 */
export function Toolbar() {
  const actions = useWorkflowBuilderActions();
  const documentName = useStore((s) => s.documentName ?? 'Untitled');
  const setDocumentName = useStore((s) => s.setDocumentName);
  const isReadOnly = useStore((s) => s.isReadOnlyMode);

  return (
    <header className={styles['toolbar']}>
      <div className={styles['brand']}>WB · No App Bar</div>

      <input
        className={styles['name-input']}
        value={documentName}
        onChange={(event) => setDocumentName(event.target.value)}
        disabled={isReadOnly}
        aria-label="Workflow name"
      />

      <div className={styles['group']}>
        <button type="button" onClick={() => void actions.save()}>
          Save
        </button>
        <button type="button" onClick={actions.openImport}>
          Import
        </button>
        <button type="button" onClick={actions.openExport}>
          Export
        </button>
        <button type="button" onClick={actions.openSettings}>
          Settings
        </button>
      </div>

      <div className={styles['group']}>
        <button type="button" onClick={actions.toggleReadOnly}>
          {isReadOnly ? 'Editable' : 'Read-only'}
        </button>
        <button type="button" onClick={actions.toggleDarkMode}>
          Theme
        </button>
        <button type="button" onClick={actions.toggleLayoutDirection}>
          Flip layout
        </button>
      </div>
    </header>
  );
}
