import { SnackbarProvider } from 'notistack';

import { useOptionalSdkSurfaces } from '../../workflow-builder-root/sdk-surfaces';

// No variant components: showSnackbar renders each snackbar through its own `content`.
export function SnackbarContainer() {
  const surfaces = useOptionalSdkSurfaces();

  return <SnackbarProvider domRoot={surfaces?.portal ?? undefined} />;
}
