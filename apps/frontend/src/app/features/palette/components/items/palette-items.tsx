import clsx from 'clsx';
import styles from './palette-items.module.css';
import { NodePreviewContainer } from '../../node-preview-container';
import { PaletteItem } from '@workflow-builder/types/common';
import { DragEvent } from 'react';

type PaletteItemsProps = {
  onDragStart: (event: DragEvent) => void;
  onMouseDown: (type: string) => void;
  items: PaletteItem[];
  isDisabled?: boolean;
};

export function PaletteItems({ items, onDragStart, onMouseDown, isDisabled = false }: PaletteItemsProps) {
  return (
    <div className={styles['container']}>
      {items.map((item) => (
        <div
          key={item.type}
          draggable={!isDisabled}
          className={clsx(styles['item'], {
            [styles['disabled']]: isDisabled,
          })}
          onMouseDown={() => onMouseDown(item.type)}
          onDragStart={onDragStart}
        >
          <NodePreviewContainer type={item.type} />
        </div>
      ))}
    </div>
  );
}
