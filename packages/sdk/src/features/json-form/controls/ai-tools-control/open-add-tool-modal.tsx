import slidersHorizontalIcon from '@iconify-icons/ph/sliders-horizontal';
import i18n from 'i18next';

import { Icon } from '../../../../icon/icon';
import { closeModal, openModal } from '../../../modals/stores/use-modal-store';
import type { AiAgentTool } from '../../types/controls';
import { AddAiToolFooter } from './components/add-ai-tool-footer/add-ai-tool-footer';
import { AddAiToolFormContent } from './components/add-ai-tool-form-content/add-ai-tool-form-content';

export function openAddToolModal(onSubmit: (data: AiAgentTool) => void, data?: AiAgentTool) {
  openModal({
    icon: <Icon icon={slidersHorizontalIcon} size="inherit" />,
    content: <AddAiToolFormContent onSubmit={onSubmit} data={data} />,
    title: i18n.t('aiTools.modalTitle'),
    footer: <AddAiToolFooter onCancelClick={closeModal} />,
  });
}
