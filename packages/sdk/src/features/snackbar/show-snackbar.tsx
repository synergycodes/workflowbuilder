import { Snackbar, type SnackbarVariant } from '@workflowbuilder/ui';
import { closeSnackbar as closeNotistackSnackbar, enqueueSnackbar } from 'notistack';

const AUTO_HIDE_DURATION_TIME = 3000;

/**
 * Options of {@link showSnackbar}.
 *
 * @category Utilities
 */
export type ShowSnackbarOptions = {
  /**
   * Identifies the snackbar: while one with this key is on screen, showing it again does nothing, and
   * {@link closeSnackbar} closes it. Without a key, a snackbar with the same variant, title and subtitle
   * on screen is not shown twice.
   */
  key?: string;
  /** Visual style of the `@workflowbuilder/ui` Snackbar. */
  variant: SnackbarVariant;
  /** Shown as given: translate it before passing it in. */
  title: string;
  /** Shown as given, below the title. */
  subtitle?: string;
  /** Label of the action button, which shows only together with `onButtonClick`. */
  buttonLabel?: string;
  /** Called when the action button is pressed; the snackbar closes after it. */
  onButtonClick?: () => void;
  /** Whether to show the close button. Defaults to `true`. */
  close?: boolean;
  /** Called when the person closes the snackbar with the close button, not when it hides on its own or {@link closeSnackbar} closes it. */
  onClose?: () => void;
  /** Milliseconds before the snackbar hides on its own; `null` keeps it until it is closed. Defaults to `3000`. */
  autoHideDuration?: number | null;
};

/**
 * Shows a snackbar in the editor's own stack, at the bottom centre with the SDK's snackbars, so
 * they line up instead of covering each other.
 *
 * @returns The snackbar's key, for {@link closeSnackbar}.
 *
 * @example
 * ```ts
 * const key = showSnackbar({ variant: 'info', title: 'Waiting for a decision', autoHideDuration: null });
 * // later
 * closeSnackbar(key);
 * ```
 *
 * @category Utilities
 */
export function showSnackbar({
  key,
  variant,
  title,
  subtitle,
  buttonLabel,
  onButtonClick,
  close = true,
  onClose,
  autoHideDuration = AUTO_HIDE_DURATION_TIME,
}: ShowSnackbarOptions): string {
  const snackbarKey = key ?? `${variant}:${title}:${subtitle ?? ''}`;

  enqueueSnackbar(title, {
    key: snackbarKey,
    preventDuplicate: true,
    autoHideDuration,
    persist: autoHideDuration === null,
    anchorOrigin: { horizontal: 'center', vertical: 'bottom' },
    content: (id) => (
      <Snackbar
        title={title}
        variant={variant}
        subtitle={subtitle}
        buttonLabel={buttonLabel}
        onButtonClick={
          onButtonClick &&
          (() => {
            onButtonClick();
            closeNotistackSnackbar(id);
          })
        }
        close={close}
        onClose={() => {
          onClose?.();
          closeNotistackSnackbar(id);
        }}
      />
    ),
  });

  return snackbarKey;
}

/**
 * Closes a snackbar shown by {@link showSnackbar}. Does nothing when it is already gone.
 *
 * @category Utilities
 */
export function closeSnackbar(key: string): void {
  closeNotistackSnackbar(key);
}
