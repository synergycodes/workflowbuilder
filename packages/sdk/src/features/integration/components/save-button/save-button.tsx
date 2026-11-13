import { NavButton } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import { useWorkflowBuilderActions } from '../../../../hooks/use-workflow-builder-actions';
import { SavingStatus } from '../saving-status/saving-status';

export function SaveButton() {
  const { t } = useTranslation();
  const { save } = useWorkflowBuilderActions();

  return (
    <NavButton
      aria-label={t('tooltips.save')}
      size="s"
      onClick={() => void save()}
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
