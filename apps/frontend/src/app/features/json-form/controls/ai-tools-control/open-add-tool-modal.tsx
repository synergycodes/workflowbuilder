import { SlidersHorizontal } from '@phosphor-icons/react';
import i18n from 'i18next';

import { closeModal, openModal } from '@/features/modals/stores/use-modal-store';

import { AiAgentTool } from '../../types/controls';
import { AddAiToolFooter } from './components/add-ai-tool-footer/add-ai-tool-footer';
import { AddAiToolFormContent } from './components/add-ai-tool-form-content/add-ai-tool-form-content';

export function openAddToolModal(onSubmit: (data: AiAgentTool) => void, data?: AiAgentTool) {
  openModal({
    icon: <SlidersHorizontal />,
    content: <AddAiToolFormContent onSubmit={onSubmit} data={data} />,
    title: i18n.t('aiTools.modalTitle'),
    footer: <AddAiToolFooter onCancelClick={closeModal} />,
  });
}
