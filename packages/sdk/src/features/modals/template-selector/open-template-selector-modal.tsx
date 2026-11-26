import cubeIcon from '@iconify-icons/ph/cube';
import i18n from 'i18next';

import { Icon } from '../../../icon/icon';
import { useStore } from '../../../store/store';
import { openModal } from '../stores/use-modal-store';
import { TemplateSelector } from './template-selector';

export function openTemplateSelectorModal() {
  if (useStore.getState().isReadOnly) return;

  openModal({
    content: <TemplateSelector />,
    icon: <Icon icon={cubeIcon} />,
    title: i18n.t('templateSelector.title'),
    onModalClosed: () => useStore.getState().setDiagramModel(undefined, { skipIfNotEmpty: true }),
  });
}
