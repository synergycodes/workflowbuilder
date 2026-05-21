import { NavButton } from '@synergycodes/overflow-ui';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import { useAutoSave } from '../../hooks/use-auto-save';
import { useAutoSaveOnClose } from '../../hooks/use-auto-save-on-close';
import { IntegrationContext } from '../integration-variants/context/integration-context-wrapper';
import { SavingStatus } from '../saving-status/saving-status';

export function SaveButton() {
  const { t } = useTranslation();
  const { onSave } = useContext(IntegrationContext);

  function handleSave() {
    onSave({ isAutoSave: false });
  }

  useAutoSave();
  useAutoSaveOnClose();

  return (
    <NavButton onClick={handleSave} tooltip={t('tooltips.save')}>
      <>
        <SavingStatus />
        <Icon name="FloppyDisk" />
      </>
    </NavButton>
  );
}
