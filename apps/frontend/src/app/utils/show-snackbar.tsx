import { closeSnackbar, enqueueSnackbar } from 'notistack';
import i18n from 'i18next';
import { Snackbar, SnackbarProps } from '@synergycodes/overflow-ui';
import { DefaultTranslationMap } from '@/features/i18n/i18next';

const AUTO_HIDE_DURATION_TIME = 3000;

const SNACKBAR_PREFIX = `snackbar` as const;
type SnackbarKey = keyof DefaultTranslationMap[typeof SNACKBAR_PREFIX];

type ShowSnackbarProps = Omit<SnackbarProps, 'title'> & {
  title: SnackbarKey;
  autoHideDuration?: number;
  preventDuplicate?: boolean;
};

export function showSnackbar({
  title,
  variant,
  subtitle,
  buttonLabel,
  onButtonClick,
  close = true,
  autoHideDuration = AUTO_HIDE_DURATION_TIME,
  preventDuplicate = true,
}: ShowSnackbarProps) {
  enqueueSnackbar(variant, {
    content: (key) => (
      <Snackbar
        title={i18n.t(`${SNACKBAR_PREFIX}.${title}`)}
        variant={variant}
        subtitle={subtitle}
        buttonLabel={buttonLabel}
        onButtonClick={() => {
          onButtonClick?.();
          closeSnackbar(key);
        }}
        close={close}
        onClose={() => closeSnackbar(key)}
      />
    ),
    autoHideDuration,
    preventDuplicate,
    anchorOrigin: { horizontal: 'center', vertical: 'bottom' },
  });
  return { showSnackbar };
}
