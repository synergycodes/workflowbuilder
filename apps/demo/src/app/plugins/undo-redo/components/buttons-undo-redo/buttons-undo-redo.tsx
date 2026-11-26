import arrowUUpLeftIcon from '@iconify-icons/ph/arrow-u-up-left';
import arrowUUpRightIcon from '@iconify-icons/ph/arrow-u-up-right';
import { Icon, useStore } from '@workflowbuilder/sdk';
import { NavButton } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import { redo, undo, useUndoRedoStore } from '../../stores/use-undo-redo-store';

export function ButtonsUndoRedo() {
  const { t } = useTranslation();
  const canUndo = useUndoRedoStore((store) => store.past.length > 0);
  const canRedo = useUndoRedoStore((store) => store.future.length > 0);
  const isReadOnly = useStore((store) => store.isReadOnly);

  return (
    <>
      <NavButton
        size="s"
        onClick={undo}
        disabled={!canUndo || isReadOnly}
        tooltip={t('plugins.undoRedo.undo')}
        prefixIcon={<Icon icon={arrowUUpLeftIcon} />}
      />
      <NavButton
        size="s"
        onClick={redo}
        disabled={!canRedo || isReadOnly}
        tooltip={t('plugins.undoRedo.redo')}
        prefixIcon={<Icon icon={arrowUUpRightIcon} />}
      />
    </>
  );
}
