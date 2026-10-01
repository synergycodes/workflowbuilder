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
