---
'@workflowbuilder/sdk': patch
'@workflowbuilder/ui': patch
---

Token export of 21.09 (library 1.1.14). `ui/bg/canvas` and `ui/bg/app` are gray-300 in the light theme, so the canvas no longer shares the white of the panels, and the grid dots step down to gray-450. In the dark theme `ui/bg/app` moves from gray-900 to gray-800; no surface is `#070708` any more. The export adds `ui/bg/inset-subtle` (gray-200 / gray-650), a step between `bg/base` and `bg/inset` that nothing binds yet. Nothing is renamed or removed.
