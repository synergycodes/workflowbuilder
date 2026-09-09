import { SnackbarType } from '@workflowbuilder/ui';
import { useCallback, useMemo } from 'react';

import { getStoreVariables, saveVariableDefinition } from '../../../../../../store/slices/diagram-slice/actions';
import { useStore } from '../../../../../../store/store';
import { filterEmpty } from '../../../../../../utils/array';
import { showSnackbar } from '../../../../../../utils/show-snackbar';
import { getNodesWithVariable } from '../../../../actions/get-nodes-with-variable';
import type { VariableDefinition } from '../../../../types';
import { getVariableReferenceWithoutBracketsForGlobal } from '../../../../utils/keys/get-variable-reference-without-brackets-for-global';
import { VARIABLE_PANE } from '../../../shared/components/constants';
import {
  PaneEditVariable,
  type PaneEditVariableProps,
} from '../../../shared/components/pane-edit-variable/pane-edit-variable';

type Props = {
  id: string;
} & Omit<PaneEditVariableProps, 'variable' | 'variant' | 'onSave'> &
  Required<Pick<PaneEditVariableProps, 'setActivePane'>>;

export function PaneEditVariableGlobal({ className, setActivePane, id, isReadOnly }: Props) {
  const variable = useStore((store) => store.globalVariables[id]);

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

  const nodesWithVariable = useMemo(() => {
    const variableKey = getVariableReferenceWithoutBracketsForGlobal(id);

    return getNodesWithVariable(variableKey);
  }, [id]);

  return (
    <PaneEditVariable
      className={className}
      setActivePane={setActivePane}
      variant={nodesWithVariable.length > 0 ? 'edit-limited' : 'edit'}
      isReadOnly={isReadOnly}
      variable={variable}
      onSave={handleSave}
    />
  );
}
