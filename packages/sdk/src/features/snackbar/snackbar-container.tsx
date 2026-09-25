import { SnackbarProvider } from 'notistack';

// No variant components: showSnackbar renders each snackbar through its own `content`.
export function SnackbarContainer() {
  return <SnackbarProvider />;
}
