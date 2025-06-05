### Title: Lazy-loaded Icons

### Proposed by: Jan Librowski

### Date: 04.03.2025

## Context

`@phosphor-icons/react` provides us with an icon component library with tree-shaking mechanism.
This mechanism is provided by modern bundlers, but in order to work the build tool needs to analyze
the static imports and remove unused code. A similar restriction applies when lazy-loading is used.
The bundler needs to prepare all needed chunks so they can be imported dynamically at runtime.

Worklow Builder in nature is dynamic though and so are the icons used in the app.
Most of the icon related data is related to nodes which are populated by the backend.
We can't use tree-shaking in this case as we don't know at build time what icons are going to be used.
To enable dynamic icon loading so far we've been importing a whole `@phosphor-icons/react` library.
This implementation works just fine, but is not a production-grade solution
as it immensely bloats the final bundle.

## Decision

To achieve flexibility and keep the bundle light-weight it's been decided to implement lazy-loaded icons mechanism.
`Icon` component is based on:

- Vite's glob import API (to register the lazy-loadable chunks)
- `@phosphor-icons/core` package (.svg and type declaration resource)
- SVGR loader (to parse the .svg sources and prepare component chunks)
- React's `lazy()` and browsers' dynamic import feature
- Genrating the icon chunks code based on provided `ICON_SOURCES` in `frontend/src/app/icon/ui/generate-icons.ts`

This solution is easily extendible by adding new .svg resources which types are generated to based on file names
to describe `Icon`'s API. Based on the `name` prop a proper asset path is going to be generated at runtime.

## Consequences

- **Maintainability**: `Icon` allows for easy extensions with generated types and lazy-loadable chunks
- **Customizability**: Adding new .svg sources is simple and automated
- **Performance**: Significantly reduces initial bundle size by loading icons only when needed

## Status

Accepted
