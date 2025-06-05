import { useCallback, useContext } from 'react';
import { ModalContext } from '../modal-provider';
import { NoAccess } from '../no-access/no-access';
import { SalesContact } from '../sales-contact/sales-contact';
import { Icon } from '@workflow-builder/icons';
import { useTranslation } from 'react-i18next';

export function useNoAccessModal() {
  const { openModal } = useContext(ModalContext);
  const { t } = useTranslation();
  const openNoAccessModal = useCallback(() => {
    openModal({
      content: <NoAccess />,
      footer: <SalesContact />,
      footerVariant: 'separated',
      icon: <Icon name="LockSimpleOpen" />,
      title: t('noAccess.header'),
    });
  }, [openModal, t]);

  return { openNoAccessModal };
}
