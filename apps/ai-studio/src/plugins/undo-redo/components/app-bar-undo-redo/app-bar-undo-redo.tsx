import { EditorHeaderToolsContent } from '@workflowbuilder/sdk';

import { ButtonsUndoRedo } from '../buttons-undo-redo/buttons-undo-redo';

export function AppBarUndoRedo() {
  return (
    <EditorHeaderToolsContent place="after">
      <ButtonsUndoRedo />
    </EditorHeaderToolsContent>
  );
}
