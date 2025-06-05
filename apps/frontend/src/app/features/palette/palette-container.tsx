import styles from './palette-container.module.css';
import './variables.css';
import useStore from '@/store/store';
import { useContext, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar/sidebar';
import { DraggedItem } from './components/dragged-item/dragged-item';
import { NodePreviewContainer } from './node-preview-container';
import { PaletteHeader } from './components/header/palette-header';
import { PaletteFooter } from './components/footer/palette-footer';
import { PaletteItems } from './components/items/palette-items';
import { usePaletteDragAndDrop } from './hooks/use-palette-drag-and-drop';
import { useTemplateSelectionModal } from '../../hooks/use-welcome-modal';
import { ModalContext } from '../modals/modal-provider';
import { SalesContact } from '../modals/sales-contact/sales-contact';
import { Info } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

export function PaletteContainer() {
  const { t } = useTranslation();
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const fetchData = useStore((state) => state.fetchData);

  const isSidebarExpanded = useStore((state) => state.isSidebarExpanded);
  const paletteItems = useStore((state) => state.data);
  const isReadOnlyMode = useStore((state) => state.isReadOnlyMode);
  const { openTemplateSelectionModal } = useTemplateSelectionModal();
  const { openModal } = useContext(ModalContext);

  const { draggedItem, zoom, ref, onMouseDown, onDragStart } = usePaletteDragAndDrop(!isReadOnlyMode);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleTemplateClick() {
    openTemplateSelectionModal();
  }

  function handleHelpClick() {
    openModal({
      content: <SalesContact />,
      icon: <Info />,
      title: t('palette.helpSupport'),
    });
  }

  return (
    <Sidebar
      className={styles['sidebar']}
      isExpanded={isSidebarExpanded}
      header={<PaletteHeader onClick={() => toggleSidebar()} isSidebarExpanded={isSidebarExpanded} />}
      footer={<PaletteFooter onTemplateClick={handleTemplateClick} onHelpClick={handleHelpClick} />}
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
