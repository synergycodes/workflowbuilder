---
'@workflowbuilder/sdk': patch
---

Fix the language selector displaying "EN" while the UI rendered Polish for regional locales (e.g. `pl-PL`). The selector now resolves the current option from the base/resolved language instead of the raw `i18n.language`, so its label reflects the language the strings actually render in.
