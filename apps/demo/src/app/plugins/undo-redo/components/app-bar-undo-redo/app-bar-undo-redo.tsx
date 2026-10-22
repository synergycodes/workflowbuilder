import { AppBarToolsContent } from '@workflowbuilder/sdk';

import { ButtonsUndoRedo } from '../buttons-undo-redo/buttons-undo-redo';

export function AppBarUndoRedo() {
  return (
    <AppBarToolsContent place="after">
      <ButtonsUndoRedo />
    </AppBarToolsContent>
  );
}
