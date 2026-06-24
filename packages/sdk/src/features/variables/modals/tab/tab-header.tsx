import { NavButton } from '@workflowbuilder/ui';
import clsx from 'clsx';
import type { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from './tab-header.module.css';

import { useTranslateIfPossible } from '../../../../hooks/use-translate-if-possible';

type Props = {
  title?: string;
  description?: string;
  onGoBack?: () => void;
  className?: string;
};

export function TabHeader({ title, description, onGoBack, children, className = '' }: PropsWithChildren<Props>) {
  const translateIfPossible = useTranslateIfPossible();
  const { t } = useTranslation();

  return (
    <header className={clsx(styles['container'], className)}>
      {onGoBack && (
        <NavButton tooltip={t('common.goBack')} onClick={onGoBack} size="large">
          <Icon name="ArrowLeft" />
        </NavButton>
      )}
      <div className={styles['content']}>
        <h4 className={clsx('ax-public-h7', styles['title'])}>{translateIfPossible(title) || title}</h4>
        {description && (
          <p className={clsx('ax-public-p10', styles['description'])}>
            {translateIfPossible(description) || description}
          </p>
        )}
      </div>
      {children && <div className={styles['children']}>{children}</div>}
    </header>
  );
}
