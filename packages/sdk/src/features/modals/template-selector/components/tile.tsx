import clsx from 'clsx';
import type { ReactNode } from 'react';

import styles from './tile.module.css';

type TileProps = {
  icon: ReactNode;
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
      {icon}
      <div className={styles['description']}>
        <span className={clsx('wb-text-body-s', styles['title'])}>{title}</span>
        {subTitle && <span className={clsx('wb-text-body-s', styles['sub-title'])}>{subTitle}</span>}
      </div>
    </div>
  );
}
