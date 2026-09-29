import { Icon, getStoreEdges, getStoreNodes, useStore } from '@workflowbuilder/sdk';
import { NavButton } from '@workflowbuilder/ui';
import { useCallback, useState } from 'react';

import { saveWorkflowDraft } from '../../adapters/open-from-url-api';
import { addNotice } from '../../stores/use-diagram-source-store';

const LABEL = 'Save the workflow draft';

export function SaveDraftButton({ workflowId }: { workflowId: string }) {
  const [isSaving, setIsSaving] = useState(false);
  // A locked canvas can be an older run's graph, which would replace the workflow's newer draft.
  const isReadOnly = useStore((state) => state.isReadOnlyMode);

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
      disabled={isSaving || isReadOnly}
      prefixIcon={<Icon name="FloppyDisk" />}
    />
  );
}
