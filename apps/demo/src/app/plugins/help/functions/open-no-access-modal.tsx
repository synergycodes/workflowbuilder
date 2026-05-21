import { Icon, openModal } from '@workflowbuilder/sdk';
import i18n from 'i18next';

import { NoAccess } from '../modals/no-access/no-access';
import { SalesContact } from '../modals/sales-contact/sales-contact';

export function openNoAccessModal() {
  openModal({
    content: <NoAccess />,
    footer: <SalesContact />,
    footerVariant: 'separated',
    icon: <Icon name="LockSimpleOpen" />,
    title: i18n.t('plugins.help.header'),
  });
}
