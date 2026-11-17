import { usePortalContainer } from '@workflowbuilder/ui';
import { SnackbarProvider } from 'notistack';

import styles from './snackbar-container.module.css';

import { SnackbarTransition } from './snackbar-transition';

const classes = { containerAnchorOriginBottomCenter: styles['bottom-center'] };

// No variant components: showSnackbar renders each snackbar through its own `content`.
export function SnackbarContainer() {
  const portal = usePortalContainer();
  // `null` is the Root without a DOM (server rendering); `undefined` (no provider) means <body>.
  if (portal === null) return null;

  return (
    <SnackbarProvider
      domRoot={portal}
      classes={classes}
      TransitionComponent={SnackbarTransition}
      transitionDuration={180}
    />
  );
}
