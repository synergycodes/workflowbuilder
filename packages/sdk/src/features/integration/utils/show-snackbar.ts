import { SnackbarType } from '@workflowbuilder/ui';

import type { OnSaveParams } from '../../../types/integration';
import { showSnackbar } from '../../../utils/show-snackbar';

export function showSnackbarSaveSuccessIfNeeded(savingParams?: OnSaveParams) {
  if (savingParams?.isAutoSave) {
    return;
  }

  showSnackbar({
    title: 'saveDiagramSuccess',
    variant: SnackbarType.SUCCESS,
  });
}

export function showSnackbarSaveErrorIfNeeded(savingParams?: OnSaveParams) {
  if (savingParams?.isAutoSave) {
    return;
  }

  showSnackbar({
    title: 'saveDiagramError',
    variant: SnackbarType.ERROR,
  });
}
