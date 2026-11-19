---
'@workflowbuilder/sdk': major
---

The `MessageOnError` entry of `globalControls` now listens on `#/properties/customError` instead of `#/properties/missingPreviousVariable` and carries no default `text`, so the message shown in the properties panel is the one in the custom error itself.

Breaking changes:

- Custom errors placed in `properties.customErrors` with `instancePath: '/missingPreviousVariable'` still mark the node, but their message no longer shows in the properties panel. Set `instancePath: '/customError'` on them instead.
