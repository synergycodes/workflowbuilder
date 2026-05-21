import clsx from 'clsx';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './pane-remove-variable.module.css';

import { ButtonSubmit } from '../../../../../components/button-submit/button-submit';
import { getNodesWithVariable } from '../../../../../features/variables/actions/get-nodes-with-variable';
import { getGlobalVariableKey } from '../../../../../features/variables/utils/get-global-variable-key';
import { removeVariableDefinition } from '../../../../../store/slices/diagram-slice/actions';
import { useStore } from '../../../../../store/store';
import { TabHeader } from '../../tab/tab-header';
import { VARIABLE_PANE, type VariablePane } from '../constants';
import { VariableMeta } from '../variable-preview/variable-meta';

type Props = {
  className?: string;
  setActivePane: (pane: VariablePane) => void;
  id: string;
};

export function PaneRemoveVariable({ className, setActivePane, id }: Props) {
  const variable = useStore((store) => store.globalVariables[id]);

  const { t } = useTranslation();

  const handleRemove = useCallback(() => {
    removeVariableDefinition(id);
    setActivePane(VARIABLE_PANE.LIST);
  }, [id, setActivePane]);

  const nodesWithVariable = useMemo(() => {
    const variableKey = getGlobalVariableKey(id);

    return getNodesWithVariable(variableKey);
  }, [id]);

  return (
    <div className={clsx(className)}>
      <TabHeader title="workflowsSettings.tab.removeVariable" onGoBack={() => setActivePane(VARIABLE_PANE.LIST)} />
      <div className={styles['content']}>
        {!variable && t('variables.variableNotFound')}
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
              disabled={nodesWithVariable.length > 0}
            >
              {t('workflowsSettings.tab.removeVariable')}
            </ButtonSubmit>
          </div>
        )}
      </div>
    </div>
  );
}
