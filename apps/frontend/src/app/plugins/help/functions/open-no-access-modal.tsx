import i18n from 'i18next';
import { Icon } from '@workflow-builder/icons';
import { NoAccess } from '../modals/no-access/no-access';
import { SalesContact } from '../modals/sales-contact/sales-contact';
import { openModal } from '@/features/modals/stores/use-modal-store';

export function openNoAccessModal() {
  openModal({
    content: <NoAccess />,
    footer: <SalesContact />,
    footerVariant: 'separated',
    icon: <Icon name="LockSimpleOpen" />,
    title: i18n.t('plugins.help.header'),
  });
}
