// Module-level side effects that must run before any SDK code touches its
// runtime dependencies. Imported as a side-effect-only module from `index.ts`
// so it executes once at SDK first-import time, not on every render.
// MUST be first — disables immer auto-freeze before any module that uses
// `produce` is initialized. See bootstrap-immer.ts for the full rationale.
import './bootstrap-immer';
// Side-effect import — initializes the global i18next instance with SDK
// locales (en, pl). Must run before any component calls `useTranslation` or
// before `useDetectLanguageChange` subscribes via `i18n.on(...)`.
import './features/i18n/index';
import { plugin as i18nPlugin } from './features/i18n/plugin-exports';
import { plugin as modalsPlugin } from './features/modals/plugin-exports';

// Internal plugins for the language selector + modal portal slot. Registered
// at SDK import time (after bootstrap-immer) so any subset of subcomponents
// mounted — the full default layout, or just `<WorkflowBuilder.Canvas>` —
// has these integrations available. The decorator registry deduplicates by
// name, so strict mode double-invoke or hot-reload re-runs are no-ops.
i18nPlugin();
modalsPlugin();
