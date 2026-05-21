### Title: Remark plugin for automatic base path link rewriting

### Date: 13.03.2026

## Context

Internal Markdown links on the docs site (e.g. `[Add Custom Node Type](/how-to/add-custom-node-type/)`) returned 404 in production but worked on localhost. The site is deployed under `base: '/docs'`, so the browser resolved absolute links to `/how-to/...` instead of `/docs/how-to/...`.

Astro explicitly does not auto-prepend the `base` path to absolute links in Markdown content. From Astro docs: "When `base` is configured, all of your internal page links must be prefixed with your base value."

## Decision

Add a custom remark plugin (`remark-base-path-links.mjs`) that automatically prepends the `base` path to all absolute internal Markdown links at build time. The plugin is registered in `astro.config.mjs` via `markdown.remarkPlugins` and reads the base value from a shared `BASE` constant.

## Alternatives Considered

- **Manually prefix every Markdown link with `/docs`** - fragile, requires updating every link if the base path changes, easy to forget on new content.
- **Use relative links (`../how-to/...`)** - base-path agnostic, but error-prone because the relative path depends on each file's depth in the content tree. Harder to read and maintain.
- **Remove `base` config and rely only on the build script** - would break asset URL generation and dev server behavior, since Astro needs `base` to generate correct paths for scripts, styles, and images.

## Consequences

- Markdown authors write links as `/how-to/...` without thinking about the base path. The plugin handles it.
- If `base` changes, only the `BASE` constant in `astro.config.mjs` needs updating.
- The plugin only transforms absolute internal links (starting with `/`, excluding `//`). External URLs and already-prefixed links are left untouched.
- The plugin runs on the remark (Markdown AST) layer, so it does not affect links in `.astro` components or the Starlight sidebar config, which handle the base path through their own mechanisms.
