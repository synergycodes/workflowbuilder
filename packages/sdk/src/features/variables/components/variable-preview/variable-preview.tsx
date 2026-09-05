import { NavButton } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from './variable-preview.module.css';

import type { VariableDefinition } from '../../types';
import { VariableMeta } from './variable-meta';

export type VariablePreviewProps = {
  className?: string;
  variable: VariableDefinition;
  onEdit?: () => void;
  onRemove?: () => void;
};

export function VariablePreview({ className = '', variable, onEdit, onRemove }: VariablePreviewProps) {
  const { t } = useTranslation();

  return (
    <div className={clsx(styles['container'], className)}>
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
