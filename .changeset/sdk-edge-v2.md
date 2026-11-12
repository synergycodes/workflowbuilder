---
'@workflowbuilder/sdk': major
---

**Breaking.** Built-in edges follow the design-system Edge link: 1 px in every state, colour carries the state, selection and keyboard focus use the select colour. New `EdgePath` and the `'OptionalEdgePath'` slot: a `place: 'wrapper'` decorator reads its own run state and renders `<component {...props} runState lineType />`, so an app shows a run on any edge without touching edge data or CSS. `--wb-public-edge-hit-width` (12) sizes the invisible hit area. A custom edge template renders `OptionalEdgePath` to get the same states.
