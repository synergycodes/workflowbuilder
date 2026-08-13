import { SnackbarType } from '@synergycodes/overflow-ui';
import clsx from 'clsx';
import { useCallback } from 'react';

import { getStoreVariables, saveVariableDefinition } from '../../../../../../store/slices/diagram-slice/actions';
import { filterEmpty } from '../../../../../../utils/array';
import { showSnackbar } from '../../../../../../utils/show-snackbar';
import type { VariableDefinition } from '../../../../types';
import { getEmptyVariableDefinition } from '../../../../utils/get-empty-variable-definition';
import { TabHeader } from '../../../global/tab/tab-header';
import { VARIABLE_PANE, type VariablePane } from '../constants';
import { VariableForm } from '../variable-form/variable-form';

type Props = {
  className?: string;
  setActivePane: (pane: VariablePane, id?: string) => void;
};

export function PaneAddVariable({ className, setActivePane }: Props) {
  const handleSave = useCallback(
    (definition: VariableDefinition) => {
      const variables = getStoreVariables();

      const variableWithName = Object.values(variables)
        .filter(filterEmpty)
        .find(({ id, name }) => id !== definition.id && name.toLowerCase() === definition.name.toLowerCase());

      if (variableWithName) {
        showSnackbar({
          title: 'variableNameAlreadyExists',
          variant: SnackbarType.ERROR,
        });

        throw 'variableNameAlreadyExists';
      }

      saveVariableDefinition(definition);
      setActivePane(VARIABLE_PANE.LIST);
    },
    [setActivePane],
  );

  return (
    <div className={clsx(className)}>
      <TabHeader title="workflowsSettings.tab.addVariable" onGoBack={() => setActivePane(VARIABLE_PANE.LIST)} />
      <VariableForm variant="add" initData={getEmptyVariableDefinition()} onSave={handleSave} />
    </div>
  );
}
