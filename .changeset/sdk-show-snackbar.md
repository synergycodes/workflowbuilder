---
'@workflowbuilder/sdk': minor
---

New `showSnackbar` and `closeSnackbar` put an app's own snackbars in the editor's snackbar stack, next to the SDK's, with an optional key and no auto-hide when `autoHideDuration` is `null`. Two different SDK snackbars of the same variant now show together instead of the second being dropped.
