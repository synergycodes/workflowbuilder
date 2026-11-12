# Welcome and Select a template

AI Studio's template picker: one modal (`welcome-modal.tsx`, built on the `@workflowbuilder/ui` `Modal`, size large)
in two forms. **Welcome** greets the first open of AI Studio; **Select a template** is the way back to the templates
afterwards. These are the rules the code follows.

## When it opens

| Form              | Opens                                                                                                                                                                         | Does not open                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Welcome           | Once: on the first open of the local editor (no id in the URL), over Customer Support Triage. Seen once it closes in any way (`ai-studio:welcome-seen-v1` in `localStorage`). | On later opens, also over an empty canvas; in a run or workflow link. |
| Select a template | From the Templates button at the bottom of the left panel, at any time.                                                                                                       | Anywhere else.                                                        |

- The Templates button is the only way back to the templates. The button in the canvas corner is a help menu, not a
  way into the picker.
- The button is AI Studio's own (`PaletteFooterContent` in `template-picker.tsx`). The SDK's Templates button is
  hidden (`builtInControls.templates: false`), and the SDK's default `onLoad`, which opens its own selector over an
  empty canvas, is replaced per opened source in `app/root-props.ts` (`open-on-load.ts`).
- In a read-only run view the Templates button is disabled.
- Run and workflow links open without the picker and keep the old notice card (`components/disclaimer/`).

## The two forms

| Element                           | Welcome                                                                               | Select a template                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header                            | Info icon, "Welcome to AI Studio"                                                     | Cube icon, "Select a template"                                                                                                                                |
| Lead                              | "A live demo of Workflow Builder…"                                                    | none                                                                                                                                                          |
| Note                              | Info: run limits, OpenRouter, and that anyone with a run's link can see and act on it | Warning: the current workflow will be replaced, which cannot be undone. **Only when the canvas holds blocks**: over an empty canvas there is nothing to lose. |
| Subheading                        | "How do you want to start?"                                                           | "Available templates"                                                                                                                                         |
| Recommended                       | the first tile, Refund Review                                                         | none                                                                                                                                                          |
| Described by (`aria-describedby`) | the lead                                                                              | the warning, when it shows                                                                                                                                    |

## Tiles

- A click loads the template at once (`setDiagramModel` and fit view, as the SDK's own selector does) and closes the
  modal. Empty canvas clears the canvas. No confirmation step, no selected state: the warning is the only safeguard.
- Order, the same in both forms: Refund Review, Customer Support Triage, AI Debate, Content Repurposer, Meeting Notes
  to Action Items, Market Research Brief, Empty canvas (always last). Descriptions, icons and categories live in
  `welcome-templates.ts`.
- Icon tile colour by category, Light / Dark: action acc1, logic acc3, human acc4, trigger acc5; background
  `-500-10` / `-500-20`, glyph `-700` / `-400`.
- States: Default (`wb/ui/stroke/subtle`); Hover, pointer devices only, and Pressed (`wb/ui/stroke/highlight` and a
  3 px `wb/ui/brand/fill-subtle` ring); Focus from the keyboard (highlight stroke and a 3 px
  `wb/canvas/node/focus-ring-active` ring); Recommended (highlight stroke and ring at rest, "Recommended" label);
  Empty (dashed stroke, Plus in an outline tile).

## Closing

The backdrop, X and Esc close the modal without changes: nothing is loaded and the canvas stays as it was.

## Layout

- Width `min(796px, 100vw − 40px)`, height up to 80 % of the viewport; the header stays and the content scrolls
  under it.
- Three columns from 760 px, two from 480 px, one below.
- Pointer devices: tile title on one line and description on two, cut with an ellipsis. Touch: both wrap in full and
  every tile in a row takes the height of the tallest.

## Accessibility

- `role="dialog"`, `aria-modal`, labelled by the title. Focus moves to the dialog itself on open (the `Modal`'s
  `initialFocus`), so no focus ring shows until the keyboard is used; Tab then reaches X, then the tiles.
- The tile grid is a group labelled by the subheading. Tiles are buttons named by their title (and "Recommended"),
  described by their description, so the full text stays available when the ellipsis cuts it.
- The notes are static text, never `role="alert"`.

## Provisional in code

- The Recommended label and the warning background use local stand-ins for tokens the export does not carry yet
  (`wb/components/badge/*`, `wb/ui/bg/warning-subtle`); each is marked in its stylesheet.
- `wb/canvas/node/head-icon` is 10 px in code and 9 px in the design, so a tile is 139 px high instead of 138.
