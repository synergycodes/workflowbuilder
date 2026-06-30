export enum SnackbarType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  DEFAULT = 'default',
}

export type SnackbarVariant = `${SnackbarType}`;
