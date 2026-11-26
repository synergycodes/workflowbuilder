import downloadSimpleIcon from '@iconify-icons/ph/download-simple';
import i18n from 'i18next';

import { Icon } from '../../../../../icon/icon';
import { openModal } from '../../../../modals/stores/use-modal-store';
import { ImportModal } from './import-modal';

export function openImportModal() {
  openModal({
    content: <ImportModal />,
    icon: <Icon icon={downloadSimpleIcon} />,
    title: i18n.t('importExport.import'),
  });
}
