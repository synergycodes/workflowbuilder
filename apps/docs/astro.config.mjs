import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import umami from '@yeskunall/astro-umami';
import { defineConfig, passthroughImageService } from 'astro/config';
import icon from 'astro-icon';
import rehypeExternalLinks from 'rehype-external-links';
import starlightImageZoom from 'starlight-image-zoom';
import starlightTypeDoc from 'starlight-typedoc';

import { remarkBasePathLinks } from './src/remark-base-path-links.mjs';

// Copies the hand-written API landing page into the gitignored TypeDoc
// output directory. Two things matter:
//
// 1. Timing — the copy has to run *after* `starlight-typedoc` clears and
//    re-populates `src/content/docs/api/` (TypeDoc cleans its output dir
//    before emitting). The `astro:config:done` hook fires once every
//    plugin's `config:setup` is done (including starlight-typedoc's),
//    which is the earliest safe point.
// 2. Error behaviour — fail the build if the copy can't run. /docs/api/
//    resolves to this landing page; if it disappears silently the section
//    root is missing while the category pages still build. Surface the
//    error so CI catches it instead of letting it ship.
function copyApiLanding() {
  return {
    name: 'wb-api-landing',
    hooks: {
      'astro:config:done': () => {
        const source = path.resolve(import.meta.dirname, 'src/landing-pages/api-index.md');
        const target = path.resolve(import.meta.dirname, 'src/content/docs/api/index.md');
        mkdirSync(path.dirname(target), { recursive: true });
        copyFileSync(source, target);
      },
    },
  };
}

const UMAMI_WEBSITE_ID = process.env.UMAMI_WEBSITE_ID || '';

const BASE = '/docs';
const DEMO_APP = path.resolve(import.meta.dirname, '../demo/src/app');

export default defineConfig({
  vite: {
    resolve: {
      alias: [
        // Route `@workflowbuilder/sdk` through a docs-only shim that re-exports
        // just the symbols demo's schema/uischema files import — without the
        // SDK barrel's CSS side-effect, which would leak a full-viewport reset
        // (body overflow:hidden, global Poppins) into the docs layout.
        {
          find: /^@workflowbuilder\/sdk$/,
          replacement: path.resolve(import.meta.dirname, 'src/sdk-shim.ts'),
        },
        { find: '@wb/nodes', replacement: path.resolve(DEMO_APP, 'data/nodes') },
      ],
    },
  },
  base: BASE,
  redirects: {
    '/': `${BASE}/overview/`,
  },
  image: { service: passthroughImageService() },
  outDir: './dist/docs',
  markdown: {
    remarkPlugins: [[remarkBasePathLinks, { base: BASE }]],
    rehypePlugins: [[rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }]],
  },
  integrations: [
    icon(),
    react(),
    umami({ id: UMAMI_WEBSITE_ID }),
    starlight({
      plugins: [
        starlightImageZoom(),
        // TypeDoc → Markdown for the SDK barrel. Runs inside `astro build` and
        // `astro dev` (watch). Output goes to `src/content/docs/api/` (gitignored)
        // and is wired into the sidebar via `typeDocSidebarGroup` below.
        // See `apps/docs/typedoc-api-reference.decision-log.md` for the rationale
        // behind each option.
        starlightTypeDoc({
          entryPoints: ['../../packages/sdk/src/index.ts'],
          tsconfig: '../../packages/sdk/tsconfig.json',
          output: 'api',
          // Sidebar wired manually below via category-specific `autogenerate`
          // entries. `starlight-typedoc`'s built-in `typeDocSidebarGroup`
          // doesn't work with `router: 'category'` — it groups by TypeDoc
          // Kind ("Type Aliases" / "Functions") while the on-disk folders
          // are per `@category`. Same pattern as ngDiagram.
          watch: true,
          typeDoc: {
            // Show every public export grouped by `@category` (matches the
            // sectioning already used in `packages/sdk/src/index.ts`).
            // Symbols without a category fall through to "Other".
            router: 'category',
            // Drop noise: source links (file paths inside packages/sdk),
            // private fields, anything tagged `@internal`.
            disableSources: true,
            excludeInternal: true,
            excludePrivate: true,
            excludeProtected: true,
            // Strict mode: every public symbol must have a TSDoc comment.
            // `excludeNotDocumented` hides any rogue undocumented symbol
            // from the rendered site; `treatWarningsAsErrors` makes
            // `pnpm build:docs` fail when one is found, so a missing
            // doc-comment is caught at CI time instead of shipping silently.
            excludeNotDocumented: true,
            treatWarningsAsErrors: true,
            // Hide the per-package README page that TypeDoc emits by default.
            // The category landing pages cover the same surface.
            entryFileName: '_readme',
          },
        }),
      ],
      // `@workflowbuilder/ui` styles are safe to load globally: styles.css is
      // just the @layer order + one :root var + opt-in `.ax-public-*` typography
      // classes (no global reset), and tokens.css only defines `--ax-*` custom
      // properties keyed on `html[data-theme]` — which Starlight already toggles,
      // so the live component showcases follow the docs light/dark theme.
      customCss: ['./src/styles/custom.css', '@workflowbuilder/ui/styles.css', '@workflowbuilder/ui/tokens.css'],
      components: {
        Head: './src/components/head.astro',
        Search: './src/components/search.astro',
        SiteTitle: './src/components/site-title.astro',
        PageTitle: './src/components/page-title.astro',
        ThemeSelect: './src/components/theme-select.astro',
        Sidebar: './src/components/sidebar.astro',
      },
      title: 'Workflow Builder',
      description: 'Documentation for Workflow Builder — a customizable, plugin-based visual workflow builder.',
      social: [
        { icon: 'github', href: 'https://github.com/synergycodes/workflowbuilder', label: 'GitHub' },
        { icon: 'youtube', href: 'https://www.youtube.com/@workflowbuilder', label: 'YouTube' },
        { icon: 'discord', href: 'https://discord.com/invite/FDMjRuarFb', label: 'Discord' },
        { icon: 'email', href: 'https://www.workflowbuilder.io/contact', label: 'Contact Us' },
      ],
      sidebar: [
        {
          label: 'Overview',
          items: [
            { label: 'What is Workflow Builder?', link: '/overview/' },
            { label: 'Features', autogenerate: { directory: 'overview/features' } },
            { label: 'Architecture', link: '/overview/architecture/' },
          ],
        },
        {
          label: 'Get Started',
          items: [
            { label: 'Quick Start', autogenerate: { directory: 'get-started/quick-start' } },
            {
              label: 'Persistence',
              items: [
                { label: 'localStorage', link: '/get-started/persistence/localstorage/' },
                { label: 'REST API', link: '/get-started/persistence/rest-api/' },
                { label: 'via callback', link: '/get-started/persistence/callback/' },
              ],
            },
            { label: 'Theming', link: '/get-started/theming/' },
            { label: 'Side effects & limitations', link: '/get-started/side-effects/' },
          ],
        },
        { label: 'Guides', autogenerate: { directory: 'guides' } },
        { label: 'Node Schemas', autogenerate: { directory: 'node-schemas' } },
        { label: 'Built-in Nodes', autogenerate: { directory: 'nodes' } },
        { label: 'Plugins', autogenerate: { directory: 'plugins' } },
        {
          label: 'UI Library',
          items: [
            { label: 'Overview', link: '/ui-library/overview/' },
            { label: 'Design tokens', link: '/ui-library/design-tokens/' },
            { label: 'UI Components', autogenerate: { directory: 'ui-library/ui-components' } },
            { label: 'Diagram Components', autogenerate: { directory: 'ui-library/diagram-components' } },
          ],
        },
        // API Reference — pages auto-generated by `starlight-typedoc` from
        // packages/sdk's barrel into `src/content/docs/api/<Category>/`.
        // Folder names match the `@category` tag in source TSDoc verbatim.
        //
        // Adding a new `@category Foo` in source TSDoc requires a matching
        // entry below; otherwise the category's pages exist but are
        // unreachable from the sidebar. The `category-sidebar parity`
        // check (apps/docs/scripts/check-sidebar-categories.mjs) flags
        // mismatches at `pnpm build:docs` time.
        //
        // Order is by audience friendliness: highest-level concepts first
        // (Core, Plugins, Components, Hooks), runtime hooks next (Store,
        // Listeners, Forms, Integration), reference material last
        // (Types, Utilities, Constants, i18n, Icons).
        {
          label: 'API Reference',
          collapsed: true,
          items: [
            { label: 'Core', collapsed: true, autogenerate: { directory: 'api/Core' } },
            { label: 'Plugins', collapsed: true, autogenerate: { directory: 'api/Plugins' } },
            { label: 'Components', collapsed: true, autogenerate: { directory: 'api/Components' } },
            { label: 'Hooks', collapsed: true, autogenerate: { directory: 'api/Hooks' } },
            { label: 'Store', collapsed: true, autogenerate: { directory: 'api/Store' } },
            { label: 'Listeners', collapsed: true, autogenerate: { directory: 'api/Listeners' } },
            { label: 'Forms', collapsed: true, autogenerate: { directory: 'api/Forms' } },
            { label: 'Integration', collapsed: true, autogenerate: { directory: 'api/Integration' } },
            { label: 'Types', collapsed: true, autogenerate: { directory: 'api/Types' } },
            { label: 'Utilities', collapsed: true, autogenerate: { directory: 'api/Utilities' } },
            { label: 'Constants', collapsed: true, autogenerate: { directory: 'api/Constants' } },
            { label: 'i18n', collapsed: true, autogenerate: { directory: 'api/i18n' } },
            { label: 'Icons', collapsed: true, autogenerate: { directory: 'api/Icons' } },
          ],
        },
        { label: 'Videos', link: '/videos/' },
        { label: 'FAQ', link: '/faq/' },
      ],
    }),
    copyApiLanding(),
  ],
});
