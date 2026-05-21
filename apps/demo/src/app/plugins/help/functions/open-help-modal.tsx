import { Info } from '@phosphor-icons/react';
import { openModal } from '@workflowbuilder/sdk';
import i18n from 'i18next';

import { SalesContact } from '../modals/sales-contact/sales-contact';

export function openHelpModal() {
  openModal({
    content: <SalesContact />,
    icon: <Info />,
    title: i18n.t('plugins.help.helpSupport'),
  });
}
