import styles from './palette-container.module.css';
import './variables.css';
import { useEffect } from 'react';
import useStore from '@/store/store';
import { Sidebar } from '@/components/sidebar/sidebar';
import { DraggedItem } from './components/dragged-item/dragged-item';
import { NodePreviewContainer } from './node-preview-container';
import { PaletteHeader } from './components/header/palette-header';
import { PaletteFooter } from './components/footer/palette-footer';
import { PaletteItems } from './components/items/palette-items';
import { usePaletteDragAndDrop } from './hooks/use-palette-drag-and-drop';
import { openTemplateSelectorModal } from '../modals/template-selector/open-template-selector-modal';

export function PaletteContainer() {
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const fetchData = useStore((state) => state.fetchData);

  const isSidebarExpanded = useStore((state) => state.isSidebarExpanded);
  const paletteItems = useStore((state) => state.data);
  const isReadOnlyMode = useStore((state) => state.isReadOnlyMode);

  const { draggedItem, zoom, ref, onMouseDown, onDragStart } = usePaletteDragAndDrop(!isReadOnlyMode);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Sidebar
      className={styles['sidebar']}
      isExpanded={isSidebarExpanded}
      header={<PaletteHeader onClick={() => toggleSidebar()} isSidebarExpanded={isSidebarExpanded} />}
      footer={<PaletteFooter onTemplateClick={openTemplateSelectorModal} />}
    >
      <PaletteItems
        items={paletteItems}
        onMouseDown={onMouseDown}
        onDragStart={onDragStart}
        isDisabled={isReadOnlyMode}
      />
      {draggedItem && (
        <DraggedItem ref={ref} zoom={zoom}>
          <NodePreviewContainer type={draggedItem.type} />
        </DraggedItem>
      )}
    </Sidebar>
  );
}
