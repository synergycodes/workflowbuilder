import clsx from 'clsx';
import styles from './no-access.module.css';
import { useTranslation } from 'react-i18next';

export function NoAccess() {
  const { t } = useTranslation();

  return (
    <div className={styles['container']}>
      <span className="ax-public-h6">{t('plugins.help.title')}</span>
      <span className={clsx('ax-public-p9', styles['sub-title'])}>{t('plugins.help.subtitle')}</span>
    </div>
  );
}
