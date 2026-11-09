// Initialises the global i18next instance with the SDK locales before any component calls
// `useTranslation`. Imported once from `index.ts`, so it runs at first import, not per render.
import './features/i18n/index';
