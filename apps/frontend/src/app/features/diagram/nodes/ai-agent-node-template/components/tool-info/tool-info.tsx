import { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './tool-info.module.css';

import { PlaceholderButton } from '../../../components/placeholder-button/placeholder-button';
import { NodeInfoWrapper } from '../node-info-wrapper/node-wrapper-info';

type Props = PropsWithChildren<{
  onAddTool?: () => void;
}>;

export function ToolInfo({ children, onAddTool }: Props) {
  const { t } = useTranslation(undefined, { keyPrefix: 'aiTools' });

  return (
    <NodeInfoWrapper label={t('title')}>
      <div className={styles['tools-container']}>
        {children}
        <PlaceholderButton label={t('addTool')} onClick={onAddTool} />
      </div>
    </NodeInfoWrapper>
  );
}
