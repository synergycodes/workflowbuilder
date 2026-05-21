import { NavButton } from '@synergycodes/overflow-ui';
import { Icon, useStore } from '@workflowbuilder/sdk';
import { useTranslation } from 'react-i18next';

import { redo, undo, useUndoRedoStore } from '../../stores/use-undo-redo-store';

export function ButtonsUndoRedo() {
  const { t } = useTranslation();
  const canUndo = useUndoRedoStore((store) => store.past.length > 0);
  const canRedo = useUndoRedoStore((store) => store.future.length > 0);
  const isReadOnlyMode = useStore((store) => store.isReadOnlyMode);

  return (
    <>
      <NavButton onClick={undo} disabled={!canUndo || isReadOnlyMode} tooltip={t('plugins.undoRedo.undo')}>
        <Icon name="ArrowUUpLeft" />
      </NavButton>
      <NavButton onClick={redo} disabled={!canRedo || isReadOnlyMode} tooltip={t('plugins.undoRedo.redo')}>
        <Icon name="ArrowUUpRight" />
      </NavButton>
    </>
  );
}
