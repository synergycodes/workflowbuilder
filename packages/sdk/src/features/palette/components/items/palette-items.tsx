import { Accordion } from '@workflowbuilder/ui';

import styles from './palette-items.module.css';

import { useTranslateIfPossible } from '../../../../hooks/use-translate-if-possible';
import type { PaletteGroup, PaletteItem as PaletteItemType } from '../../../../node/common';
import { PaletteItem } from './palette-item';

type PaletteItemsProps = {
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>, item: PaletteItemType) => void;
  items: (PaletteItemType | PaletteGroup)[];
  isDisabled?: boolean;
};

export function PaletteItems({ items, onPointerDown, isDisabled = false }: PaletteItemsProps) {
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
              defaultOpen={group.isOpen}
            >
              <div className={styles['accordion-content']}>
                {group.groupItems.map((item) => (
                  <PaletteItem key={item.type} item={item} isDisabled={isDisabled} onPointerDown={onPointerDown} />
                ))}
              </div>
            </Accordion>
          );
        }

        const item = itemOrGroup as PaletteItemType;

        return <PaletteItem key={item.type} item={item} isDisabled={isDisabled} onPointerDown={onPointerDown} />;
      })}
    </div>
  );
}
