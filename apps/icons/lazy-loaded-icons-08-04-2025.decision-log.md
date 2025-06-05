### Title: Lazy-loaded Icons

### Proposed by: Jan Librowski

### Date: 08.04.2025

## Context

The previous implementation of lazy-loaded icons relied on Vite's `import.meta.glob` API to handle dynamic imports. While this worked, it tied our icon loading mechanism to Vite's specific implementation. We needed a more build-tool agnostic approach that would be more maintainable and flexible.

Additionally, the previous implementation had issues with React's `lazy()` and `useMemo()` being used inside the Icon component body. This approach was problematic because:

- `lazy()` should be called at the module level, not inside component bodies
- The combination of these patterns made the code harder to maintain and debug

These issues, combined with the Vite dependency, prompted us to seek a more robust solution.

## Decision

We've decided to:

1. Remove the dependency on Vite's `import.meta.glob` API
2. Use `@svgr/core` CLI to pre-generate React component chunks from SVG files
3. Create a generated entry file that contains a map of lazy-loadable icon components
4. This approach provides better separation of concerns and build-tool independence

## Consequences

- **Build Tool Independence**: The solution is no longer tied to Vite's specific implementation
- **Improved Maintainability**: Clear separation between build-time generation and runtime loading

## Status

Accepted
