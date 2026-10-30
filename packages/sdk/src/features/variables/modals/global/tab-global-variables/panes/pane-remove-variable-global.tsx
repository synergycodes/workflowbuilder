import { useCallback, useMemo } from 'react';

import { removeVariableDefinition } from '../../../../../../store/slices/diagram-slice/actions';
import { useStore } from '../../../../../../store/store';
import { getNodesWithVariable } from '../../../../actions/get-nodes-with-variable';
import { getVariableReferenceWithoutBracketsForGlobal } from '../../../../utils/keys/get-variable-reference-without-brackets-for-global';
import { VARIABLE_PANE } from '../../../shared/components/constants';
import {
  PaneRemoveVariable,
  type PaneRemoveVariableProps,
} from '../../../shared/components/pane-remove-variable/pane-remove-variable';

type Props = {
  id: string;
} & Omit<PaneRemoveVariableProps, 'variable' | 'onRemove' | 'nodesWithVariable'> &
  Required<Pick<PaneRemoveVariableProps, 'setActivePane'>>;

export function PaneRemoveVariableGlobal({ className, setActivePane, id }: Props) {
  const variable = useStore((store) => store.globalVariables[id]);

  const handleRemove = useCallback(() => {
    removeVariableDefinition(id);
    setActivePane(VARIABLE_PANE.LIST);
  }, [id, setActivePane]);

  const nodesWithVariable = useMemo(() => {
    const variableKey = getVariableReferenceWithoutBracketsForGlobal(id);

    return getNodesWithVariable(variableKey);
  }, [id]);

  return (
    <PaneRemoveVariable
      className={className}
      setActivePane={setActivePane}
      variable={variable}
      onRemove={handleRemove}
      nodesWithVariable={nodesWithVariable}
    />
  );
}
