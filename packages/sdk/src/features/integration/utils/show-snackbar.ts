import type { OnSaveParams } from '../../../types/integration';
import { showTranslatedSnackbar } from '../../../utils/show-translated-snackbar';

export function showSnackbarSaveSuccessIfNeeded(savingParams?: OnSaveParams) {
  if (savingParams?.isAutoSave) {
    return;
  }

  showTranslatedSnackbar({
    title: 'saveDiagramSuccess',
    tone: 'success',
  });
}

export function showSnackbarSaveErrorIfNeeded(savingParams?: OnSaveParams) {
  if (savingParams?.isAutoSave) {
    return;
  }

  showTranslatedSnackbar({
    title: 'saveDiagramError',
    tone: 'critical',
  });
}
