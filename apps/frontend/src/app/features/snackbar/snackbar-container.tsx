import { Snackbar } from '@synergycodes/axiom';
import { SnackbarProvider } from 'notistack';

export function SnackbarContainer() {
  return (
    <SnackbarProvider
      Components={{
        default: Snackbar,
        info: Snackbar,
        success: Snackbar,
        warning: Snackbar,
        error: Snackbar,
      }}
    />
  );
}
