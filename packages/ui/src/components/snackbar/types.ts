export const SNACKBAR_TONES = ['default', 'info', 'success', 'warning', 'critical'] as const;

/**
 * Meaning of a `Snackbar` message, in the design system's tone names.
 *
 * @category Snackbar
 */
export type SnackbarTone = (typeof SNACKBAR_TONES)[number];
