import i18n from 'i18next';
import { Icon } from '@workflow-builder/icons';
import useStore from '@/store/store';
import { openModal } from '@/features/modals/stores/use-modal-store';
import { TemplateSelector } from './template-selector';

export function openTemplateSelectorModal() {
  openModal({
    content: <TemplateSelector />,
    icon: <Icon name="Cube" />,
    title: i18n.t('plugins.help.header'),
    onModalClosed: () => useStore.getState().setDiagramModel(undefined, { skipIfNotEmpty: true }),
  });
}
