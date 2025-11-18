import i18n from 'i18next';
import { Icon } from '@workflow-builder/icons';
import { openModal } from '@/features/modals/stores/use-modal-store';
import { ImportModal } from './import-modal';

export function openImportModal() {
  openModal({
    content: <ImportModal />,
    icon: <Icon name="DownloadSimple" />,
    title: i18n.t('importExport.import'),
  });
}
