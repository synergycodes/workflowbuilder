import { Icon, useStore } from '@workflowbuilder/sdk';
import { NavButton } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import { redo, undo, useUndoRedoStore } from '../../stores/use-undo-redo-store';

export function ButtonsUndoRedo() {
  const { t } = useTranslation();
  const canUndo = useUndoRedoStore((store) => store.past.length > 0);
  const canRedo = useUndoRedoStore((store) => store.future.length > 0);
  const isReadOnlyMode = useStore((store) => store.isReadOnlyMode);

  return (
    <>
      <NavButton
        aria-label={t('plugins.undoRedo.undo')}
        onClick={undo}
        disabled={!canUndo || isReadOnlyMode}
        tooltip={t('plugins.undoRedo.undo')}
        prefixIcon={<Icon name="ArrowUUpLeft" />}
      />
      <NavButton
        aria-label={t('plugins.undoRedo.redo')}
        onClick={redo}
        disabled={!canRedo || isReadOnlyMode}
        tooltip={t('plugins.undoRedo.redo')}
        prefixIcon={<Icon name="ArrowUUpRight" />}
      />
    </>
  );
}
