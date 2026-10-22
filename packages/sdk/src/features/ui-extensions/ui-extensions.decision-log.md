### Title: One model for the built-in interface: state, actions, builtInControls, …Content, …MenuItem

### Proposed by: Jan Librowski

### Date: 01.10.2026

## Context

The app bar, the palette and the properties panel each extended differently: the app bar took
component decorators on named slots (`OptionalAppBarTools`, `OptionalAppBarControls`), the kebab
menu took a function decorator (`getControlsDotsItems`), and the project menu and the properties
panel header took one-off host callbacks (`onDuplicateClick`, `onMenuHeaderClick`). None of the
three let a consumer read the state behind a built-in toggle (read-only, theme, language, either
sidebar's open state), none let a consumer call the same command a built-in button calls, and
none let a consumer hide a built-in button cleanly: hiding meant wiring a slot to render nothing,
or, for Templates and Settings, nothing at all, because they were hard-coded.

This log records the model that replaces that, and the implementation decisions a reader of this
code needs that are not obvious from the JSDoc alone.

## Decision

One model for the app bar, the palette and the properties panel, with four tools that work the
same way in all three:

- **Read state** with `useWorkflowBuilderState()`: `isReadOnly`, `theme`, `language`,
  `isPaletteOpen`, `isPropertiesPanelOpen`, `paletteFilter`, `layoutDirection`, `documentName`.
- **Run a command** with an action from `useWorkflowBuilderActions()`: the existing actions plus
  `openTemplates`, `deleteSelection`, `togglePalette`/`setPaletteOpen`,
  `togglePropertiesPanel`/`setPropertiesPanelOpen`, `setPaletteFilter`, `setLanguage`,
  `renameDocument`.
- **Hide a built-in control** with a key in `builtInControls` on `<WorkflowBuilder.Root>`. Every
  key defaults to `true`; `false` hides the control without touching what it does.
- **Add your own UI** with a component rendered under `<WorkflowBuilder.Root>`: six `…Content`
  components for the app bar, palette and properties-panel areas, and three `…MenuItem` components
  for the project menu, the app bar's kebab menu and the properties panel's menu.

Design decisions a reader of the code should know:

- **`builtInControls` is a React context, not a store field.** `<WorkflowBuilder.Root>` resets the
  global zustand store to its initial state on every fresh mount (`resetWorkflowStore()` in
  `workflow-builder-root.tsx`, preserving the documented "mount, save, unmount, mount next"
  sequential-workflows contract). A store field would be wiped by that reset on every mount
  regardless of the `builtInControls` prop's actual value, and keeping it in sync afterward would
  need an effect that re-writes it right after the reset runs. A React context has no reset step
  to race against: it simply reflects whatever value Root passed on this render.
  `useIsBuiltInControlVisible` (`built-in-controls-context.tsx`) reads it.

- **One UI-extension registry per mounted Root, read through `useSyncExternalStore`, not Root
  `useState` and not a module-level holder** (`ui-extension-registry.ts`,
  `ui-extension-context.tsx`). Root `useState` was rejected because every `…Content`/`…MenuItem`
  mount, unmount, or prop change would call `setState` on Root, re-rendering the whole mounted
  layout (the default layout or the app's own children) on every registration change instead of
  only the one host that reads that area or menu. A module-level holder was rejected because it
  would be shared between sequential Root mounts on the same page and would need an explicit reset
  between them; a plain registry object created once per `UiExtensionProvider` mount (via
  `useRef`) resets itself for free on every fresh Root, the same way the global store resets
  itself on mount. Reading it through `useSyncExternalStore` gives every `…Content` and
  `…MenuItem` component a consistent snapshot without re-rendering the whole subtree on every
  registration change: only the host that reads that one area or menu re-renders.

- **An empty area hides itself through CSS, not a content counter.** `AreaTarget` renders a real
  DOM node with `display: contents` by default and `display: none` on `:empty`
  (`area-target.module.css`); a producer's children portal straight into that node, so the node is
  non-empty exactly when there is something to show. The properties panel and palette footers add
  one more rule on top: `.footer-area:not(:has(> .footer > :not(:empty)))` hides the footer's
  separator together with it, which only works because every footer piece (the `AreaTarget` and
  the built-in Delete/Templates button alike) renders as a **direct child** of `.footer`
  (`sidebar.module.css`). A host that wrapped its `AreaTarget` in an extra `<div>` would break this
  rule silently, because `:has()` matches the DOM tree the selector is written against, not
  whatever `display: contents` makes it look like. This was chosen over a counter kept in the
  registry (`getAreaItemCount`-style): CSS already expresses "no visible content" correctly for
  free, and a counter would still have to special-case `display: contents` to agree with it.

- **Area targets stand before the deprecated decorator slots that wrap a built-in control.** The
  toolbar area, the controls area and the palette footer (the hosts behind `AppBarToolsContent`,
  `AppBarControlsContent` and `PaletteFooterContent`) all render `<AreaTarget />` first, then their
  deprecated slot (`OptionalAppBarTools`, `OptionalAppBarControls`, `OptionalFooterContent`); inside
  that slot, a `place: 'before'` decorator renders, then the slot's built-in control (Save; the
  language/read-only/theme toggles; or the Templates button, each the slot's `children`), then a
  `place: 'after'` decorator. A `place: 'wrapper'` decorator, or a `modifyProps` that drops
  `children`, can therefore still wrap or remove the built-in control, but never the own-content
  area standing ahead of the whole slot. The properties panel footer never had a decorator slot of
  its own: it only ever rendered `<AreaTarget />` next to the Delete button. The properties panel
  header's `<AreaTarget />` moved the other way: out of `PropertiesBarHeader` and into
  `properties-bar.tsx`'s header fragment, so the "show only while expanded" check that gates it sits
  next to the check that gates the rest of the header, instead of being duplicated between the two
  files.

- **`place` is an optional, backwards-compatible addition on top of this model, kept in its own
  commit so it can be dropped on its own if this branch does not ship for release.** Every
  `…Content` component already defaults to `place: 'before'`, so no existing call site changes
  behavior; `place: 'after'` only adds a second slot per area. In the three areas that still carry a
  deprecated decorator slot (`appBarTools`, `appBarControls`, `paletteFooter`), the after-target's
  `<AreaTarget />` renders as a sibling placed after that slot closes, not threaded through the
  slot's own before/wrapper/after machinery (`withOptionalComponentPlugins` in
  `adapter-components.tsx`). A `place: 'wrapper'` decorator registered on that slot wraps everything
  it renders, built-in control included; putting the after-target inside the slot instead of past it
  would let a `wrapper` decorator aimed at the built-in control wrap own content that has nothing to
  do with it. Standing after the whole slot (or, in the three areas with no slot, after the built-in
  controls directly) keeps the two mechanisms independent: a `wrapper` decorator still only ever
  touches the built-in control, and `place: 'after'` content renders exactly where it asked to.

- **The palette footer's deprecated slot sits in a `display: contents` element.** The Sidebar hides
  a footer whose direct children are all `:empty`; bare text or an `<input>` from the slot is not a
  non-empty element, so a footer with such content vanished. The wrapper is non-empty whenever the
  slot renders anything and adds no layout of its own.
- **`PropertiesPanelFooter` stays as a deprecated alias of `PropertiesPanelFooterContent`.** The old
  name shipped in SDK 3.0.0 while this work was in review; dropping it would turn the rename into a
  breaking removal in a minor.
- **The store field renames are a major changeset.** SDK 3.0.0 shipped on 02.10.2026, before this
  landed, so the pending major becomes 4.0.0 unless the old names return as aliases and the
  changeset drops to minor. That call stays with the release owner.
- **A save is refused until the initial load finished.** `handleIntegrationSave` returns `'error'`
  while the saving status is still `'disabled'`, and Root resets that status on every mount. Auto-save
  and the save on tab close now run in every layout, so without the guard a tab closed during a slow
  `api` load would send the reset, empty store to the save endpoint.
- **The load hook is `onLoad`, not `onStart`.** "Start" already names the start node of a workflow, the
  node a run begins at, so `onStart` read as a hook about that node. The hook fires when the initial load
  of the integration finished, and `onLoad` says so. `onStart` never shipped, so it has no alias.
- **`onLoad` hands over the full actions, not a single `openTemplates`.** What a host does after the
  load varies: open the palette when `paletteToggle` is hidden, show its own welcome screen, save
  right away. One action per need would grow the context with every request. The context carries
  the same object as `useWorkflowBuilderActions()`, so a host may also keep it, e.g. in a ref outside
  Root, which covers the need for a separate imperative handle. That is why every action reads the
  canvas, the integration and read-only mode when it is called, and why the actions of an
  unmounted Root do nothing: the store is shared across Root mounts, so a kept `save` would
  otherwise send the next Root's diagram through the old integration.
- **A failed `api` load refuses saves for the rest of the mount.** A failed load used to look like an
  empty diagram: the template selector opened, saving was on, and the first auto-save overwrote the
  workflow on the server that could not be loaded. Saving now resolves `'error'` without sending
  data (decided by Piotr Błaszczyk, 21.10.2026). The editor stays usable and no loader stays on
  screen, so the user does not lose the session; what to show is the host's call through
  `loadFailed`. A `200` with an empty body still counts as an empty diagram, so an endpoint that
  has nothing stored yet can still be saved to.
- **The read-only guard moved into `openTemplateSelectorModal`, not only into the `openTemplates`
  action.** `TemplateSelector` replaces the whole diagram through `setDiagramModel` without
  checking read-only mode itself. Before this change the palette's Templates button had a
  `disabled` prop, but the welcome template selector that an empty diagram opens on mount went
  through the same modal without that check. Guarding the modal opener instead of only the action
  closes that path for every caller, present and future, instead of trusting each one to remember.
  Two other paths to a read-only model change are left unguarded by design: `openImportModal` has
  no read-only guard (`ImportModal` replaces the whole diagram the same way `TemplateSelector`
  does), and the Settings modal lets a read-only viewer edit global variables, which are part of
  the persisted model. Closing them is a separate task (the design document's decision 24), not
  part of this release. An app that needs read-only to be airtight today hides both explicitly:
  `builtInControls={{ import: canEdit, settings: canEdit }}`.

- **`EditorRuntime` is a render boundary, not inlined into `RootShell`.** `useAutoSave` subscribes
  to the changes tracker, so it reruns on every diagram change; `useAutoSaveOnClose` just registers
  a `beforeunload` listener on mount. Both previously lived in `SaveButton`. Calling either hook
  directly in `RootShell` would re-run the whole default-layout-or-custom-children branch on every
  diagram change, because of `useAutoSave`'s subscription. A null-rendering leaf component
  (`features/editor-runtime/editor-runtime.tsx`) isolates that subscription so only the leaf
  re-renders. Moving auto-save here also makes it a property of `<WorkflowBuilder.Root>` itself
  rather than of `<WorkflowBuilder.TopBar />`, so a custom layout that omits the top bar now
  auto-saves too. Language-change detection (`useDetectLanguageChange`) was already called in
  `RootShell` before this change; it only moved into the same leaf for the same render-isolation
  reason, not because it newly became Root-level.

- **Placement warnings are not gated on a dev flag.** `usePlacementWarning` (now `useWarnOnce`) warns unconditionally
  instead of checking `import.meta.env.DEV`. The SDK ships as a pre-built bundle; the build tool
  that would strip a `DEV`-gated branch runs once, at SDK build time, against the SDK's own
  environment, not again in each consumer's app build, so gating here would silently hide the
  warning from every consumer rather than only from SDK-internal development.

- **Two kinds of slots are named apart on purpose, and that naming is the rule for which one to
  reach for.** A decorator slot (`OptionalAppBarTools`, `OptionalHooks`, …) mounts content that was
  created outside the component tree it renders into: a plugin registered once, with no React
  parent of its own. A `…Content` component (`AppBarToolsContent`, `PropertiesPanelFooterContent`,
  …) portals content that is created inside the producer's own tree, so it keeps that tree's state
  and context, such as a node's properties form or an app component with its own hooks. Reach for a
  `…Content`/`…MenuItem` component for anything that needs to read state or close over
  context; reach for a decorator only to intercept or modify a slot the SDK already renders
  (`DiagramContainer`, `PropertiesBar`, the diagram-level `Optional*` slots), which `…Content`
  components cannot do.

- **4.0 removed the old API.** The three slots the app bar and the palette footer carried
  (`OptionalAppBarTools`, `OptionalAppBarControls`, `OptionalFooterContent`), the
  `getControlsDotsItems` function decorator, `onDuplicateClick` on the project menu,
  `onMenuHeaderClick` on the properties panel and the `PropertiesPanelFooter` alias are gone; the
  model above is the only way. Each use logs a `console.warn` naming its replacement, in production
  too (`plugins-core/adapters/removed-api.ts`): a decorator on a removed slot or function registers
  nothing, and a removed prop that still reaches its component (through `modifyProps`) is ignored.
  The `'ProjectSelection'` slot went with them, and `ProjectSelection` and `ProjectSelectionProps`
  left the barrel (Piotr Błaszczyk, 21.10.2026): the props type had one field, `onDuplicateClick`,
  so without it `modifyProps` had nothing to change, and keeping the slot only for
  `wrapper`/`before`/`after` would have left one old mechanism in the top bar. The cost: the
  document title as a whole cannot be hidden in 4.0. Neither demo nor AI Studio decorated this
  slot. The bullets above that place own content relative to a deprecated slot describe 3.x.

## Alternatives

- **Keep extending each area its own way** (slots for the app bar, a function decorator for the
  kebab menu, host callbacks for the project menu and the panel header) was rejected: a consumer
  had to learn which of three mechanisms applied to which pixel on screen, and none of the three
  exposed state, so "is read-only mode on" had no supported answer outside `useStore` field names
  that were never a documented contract.
- **Exporting the built-in controls as prop-less components** (a `tldraw`-style component map) was
  deferred rather than rejected: it grows the public contract before it has been exercised by real
  consumers, and the hide-and-rebuild pattern already covers the same need.
- **A module-level holder for `builtInControls` and for the UI-extension registry**, matching the
  existing pattern for `logo` and `reactFlowProps`, was rejected for both, for different reasons.
  `builtInControls` as a module holder: Root already rewrites `logo` and `reactFlowProps` into
  their module holders on every render (not only on mount), so a `builtInControls` holder would
  track the prop's latest value just as well; the real problem is that a plain assignment notifies
  no reader, as Root's own comment about those two holders says (`workflow-builder-root.tsx:123-125`,
  "they don't notify subscribers and don't trigger re-renders"). A control already mounted and
  reading that holder would not learn the value changed until something else happened to re-render
  it; a React context does not have this gap, because changing its value re-renders every consumer
  directly. The registry as a module holder: it would be shared between sequential Root mounts on
  the same page without a reset step, unlike a context value a fresh `UiExtensionProvider` creates
  from scratch for each Root.
- **A content counter instead of CSS `:empty`/`:has()`** for hiding empty areas was rejected as
  more code to keep in sync with what the DOM already shows for free.

## Follow-ups

A few findings from building this model are tracked as separate, smaller pieces of work rather
than folded into this release:

- The palette has no designed empty state for "every node was filtered out by `paletteFilter`"; it
  currently just shows an empty list (follow-up: palette-empty-state).
- The built-in controls themselves are not individually exported as components, which would let a
  consumer compose a custom row from built-ins and their own content instead of only hiding and
  rebuilding from scratch (follow-up: built-in-control-components).
- A plugin is a side-effecting `() => void` function with no JSX of its own; letting a plugin be
  authored as a component instead (mounted once, the way `OptionalAppChildren` content is today)
  would let it use `…Content`/`…MenuItem` directly instead of mounting one indirection component
  through `OptionalAppChildren` (follow-up: plugin-as-component).
- `openImportModal` and the Settings modal do not check read-only mode, unlike every other path
  that changes the persisted model; closing that gap is the design document's decision 24, tracked
  as its own task (follow-up: read-only-import-settings).
- Auto-save has no switch: with `EditorRuntime` owning it, a view that must never save (a run view,
  a preview) can only pass an `onDataSave` that rejects. A prop on Root, or an `autoSave: false` on
  the integration, would make that explicit (follow-up: auto-save-opt-out).
