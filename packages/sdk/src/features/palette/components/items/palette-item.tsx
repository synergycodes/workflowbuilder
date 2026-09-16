import clsx from 'clsx';

import styles from './palette-item.module.css';

import type { PaletteItem as PaletteItemType } from '../../../../node/common';
import { NodePreviewContainer } from '../../node-preview-container';

type PaletteItemProps = {
  item: PaletteItemType;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>, item: PaletteItemType) => void;
  isDisabled?: boolean;
};

export function PaletteItem({ item, onPointerDown, isDisabled = false }: PaletteItemProps) {
  return (
    <div
      key={item.type}
      draggable={!isDisabled}
      className={clsx(styles['item'], {
        [styles['disabled']]: isDisabled,
      })}
      onPointerDown={(event) => onPointerDown(event, item)}
    >
      <NodePreviewContainer type={item.type} />
    </div>
  );
}
