import { Plus } from '@phosphor-icons/react';

import { Icon, WBIcon } from '@workflow-builder/icons';

import styles from './setting-info.module.css';

import { IconPlaceholder } from '../icon-placeholder/icon-placeholder';
import { NodeInfoWrapper } from '../node-info-wrapper/node-wrapper-info';

type SettingPlaceholderProps = {
  label: string;
  actionLabel?: string;
  icon?: WBIcon;
  className?: string;
};

export function SettingInfo({ label, actionLabel, icon, className }: SettingPlaceholderProps) {
  return (
    <NodeInfoWrapper label={label}>
      <div className={styles['container']}>
        <IconPlaceholder className={className}>{icon ? <Icon name={icon} /> : <Plus size={18} />}</IconPlaceholder>
        {actionLabel}
      </div>
    </NodeInfoWrapper>
  );
}
