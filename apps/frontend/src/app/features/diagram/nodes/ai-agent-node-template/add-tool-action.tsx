import { getStoreNode } from '@/store/slices/diagram-slice/actions';
import useStore from '@/store/store';

import { createAiTool, hasAnyValue } from '@/features/json-form/controls/ai-tools-control/create-ai-tool';
import { openAddToolModal } from '@/features/json-form/controls/ai-tools-control/open-add-tool-modal';
import { AiAgentTool } from '@/features/json-form/types/controls';
import { closeModal } from '@/features/modals/stores/use-modal-store';

export function openAddToolModalForNode(nodeId: string) {
  function handleSubmit(change: AiAgentTool) {
    if (hasAnyValue(change)) {
      const node = getStoreNode(nodeId);
      if (!node) return;

      const properties = node.data.properties;
      const existingTools = (properties.tools as AiAgentTool[]) ?? [];

      useStore.getState().setNodeProperties(nodeId, {
        ...properties,
        tools: [...existingTools, createAiTool(nodeId, change)],
      });
    }
    closeModal();
  }

  openAddToolModal(handleSubmit);
}
