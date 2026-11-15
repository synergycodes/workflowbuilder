import { usePortalContainer } from '@workflowbuilder/ui';
import { SnackbarProvider } from 'notistack';

// No variant components: showSnackbar renders each snackbar through its own `content`.
export function SnackbarContainer() {
  const portal = usePortalContainer();
  // `null` is the Root's container before its first layout effect; `undefined` (no provider) means <body>.
  if (portal === null) return null;

  return <SnackbarProvider domRoot={portal} />;
}
