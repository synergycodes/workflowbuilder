import styles from './app-bar.module.css';
import './variables.css';

import useStore from '@/store/store';

import { useContext } from 'react';
import { Toolbar } from './toolbar';
import { ProjectSelection } from './project-selection';
import { Controls } from './controls';
import { UndoRedoContext } from '@/providers/undo-redo-provider';
import { useElkLayout } from '@/hooks/use-elk-layout/use-elk-layout';
import { useNoAccessModal } from '@/features/modals/no-access/use-no-access-modal';
import { useTheme } from '../../hooks/use-theme';

export function AppBarContainer() {
  const documentName = useStore((state) => state.documentName || '');
  const isReadOnlyMode = useStore((store) => store.isReadOnlyMode);
  const saveDiagram = useStore((store) => store.saveDiagram);
  const setToggleReadOnlyMode = useStore((store) => store.setToggleReadOnlyMode);
  const layoutDirection = useStore((store) => store.layoutDirection);
  const setLayoutDirection = useStore((store) => store.setLayoutDirection);

  const { undo, redo, canUndo, canRedo } = useContext(UndoRedoContext);
  const { openNoAccessModal } = useNoAccessModal();
  const { theme, toggleTheme } = useTheme();

  const layout = useElkLayout();

  function handleSave() {
    saveDiagram(true);
  }

  function handleChangeReadonlyMode(value: boolean) {
    setToggleReadOnlyMode(value);
  }

  async function handleLayoutChange(isVertical: boolean) {
    const direction = isVertical ? 'DOWN' : 'RIGHT';
    setLayoutDirection(direction);

    await layout(direction);
  }

  return (
    <div className={styles['container']}>
      <Toolbar
        onSave={handleSave}
        onOpen={openNoAccessModal}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        isReadOnlyMode={isReadOnlyMode}
      />
      <ProjectSelection
        documentName={documentName}
        onDuplicateClick={openNoAccessModal}
        isReadOnlyMode={isReadOnlyMode}
      />
      <Controls
        layoutVertical={layoutDirection === 'DOWN'}
        onLayoutChange={handleLayoutChange}
        onToggleReadOnly={handleChangeReadonlyMode}
        onExport={openNoAccessModal}
        onImport={openNoAccessModal}
        onSaveAsImage={openNoAccessModal}
        onArchive={openNoAccessModal}
        isReadOnlyMode={isReadOnlyMode}
        isDarkMode={theme === 'dark'}
        onThemeChange={toggleTheme}
      />
    </div>
  );
}
