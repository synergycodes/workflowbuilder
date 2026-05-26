---
'@workflowbuilder/sdk': patch
---

fix: port styling is now applied to every React Flow `<Handle>` rendered in
the editor, with a consistent visual size across positions. Previously:

- Handles rendered outside `NodePanel.Handles` (decision-node branches and
  AI-agent tool ports via `ConnectableItem`, custom node templates that drop
  `<Handle>` into their content area) fell through to React Flow's 5×5
  default with a 1px border.
- Handles anchored to a `NodePanel.Header` collapsed to ~5px visual because
  overflow-ui's `._handle-wrapper ._header .react-flow__handle.react-flow__handle-*`
  rule forces `box-sizing: border-box`, shrinking the visible circle to the
  declared width minus the border.

The SDK now ships a port rule in `@layer ui.component` matching every
React Flow `<Handle>` inside `.workflow-builder-root`, with the same size,
hover/connecting transitions, and expanded `::before` hit area overflow-ui
already gives to `_handle-wrapper`-scoped ports. `box-sizing` is set with
`!important` — overflow-ui ships its CSS unlayered (its JS entry
side-effect imports its own `index.css`), so the high-specificity
header-position selector can only be outrun via `!important` without
escalating the SDK rule's specificity above consumer overrides such as
ai-studio's `error-handle` CSS module. Border, width, and color all stay
overridable by unlayered consumer styles.

Note: handles outside `NodePanel.Handles` enlarge on direct port hover
only; NodePanel.Handles handles additionally enlarge when the surrounding
wrapper is hovered. Unifying that interaction requires a wrapper hook in
consumer node templates and is out of scope here.
