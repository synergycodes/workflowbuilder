import { Button } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from './pane-list.module.css';

import { useStore } from '../../../../../../store/store';
import { GlobalVariablePreview } from '../../../../components/variable-preview/wrappers/variable-preview-global';
import { TabHeader } from '../../../global/tab/tab-header';
import { VARIABLE_PANE, type VariablePane } from '../constants';

type Props = {
  className?: string;
  setActivePane: (pane: VariablePane, id?: string) => void;
  isReadOnly?: boolean;
};

export function PaneList({ className, setActivePane, isReadOnly }: Props) {
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
        <Button
          variant="ghost-secondary"
          size="xs"
          prefixIcon={<Icon name="Plus" />}
          onClick={() => setActivePane(VARIABLE_PANE.ADD)}
          disabled={isReadOnly}
        >
          {t('workflowsSettings.tab.addVariable')}
        </Button>
      </TabHeader>
      {variablesIds.length === 0 && (
        <p className={clsx('wb-text-body-m', styles['empty-message'])}>
          {t('workflowsSettings.tab.emptyVariablesList')}
        </p>
      )}
      <div className={styles['variables']}>
        {variablesIds.map((id) => (
          <GlobalVariablePreview
            key={id}
            id={id}
            // We allow going to edit pane in readOnly to allow inspection
            onEdit={() => setActivePane(VARIABLE_PANE.EDIT, id)}
            onRemove={isReadOnly ? undefined : () => setActivePane(VARIABLE_PANE.REMOVE, id)}
          />
        ))}
      </div>
    </div>
  );
}
