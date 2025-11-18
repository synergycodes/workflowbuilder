import i18n from 'i18next';
import { Icon } from '@workflow-builder/icons';
import { openModal } from '@/features/modals/stores/use-modal-store';
import { ExportModal } from './export-modal';

export function openExportModal() {
  openModal({
    content: <ExportModal />,
    icon: <Icon name="Export" />,
    title: i18n.t('importExport.export'),
  });
}
