import { useEffect } from 'react';

import styles from './palette-container.module.css';

import { Sidebar } from '../../components/sidebar/sidebar';
import { useTranslateIfPossible } from '../../hooks/use-translate-if-possible';
import { useStore } from '../../store/store';
import { openTemplateSelectorModal } from '../modals/template-selector/open-template-selector-modal';
import { DraggedItem } from './components/dragged-item/dragged-item';
import { PaletteFooter } from './components/footer/palette-footer';
import { PaletteHeader } from './components/header/palette-header';
import { PaletteItems } from './components/items/palette-items';
import { filterPaletteItems } from './filter-palette-items';
import { usePaletteDragAndDrop } from './hooks/use-palette-drag-and-drop';
import { NodePreviewContainer } from './node-preview-container';

/**
 * Left-side palette listing draggable node types and the template selector.
 * Mount via `<WorkflowBuilder.Palette />` (or the named
 * `<WorkflowBuilderPalette />` export) inside a custom layout; the default
 * layout already includes it.
 *
 * @category Components
 */
export function PaletteContainer() {
  const setPaletteOpen = useStore((state) => state.setPaletteOpen);
  const fetchData = useStore((state) => state.fetchData);

  const isPaletteOpen = useStore((state) => state.isPaletteOpen);
  const paletteItems = useStore((state) => state.data);
  const paletteFilter = useStore((state) => state.paletteFilter);
  const isReadOnly = useStore((state) => state.isReadOnly);
  const translateIfPossible = useTranslateIfPossible();

  const { draggedItem, zoom, ref, onMouseDown, onDragStart } = usePaletteDragAndDrop(!isReadOnly);

  const isFiltering = paletteFilter.trim() !== '';
  const filteredItems = filterPaletteItems(paletteItems, paletteFilter, (label) => translateIfPossible(label) || label);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Sidebar
      className={styles['sidebar']}
      isExpanded={isPaletteOpen}
      header={<PaletteHeader onClick={() => setPaletteOpen()} isPaletteOpen={isPaletteOpen} />}
      footer={<PaletteFooter onTemplateClick={openTemplateSelectorModal} />}
    >
      <PaletteItems
        items={filteredItems}
        onMouseDown={onMouseDown}
        onDragStart={onDragStart}
        isDisabled={isReadOnly}
        isFiltering={isFiltering}
      />
      {draggedItem && (
        <DraggedItem ref={ref} zoom={zoom}>
          <NodePreviewContainer type={draggedItem.type} />
        </DraggedItem>
      )}
    </Sidebar>
  );
}
