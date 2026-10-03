/**
 * The kinds of snackbar message. `SnackbarVariant` accepts their string values.
 *
 * @category Snackbar
 */
export enum SnackbarType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  DEFAULT = 'default',
}

/**
 * Visual style of a `Snackbar`, matching the kind of message.
 *
 * @category Snackbar
 */
export type SnackbarVariant = `${SnackbarType}`;
