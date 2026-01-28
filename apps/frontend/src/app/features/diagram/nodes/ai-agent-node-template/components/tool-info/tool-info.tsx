import { PlusCircle } from '@phosphor-icons/react';
import { PropsWithChildren } from 'react';

import styles from './tool-info.module.css';

import { IconPlaceholder } from '../icon-placeholder/icon-placeholder';
import { NodeInfoWrapper } from '../node-info-wrapper/node-wrapper-info';

export function ToolInfo({ children }: PropsWithChildren) {
  return (
    <NodeInfoWrapper label={'AI Agent Tools'}>
      <div className={styles['tools-container']}>{children}</div>
      <div className={styles['icon-container']}>
        <IconPlaceholder className={styles['icon-placeholder-long']}>
          <PlusCircle size={16} /> Add Tool
        </IconPlaceholder>
      </div>
    </NodeInfoWrapper>
  );
}
