import exportIcon from '@iconify-icons/ph/export';
import i18n from 'i18next';

import { Icon } from '../../../../../icon/icon';
import { openModal } from '../../../../modals/stores/use-modal-store';
import { ExportModal } from './export-modal';

export function openExportModal() {
  openModal({
    content: <ExportModal />,
    icon: <Icon icon={exportIcon} />,
    title: i18n.t('importExport.export'),
  });
}
