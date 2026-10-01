import { useDetectLanguageChange } from '../i18n/use-detect-language-change';
import { useAutoSave } from '../integration/hooks/use-auto-save';
import { useAutoSaveOnClose } from '../integration/hooks/use-auto-save-on-close';

/**
 * Runs what the editor needs while it lives (auto-save, auto-save on tab close, language-change
 * detection) independent of the mounted layout; unrelated to `RuntimeIntegrationWrapper`, which
 * picks the integration strategy (props / API / localStorage) at run time.
 */
export function useEditorRuntime() {
  useAutoSave();
  useAutoSaveOnClose();
  useDetectLanguageChange();
}
