import clsx from 'clsx';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { getNodesWithVariable } from '../../../../../features/variables/actions/get-nodes-with-variable';
import type { VariableDefinition } from '../../../../../features/variables/types';
import { getGlobalVariableKey } from '../../../../../features/variables/utils/get-global-variable-key';
import { saveVariableDefinition } from '../../../../../store/slices/diagram-slice/actions';
import { useStore } from '../../../../../store/store';
import { TabHeader } from '../../tab/tab-header';
import { VARIABLE_PANE, type VariablePane } from '../constants';
import { VariableForm } from '../variable-form/variable-form';

type Props = {
  className?: string;
  setActivePane: (pane: VariablePane) => void;
  id: string;
};

export function PaneEditVariable({ className, setActivePane, id }: Props) {
  const variable = useStore((store) => store.globalVariables[id]);

  const { t } = useTranslation();

  const handleSave = useCallback(
    (definition: VariableDefinition) => {
      saveVariableDefinition(definition);
      setActivePane(VARIABLE_PANE.LIST);
    },
    [setActivePane],
  );

  const nodesWithVariable = useMemo(() => {
    const variableKey = getGlobalVariableKey(id);

    return getNodesWithVariable(variableKey);
  }, [id]);

  return (
    <div className={clsx(className)}>
      <TabHeader title="workflowsSettings.tab.editVariable" onGoBack={() => setActivePane(VARIABLE_PANE.LIST)} />
      {!variable && t('variables.variableNotFound')}
      {variable && (
        <VariableForm
          variant={nodesWithVariable.length > 0 ? 'edit-limited' : 'edit'}
          initData={variable}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
