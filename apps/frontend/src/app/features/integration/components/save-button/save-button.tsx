import { NavButton } from '@synergycodes/overflow-ui';
import { Icon } from '@workflow-builder/icons';
import { useTranslation } from 'react-i18next';
import { useContext } from 'react';
import { IntegrationContext } from '../integration-variants/context/integration-context-wrapper';
import { SavingStatus } from '../saving-status/saving-status';
import { useAutoSave } from '../../hooks/use-auto-save';
import { useAutoSaveOnClose } from '../../hooks/use-auto-save-on-close';

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
