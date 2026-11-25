---
'@workflowbuilder/ui': major
---

**Breaking.** `Snackbar` and `Status` take `tone` with the design system's values: on `Snackbar` replace `variant` with `tone` and `'error'` with `'critical'` (`SnackbarType` and `SnackbarVariant` are gone; use the `SnackbarTone` union or `SNACKBAR_TONES`), and on `Status` replace `status="invalid"` with `tone="critical"` (`ValidationStatus` is now `StatusTone`). The CSS variables keep their names: `--wb-public-snackbar-error-*` styles `tone="critical"` and `--wb-public-status-invalid-*` styles `Status`.
