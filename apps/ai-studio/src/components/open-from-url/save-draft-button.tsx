import { Icon, getStoreEdges, getStoreNodes, useStore } from '@workflowbuilder/sdk';
import { NavButton } from '@workflowbuilder/ui';
import { useCallback, useState } from 'react';

import { saveWorkflowDraft } from '../../adapters/open-from-url-api';
import { addNotice, useDiagramSourceStore } from '../../stores/use-diagram-source-store';

const LABEL = 'Save the workflow draft';

export function SaveDraftButton({ workflowId }: { workflowId: string }) {
  const [isSaving, setIsSaving] = useState(false);
  const isReadOnly = useStore((state) => state.isReadOnlyMode);
  // A run's graph is older than the workflow's draft, even after the read-only switch lifts the lock.
  const isRunView = useDiagramSourceStore((state) => state.isRunView);

  const save = useCallback(async () => {
    setIsSaving(true);
    const result = await saveWorkflowDraft(workflowId, { nodes: getStoreNodes(), edges: getStoreEdges() });
    setIsSaving(false);
    if (result.ok) {
      addNotice('The workflow draft is saved.', 'success');
    } else {
      const reason = result.status === 'network' ? 'the server did not answer' : `the server answered ${result.status}`;
      addNotice(`The workflow draft could not be saved: ${reason}.`, 'error');
    }
  }, [workflowId]);

  return (
    <NavButton
      aria-label={LABEL}
      tooltip={LABEL}
      onClick={save}
      disabled={isSaving || isReadOnly || isRunView}
      prefixIcon={<Icon name="FloppyDisk" />}
    />
  );
}
