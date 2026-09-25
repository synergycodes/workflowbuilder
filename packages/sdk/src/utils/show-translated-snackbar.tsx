import i18n from 'i18next';

import type { DefaultTranslationMap, TranslationKey } from '../features/i18n/i18next';
import { type ShowSnackbarOptions, showSnackbar } from '../features/snackbar/show-snackbar';

const SNACKBAR_PREFIX = `snackbar` as const;
type SnackbarTranslationKey = keyof DefaultTranslationMap[typeof SNACKBAR_PREFIX];

type ShowTranslatedSnackbarOptions = Omit<ShowSnackbarOptions, 'title' | 'subtitle'> & {
  title: SnackbarTranslationKey;
  subtitle?: TranslationKey;
};

/** The SDK's own snackbars: the texts are keys of its translations. */
export function showTranslatedSnackbar({ title, subtitle, ...options }: ShowTranslatedSnackbarOptions): string {
  return showSnackbar({
    ...options,
    title: i18n.t(`${SNACKBAR_PREFIX}.${title}`),
    subtitle: subtitle ? (i18n.t(subtitle) as string) : undefined,
  });
}
