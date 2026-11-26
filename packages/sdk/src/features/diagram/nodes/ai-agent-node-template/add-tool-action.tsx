import { getStoreNode } from '../../../../store/slices/diagram-slice/actions';
import { useStore } from '../../../../store/store';
import { createAiTool, hasAnyValue } from '../../../json-form/controls/ai-tools-control/create-ai-tool';
import { openAddToolModal } from '../../../json-form/controls/ai-tools-control/open-add-tool-modal';
import type { AiAgentTool } from '../../../json-form/types/controls';
import { closeModal } from '../../../modals/stores/use-modal-store';

export function openAddToolModalForNode(nodeId: string) {
  if (useStore.getState().isReadOnly) return;

  function handleSubmit(change: AiAgentTool) {
    // Read-only can switch on while the modal is open: AI Studio sets it when a run starts.
    if (hasAnyValue(change) && !useStore.getState().isReadOnly) {
      const node = getStoreNode(nodeId);
      if (!node) return;

      const properties = node.data.properties;
      const existingTools = (properties.tools as AiAgentTool[]) ?? [];

      useStore.getState().setNodeProperties(nodeId, {
        ...properties,
        tools: [...existingTools, createAiTool(change)],
      });
    }
    closeModal();
  }

  openAddToolModal(handleSubmit);
}
