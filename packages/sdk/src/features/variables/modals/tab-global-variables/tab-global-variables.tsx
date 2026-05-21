import clsx from 'clsx';
import { useCallback, useState } from 'react';

import styles from './tab-global-variables.module.css';

import { VARIABLE_PANE, type VariablePane } from './constants';
import { PaneAddVariable } from './pane-add-variable/pane-add-variable';
import { PaneEditVariable } from './pane-edit-variable/pane-edit-variable';
import { PaneList } from './pane-list/pane-list';
import { PaneRemoveVariable } from './pane-remove-variable/pane-remove-variable';

type Props = {
  className?: string;
};

export function TabGlobalVariables({ className }: Props) {
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

  if (activePane === VARIABLE_PANE.ADD) {
    return <PaneAddVariable className={clsx(styles['container'], className)} setActivePane={setActivePane} />;
  }

  if (activePane === VARIABLE_PANE.EDIT && id) {
    return <PaneEditVariable className={clsx(styles['container'], className)} setActivePane={setActivePane} id={id} />;
  }

  if (activePane === VARIABLE_PANE.REMOVE && id) {
    return (
      <PaneRemoveVariable className={clsx(styles['container'], className)} setActivePane={setActivePane} id={id} />
    );
  }

  return <PaneList className={clsx(styles['container'], className)} setActivePane={setActivePane} />;
}
