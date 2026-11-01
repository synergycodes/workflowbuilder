import { usePortalContainer } from '@workflowbuilder/ui';
import { SnackbarProvider } from 'notistack';

// No variant components: showSnackbar renders each snackbar through its own `content`.
export function SnackbarContainer() {
  const portal = usePortalContainer();

  return <SnackbarProvider domRoot={portal ?? undefined} />;
}
