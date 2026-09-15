import clsx from 'clsx';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './pane-remove-variable.module.css';

import { ButtonSubmit } from '../../../../../../components/button-submit/button-submit';
import type { NodeWithVariable } from '../../../../actions/get-nodes-with-variable';
import { VariableMeta } from '../../../../components/variable-preview/variable-meta';
import type { VariableDefinition } from '../../../../types';
import { TabHeader } from '../../../global/tab/tab-header';
import { VARIABLE_PANE, type VariablePane } from '../constants';

export type PaneRemoveVariableProps = {
  className?: string;
  title?: string;
  setActivePane?: (pane: VariablePane) => void;
  onRemove: () => void;
  nodesWithVariable: NodeWithVariable[];
  variable: VariableDefinition | undefined;
  isReadOnly?: boolean;
};

export function PaneRemoveVariable({
  className,
  title = 'workflowsSettings.tab.removeVariable',
  setActivePane,
  nodesWithVariable,
  onRemove,
  variable,
  isReadOnly = false,
}: PaneRemoveVariableProps) {
  const { t } = useTranslation();

  const handleRemove = useCallback(() => {
    onRemove();
    if (setActivePane) {
      setActivePane(VARIABLE_PANE.LIST);
    }
  }, [onRemove, setActivePane]);

  return (
    <div className={clsx(className)}>
      {(title || setActivePane) && (
        <TabHeader
          title="workflowsSettings.tab.removeVariable"
          onGoBack={setActivePane ? () => setActivePane(VARIABLE_PANE.LIST) : undefined}
        />
      )}
      <div className={styles['content']}>
        {!variable && <p className={clsx('ax-public-p9', styles['description'])}>{t('variables.variableNotFound')}</p>}
        {variable && <VariableMeta name={variable.name} type={variable.type} />}
        {nodesWithVariable.length === 0 ? (
          <p className={clsx('ax-public-p9', styles['description'])}>{t('variables.removeVariableWarning')}</p>
        ) : (
          <>
            <p className={clsx('ax-public-p9', styles['description'])}>{t('variables.removeVariableIsBlocked')}</p>
            <ul className={styles['list']}>
              {nodesWithVariable.map(({ id, title }) => (
                <li key={id} className="ax-public-p10">
                  {title}
                </li>
              ))}
            </ul>
          </>
        )}
        {variable && (
          <div className={styles['buttons']}>
            <ButtonSubmit
              size="medium"
              onClick={handleRemove}
              variant="error"
              isPending={false}
              disabled={isReadOnly || nodesWithVariable.length > 0}
            >
              {t('workflowsSettings.tab.removeVariable')}
            </ButtonSubmit>
          </div>
        )}
      </div>
    </div>
  );
}
