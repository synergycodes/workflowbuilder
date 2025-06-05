import clsx from 'clsx';

import styles from './tile.module.css';
import { Icon } from '@workflow-builder/icons';
import { IconType } from '@workflow-builder/types/common';

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
        <span className={clsx('ax-public-p10', styles['title'])}>{title}</span>
        {subTitle && <span className={clsx('ax-public-p10', styles['sub-title'])}>{subTitle}</span>}
      </div>
    </div>
  );
}
