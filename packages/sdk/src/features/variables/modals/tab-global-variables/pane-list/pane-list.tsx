import { Button } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from './pane-list.module.css';

import { useStore } from '../../../../../store/store';
import { TabHeader } from '../../tab/tab-header';
import { VARIABLE_PANE, type VariablePane } from '../constants';
import { VariablePreview } from '../variable-preview/variable-preview';

type Props = {
  className?: string;
  setActivePane: (pane: VariablePane, id?: string) => void;
};

export function PaneList({ className, setActivePane }: Props) {
  const globalVariables = useStore((store) => store.globalVariables);
  const { t } = useTranslation();

  const variablesIds = useMemo(() => {
    return Object.keys(globalVariables);
  }, [globalVariables]);

  return (
    <div className={clsx(styles['container'], className)} data-no-b-pd>
      <TabHeader
        title="workflowsSettings.tab.globalVariables"
        description="workflowsSettings.tab.globalVariablesDescription"
      >
        <Button variant="secondary" size="extra-small" onClick={() => setActivePane(VARIABLE_PANE.ADD)}>
          <Icon name="Plus" />
          {t('workflowsSettings.tab.addVariable')}
        </Button>
      </TabHeader>
      {variablesIds.length === 0 && (
        <p className={clsx('ax-public-p9', styles['empty-message'])}>{t('workflowsSettings.tab.emptyVariablesList')}</p>
      )}
      <div className={styles['variables']}>
        {variablesIds.map((id) => (
          <VariablePreview
            key={id}
            id={id}
            onEdit={() => setActivePane(VARIABLE_PANE.EDIT, id)}
            onRemove={() => setActivePane(VARIABLE_PANE.REMOVE, id)}
          />
        ))}
      </div>
    </div>
  );
}
