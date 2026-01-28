import { clsx } from 'clsx';
import { CSSProperties, memo } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './loader.module.css';

type LoaderType = {
  isLoading?: boolean;
  isSemiTransparent?: boolean;
};

interface CSSCustomProperties extends CSSProperties {
  '--wb-loader-background-opacity': number;
}

const semiTransparentOpacityVariable: CSSCustomProperties = {
  '--wb-loader-background-opacity': 0.8,
};

export const Loader = memo(({ isLoading, isSemiTransparent }: LoaderType) => {
  const { t } = useTranslation();

  const visibilityClassName = isLoading ? styles['fade-in'] : styles['fade-out'];
  const setLoaderBackgroundOpacityVariable = isSemiTransparent ? semiTransparentOpacityVariable : {};

  if (!isLoading) {
    return null;
  }

  return (
    <div className={clsx(styles['container'], visibilityClassName)} style={setLoaderBackgroundOpacityVariable}>
      <div className={styles['loader']}>{t('loader.text')}</div>
    </div>
  );
});
