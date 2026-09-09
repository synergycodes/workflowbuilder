import clsx from 'clsx';
import { useCallback, useState } from 'react';

import styles from './tab-global-variables.module.css';

import { VARIABLE_PANE, type VariablePane } from '../../shared/components/constants';
import { PaneAddVariable } from '../../shared/components/pane-add-variable/pane-add-variable';
import { PaneList } from '../../shared/components/pane-list/pane-list';
import { PaneEditVariableGlobal } from './panes/pane-edit-variable-global';
import { PaneRemoveVariableGlobal } from './panes/pane-remove-variable-global';

type Props = {
  className?: string;
  isReadOnly?: boolean;
};

export function TabGlobalVariables({ className, isReadOnly }: Props) {
  const [{ activePane, id }, setActivePaneOriginal] = useState<{
    activePane: VariablePane;
    id?: string;
  }>({ activePane: VARIABLE_PANE.LIST });

  const setActivePane = useCallback((pane: VariablePane, id: string = '') => {
    setActivePaneOriginal({
      activePane: pane,
      id,
    });
  }, []);

  if (activePane === VARIABLE_PANE.ADD && !isReadOnly) {
    return <PaneAddVariable className={clsx(styles['container'], className)} setActivePane={setActivePane} />;
  }

  if (activePane === VARIABLE_PANE.EDIT && id) {
    return (
      <PaneEditVariableGlobal
        className={clsx(styles['container'], className)}
        setActivePane={setActivePane}
        id={id}
        isReadOnly={isReadOnly}
      />
    );
  }

  if (activePane === VARIABLE_PANE.REMOVE && id && !isReadOnly) {
    return (
      <PaneRemoveVariableGlobal
        className={clsx(styles['container'], className)}
        setActivePane={setActivePane}
        id={id}
      />
    );
  }

  return <PaneList className={clsx(styles['container'], className)} setActivePane={setActivePane} />;
}
