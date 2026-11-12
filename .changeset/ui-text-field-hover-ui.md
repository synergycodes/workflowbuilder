---
'@workflowbuilder/ui': patch
---

Input, Text area, Select and Date Picker trigger borders get stronger on hover (`--wb-ds-components-text-field-stroke-hover`, overridable for Select via the new `--wb-public-select-button-border-color-hover`); focus, error, disabled and read-only states keep their own border. A `Select` or `DatePicker` with `state="critical"` now draws the full error appearance (border, background and text color), as with `error`.
