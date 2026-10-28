import clsx from 'clsx';

import { Icon } from '@workflow-builder/icons';

import styles from './tile.module.css';

import type { IconType } from '../../../../node/common';

type TileProps = {
  icon: IconType;
  title: string;
  subTitle?: string;
  outlined?: boolean;
  onClick: () => void;
};

export function Tile({ icon, title, subTitle, outlined, onClick }: TileProps) {
  return (
    <div
      className={clsx(styles['tile'], {
        [styles['outlined']]: outlined,
      })}
      onClick={() => onClick()}
    >
      <Icon name={icon} size="large" />
      <div className={styles['description']}>
        <span className={clsx('wb-text-body-s', styles['title'])}>{title}</span>
        {subTitle && <span className={clsx('wb-text-body-s', styles['sub-title'])}>{subTitle}</span>}
      </div>
    </div>
  );
}
