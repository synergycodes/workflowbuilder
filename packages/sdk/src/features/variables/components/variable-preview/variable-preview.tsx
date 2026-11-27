import pencilSimpleIcon from '@iconify-icons/ph/pencil-simple';
import trashIcon from '@iconify-icons/ph/trash';
import { NavButton } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import styles from './variable-preview.module.css';

import { Icon } from '../../../../icon/icon';
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
            <NavButton
              tooltip={t('common.edit')}
              onClick={onEdit}
              size="xs"
              prefixIcon={<Icon icon={pencilSimpleIcon} />}
            />
          )}
          {onRemove && (
            <NavButton
              tooltip={t('common.remove')}
              onClick={onRemove}
              size="xs"
              prefixIcon={<Icon icon={trashIcon} />}
            />
          )}
        </div>
      </div>
      <p className={clsx('wb-text-body-s', styles['description'])}>{variable.description}</p>
    </div>
  );
}
