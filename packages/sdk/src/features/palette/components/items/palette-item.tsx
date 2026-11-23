import clsx from 'clsx';
import type { DragEvent } from 'react';

import styles from './palette-item.module.css';

import type { PaletteItem as PaletteItemType } from '../../../../node/common';
import { NodePreviewContainer } from '../../node-preview-container';

type PaletteItemProps = {
  item: PaletteItemType;
  onDragStart: (event: DragEvent) => void;
  onPointerDown: (type: string) => void;
  isDisabled?: boolean;
};

export function PaletteItem({ item, onDragStart, onPointerDown, isDisabled = false }: PaletteItemProps) {
  return (
    <div
      key={item.type}
      draggable={!isDisabled}
      className={clsx(styles['item'], {
        [styles['disabled']]: isDisabled,
      })}
      onPointerDown={() => onPointerDown(item.type)}
      onDragStart={onDragStart}
    >
      <NodePreviewContainer type={item.type} disabled={isDisabled} />
    </div>
  );
}
