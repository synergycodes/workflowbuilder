import pencilSimpleIcon from '@iconify-icons/ph/pencil-simple';
import trashIcon from '@iconify-icons/ph/trash';
import { NavButton } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import styles from './variable-preview.module.css';

import { Icon } from '../../../../../icon/icon';
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
            <NavButton
              aria-label={t('common.edit')}
              tooltip={t('common.edit')}
              onClick={onEdit}
              size="xs"
              prefixIcon={<Icon icon={pencilSimpleIcon} />}
            />
          )}
          {onRemove && (
            <NavButton
              aria-label={t('common.remove')}
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
