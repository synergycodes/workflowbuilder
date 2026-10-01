import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { LayoutDirection } from '../node/common';
import { useStore } from '../store/store';
import type { Theme } from './theme';
import { useTheme } from './use-theme';

/**
 * A language the editor ships translations for.
 *
 * @category Hooks
 */
export type WorkflowBuilderLanguage = 'en' | 'pl';

/**
 * Every language the editor ships translations for, in display order.
 * Shared with `LanguageSelector` so its menu and this hook's narrowing
 * can't drift apart.
 */
export const SUPPORTED_LANGUAGES: readonly WorkflowBuilderLanguage[] = ['en', 'pl'];

/**
 * The editor state behind the built-in toggles, as returned by {@link useWorkflowBuilderState}.
 *
 * @category Hooks
 */
export type WorkflowBuilderState = {
  isReadOnly: boolean;
  theme: Theme;
  /** The active translation; `'en'` while the resolved language is one the editor has no translation for. */
  language: WorkflowBuilderLanguage;
  isPaletteOpen: boolean;
  isPropertiesPanelOpen: boolean;
  /** Text the palette's node list is filtered by; `''` shows every node. */
  paletteFilter: string;
  layoutDirection: LayoutDirection;
  /** `''` until a diagram is loaded or named. */
  documentName: string;
};

/**
 * Reads the state behind the built-in toggles of the app bar, the palette and the properties panel,
 * for a custom control that shows it. Change it with `useWorkflowBuilderActions()`. The result
 * keeps its identity until one of its fields changes.
 *
 * Must be called from a descendant of `<WorkflowBuilder.Root>`.
 *
 * @example
 * ```tsx
 * function ReadOnlyBadge() {
 *   const { isReadOnly } = useWorkflowBuilderState();
 *   return isReadOnly ? <span>Read-only</span> : null;
 * }
 * ```
 *
 * @category Hooks
 */
export function useWorkflowBuilderState(): WorkflowBuilderState {
  const isReadOnly = useStore((state) => state.isReadOnly);
  const isPaletteOpen = useStore((state) => state.isPaletteOpen);
  const isPropertiesPanelOpen = useStore((state) => state.isPropertiesPanelOpen);
  const paletteFilter = useStore((state) => state.paletteFilter);
  const layoutDirection = useStore((state) => state.layoutDirection);
  const documentName = useStore((state) => state.documentName) ?? '';
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const language = toWorkflowBuilderLanguage(i18n.resolvedLanguage ?? i18n.language?.split('-')[0]);

  return useMemo(
    () => ({
      isReadOnly,
      theme,
      language,
      isPaletteOpen,
      isPropertiesPanelOpen,
      paletteFilter,
      layoutDirection,
      documentName,
    }),
    [isReadOnly, theme, language, isPaletteOpen, isPropertiesPanelOpen, paletteFilter, layoutDirection, documentName],
  );
}

function toWorkflowBuilderLanguage(code: string | undefined): WorkflowBuilderLanguage {
  return SUPPORTED_LANGUAGES.find((language) => language === code) ?? 'en';
}
