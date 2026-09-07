---
'@workflowbuilder/sdk': patch
---

Decision branch rows and AI tool rows derive their width cap from the node shell and their container insets, so long labels keep the full available width after the node shell spacing change instead of truncating early.
