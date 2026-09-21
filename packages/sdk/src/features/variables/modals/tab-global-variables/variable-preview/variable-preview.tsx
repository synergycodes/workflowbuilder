import { NavButton } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from './variable-preview.module.css';

import { useStore } from '../../../../../store/store';
import { VariableMeta } from './variable-meta';

type Props = {
  id: string;
  onEdit?: () => void;
  onRemove?: () => void;
};

export function VariablePreview({ id, onEdit, onRemove }: Props) {
  const variable = useStore((store) => store.globalVariables[id]);
  const { t } = useTranslation();

  if (!variable) {
    return null;
  }

  return (
    <div className={styles['container']}>
      <div className={styles['line']}>
        <VariableMeta name={variable.name} type={variable.type} />
        <div className={styles['actions']}>
          {onEdit && (
            <NavButton tooltip={t('common.edit')} onClick={onEdit} size="extra-small">
              <Icon name="PencilSimple" />
            </NavButton>
          )}
          {onRemove && (
            <NavButton tooltip={t('common.remove')} onClick={onRemove} size="extra-small">
              <Icon name="Trash" />
            </NavButton>
          )}
        </div>
      </div>
      <p className={clsx('ax-public-p11', styles['description'])}>{variable.description}</p>
    </div>
  );
}
