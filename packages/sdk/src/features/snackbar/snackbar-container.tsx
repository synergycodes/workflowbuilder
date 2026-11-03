import { SnackbarProvider } from 'notistack';

import styles from './snackbar-container.module.css';

const classes = { containerAnchorOriginBottomCenter: styles['bottom-center'] };

// No variant components: showSnackbar renders each snackbar through its own `content`.
export function SnackbarContainer() {
  return <SnackbarProvider classes={classes} />;
}
