import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import type { VariableDefinition } from '../../../../types';
import { TabHeader } from '../../../global/tab/tab-header';
import { VARIABLE_PANE, type VariablePane } from '../constants';
import { VariableForm, type VariableFormVariant } from '../variable-form/variable-form';

export type PaneEditVariableProps = {
  className?: string;
  title?: string;
  setActivePane?: (pane: VariablePane) => void;
  isReadOnly?: boolean;
  variant: VariableFormVariant;
  variable: VariableDefinition | undefined;
  onCancel?: () => void;
  onSave: (definition: VariableDefinition) => void;
};

export function PaneEditVariable({
  className,
  title = 'workflowsSettings.tab.editVariable',
  variant,
  setActivePane,
  variable,
  onCancel,
  onSave,
  isReadOnly,
}: PaneEditVariableProps) {
  const { t } = useTranslation();

  return (
    <div className={clsx(className)}>
      {(title || setActivePane) && (
        <TabHeader title={title} onGoBack={setActivePane ? () => setActivePane(VARIABLE_PANE.LIST) : undefined} />
      )}
      {!variable && <p className={clsx('ax-public-p9')}>{t('variables.variableNotFound')}</p>}
      {variable && (
        <VariableForm
          variant={variant}
          initData={variable}
          onSave={onSave}
          onCancel={onCancel}
          isReadOnly={isReadOnly}
        />
      )}
    </div>
  );
}
