import { NavButton } from '@workflowbuilder/ui';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import { IntegrationContext } from '../integration-variants/context/integration-context-wrapper';
import { SavingStatus } from '../saving-status/saving-status';

export function SaveButton() {
  const { t } = useTranslation();
  const { onSave } = useContext(IntegrationContext);

  function handleSave() {
    onSave({ isAutoSave: false });
  }

  return (
    <NavButton
      aria-label={t('tooltips.save')}
      onClick={handleSave}
      tooltip={t('tooltips.save')}
      prefixIcon={
        <>
          <SavingStatus />
          <Icon name="FloppyDisk" />
        </>
      }
    />
  );
}
