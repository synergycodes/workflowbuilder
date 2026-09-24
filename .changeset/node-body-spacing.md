---
'@workflowbuilder/sdk': patch
---

Node sections and the rows inside them (Decision branches, AI tool rows) follow the design library: 8px padding and gap everywhere, 4px row radius and 8px section radius, where before the rows used 12/10px padding and a 6px radius. Padding, gap and radius bind to the `canvas/node/body-*` and `canvas/node/row-*` roles instead of raw spacing primitives. A row carries the content background (`canvas/node/bg-content-default`) and its label renders at Body/S Emphasized; the border a row used to draw is gone, and only the section and the AI tools wrapper outline, with `canvas/node/stroke-default`.
