import { useDiagramSourceStore } from '../../stores/use-diagram-source-store';
import { SaveDraftButton } from './save-draft-button';

export function UrlModeAppBarTools() {
  const targetWorkflowId = useDiagramSourceStore((state) => state.targetWorkflowId);

  return targetWorkflowId === undefined ? null : <SaveDraftButton workflowId={targetWorkflowId} />;
}
