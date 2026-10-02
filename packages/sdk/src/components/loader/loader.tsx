import { clsx } from 'clsx';
import { type CSSProperties, memo } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './loader.module.css';

type LoaderType = {
  isLoading?: boolean;
  isSemiTransparent?: boolean;
};

interface CSSCustomProperties extends CSSProperties {
  '--wb-sdk-loader-background-opacity': number;
}

const semiTransparentOpacityVariable: CSSCustomProperties = {
  '--wb-sdk-loader-background-opacity': 0.8,
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
      <div className={clsx(styles['loader'], 'wb-text-headline-s')}>{t('loader.text')}</div>
    </div>
  );
});
