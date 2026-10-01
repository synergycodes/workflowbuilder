---
'@workflowbuilder/sdk': minor
---

New `showSnackbar` and `closeSnackbar` put an app's own snackbars in the editor's snackbar stack, next to the SDK's. Each call shows its own snackbar unless it passes a `key`, `autoHideDuration: null` keeps it until it is closed, and both do nothing before an editor mounts. Two different SDK snackbars of the same variant now show together instead of the second being dropped.
