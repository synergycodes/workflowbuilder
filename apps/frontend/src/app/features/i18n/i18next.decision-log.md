### Title: Internationalization implementation with i18next

### Proposed by: Tomasz Rybak

### Date: 15.04.2025

## Context

As the Workflow Builder application grows and expands to international markets, there is a need to support multiple languages. The application needs to be easily translatable and maintainable across different locales. We need a robust solution that provides a good developer experience and integrates well with React.

## Decision

[i18next](https://www.i18next.com/) was chosen as our core internationalization framework. It provides a complete solution for managing translations and language switching. We will use the following approach:

1. Use `i18next` as our base internationalization framework
2. Add `react-i18next` for React-specific implementation with hooks and components
3. Implement translations using JSON files for each supported language
4. Store translations in a structured format under `apps/frontend/src/app/i18n/locales/{locale}/*.json`
5. Add an `i18n.on('languageChanged')` event handler in `useDetectLanguageChange` to dynamically update the `<html lang>` attribute whenever the application language changes. This improves accessibility and ensures correct pronunciation for screen readers (e.g., NVDA, JAWS, VoiceOver) by indicating the correct document language dynamically without a full page reload
6. Integrate the optional `i18next-browser-languagedetector` plugin to automatically detect the user's language preference according to the `detection.order` defined in the i18n configuration. Detected languages are cached in `localStorage`, allowing automatic language re-selection after a page reload without additional logic

## Alternative Options Considered

- **next-intl** - While designed specifically for Next.js, it has a smaller community and ecosystem compared to i18next
- **Custom solution** - Building our own i18n system would be time-consuming and error-prone

## Consequences

- **Pros**

  - **Wide adoption** - i18next is one of the most popular i18n solutions with a large community
  - **Type-safe translations** - Provides type safety and better developer experience
  - **Performance optimized** - Translations are bundled with the application, reducing client-side loading
  - **Easy to maintain** - JSON-based translation files are easy to manage and update
  - **Rich ecosystem** - Many plugins and tools available for i18next
  - **React integration** - react-i18next provides seamless integration with React components and hooks
  - **Framework agnostic** - i18next can be used with any JavaScript framework

- **Cons**
  - **Bundle size** - Including multiple language files increases the initial bundle size
  - **Learning curve** - Team members need to learn the new i18n patterns and conventions
  - **Additional complexity** - Managing translations adds another layer of complexity to the development process

## Status

Accepted
