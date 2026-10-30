import { Accordion } from '@workflowbuilder/ui';
import type { DragEvent } from 'react';

import styles from './palette-items.module.css';

import { useTranslateIfPossible } from '../../../../hooks/use-translate-if-possible';
import type { PaletteGroup, PaletteItem as PaletteItemType } from '../../../../node/common';
import { PaletteItem } from './palette-item';

type PaletteItemsProps = {
  onDragStart: (event: DragEvent) => void;
  onMouseDown: (type: string) => void;
  items: (PaletteItemType | PaletteGroup)[];
  isDisabled?: boolean;
  /** While `true`, every group renders open regardless of its own `isOpen`. */
  isFiltering?: boolean;
};

export function PaletteItems({
  items,
  onDragStart,
  onMouseDown,
  isDisabled = false,
  isFiltering = false,
}: PaletteItemsProps) {
  const translateIfPossible = useTranslateIfPossible();

  return (
    <div className={styles['container']}>
      {items.map((itemOrGroup) => {
        const isGroup = Array.isArray((itemOrGroup as PaletteGroup)?.groupItems);

        if (isGroup) {
          const group = itemOrGroup as PaletteGroup;

          return (
            <Accordion
              key={group.label}
              className={styles['accordion']}
              label={translateIfPossible(group.label) || group.label}
              isOpen={isFiltering ? true : undefined}
              defaultOpen={group.isOpen}
            >
              <div className={styles['accordion-content']}>
                {group.groupItems.map((item) => (
                  <PaletteItem
                    key={item.type}
                    item={item}
                    isDisabled={isDisabled}
                    onMouseDown={onMouseDown}
                    onDragStart={onDragStart}
                  />
                ))}
              </div>
            </Accordion>
          );
        }

        const item = itemOrGroup as PaletteItemType;

        return (
          <PaletteItem
            key={item.type}
            item={item}
            isDisabled={isDisabled}
            onMouseDown={onMouseDown}
            onDragStart={onDragStart}
          />
        );
      })}
    </div>
  );
}
