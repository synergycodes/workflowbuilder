import clsx from 'clsx';
import { useCallback } from 'react';

import type { VariableDefinition } from '../../../../../features/variables/types';
import { saveVariableDefinition } from '../../../../../store/slices/diagram-slice/actions';
import { getEmptyVariableDefinition } from '../../../utils/get-empty-variable-definition';
import { TabHeader } from '../../tab/tab-header';
import { VARIABLE_PANE, type VariablePane } from '../constants';
import { VariableForm } from '../variable-form/variable-form';

type Props = {
  className?: string;
  setActivePane: (pane: VariablePane, id?: string) => void;
};

export function PaneAddVariable({ className, setActivePane }: Props) {
  const handleSave = useCallback(
    (definition: VariableDefinition) => {
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
