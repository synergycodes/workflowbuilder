import arrowLeftIcon from '@iconify-icons/ph/arrow-left';
import { NavButton } from '@workflowbuilder/ui';
import clsx from 'clsx';
import type { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './tab-header.module.css';

import { useTranslateIfPossible } from '../../../../../hooks/use-translate-if-possible';
import { Icon } from '../../../../../icon/icon';

type Props = {
  title?: string;
  description?: string;
  onGoBack?: () => void;
  className?: string;
  shouldShowBorder?: boolean;
};

export function TabHeader({
  title,
  description,
  onGoBack,
  children,
  className = '',
  shouldShowBorder = true,
}: PropsWithChildren<Props>) {
  const translateIfPossible = useTranslateIfPossible();
  const { t } = useTranslation();

  return (
    <header
      className={clsx(
        styles['container'],
        {
          [styles['container--no-border']]: shouldShowBorder === false,
        },
        className,
      )}
    >
      {onGoBack && (
        <NavButton
          tooltip={t('common.goBack')}
          onClick={onGoBack}
          size="l"
          prefixIcon={<Icon icon={arrowLeftIcon} />}
        />
      )}
      <div className={styles['content']}>
        <h4 className={clsx('wb-text-title-m-emphasized', styles['title'])}>{translateIfPossible(title) || title}</h4>
        {description && (
          <p className={clsx('wb-text-body-s', styles['description'])}>
            {translateIfPossible(description) || description}
          </p>
        )}
      </div>
      {children && <div className={styles['children']}>{children}</div>}
    </header>
  );
}
